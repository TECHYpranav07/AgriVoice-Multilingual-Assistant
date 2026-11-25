import os
import json
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, Request, Response, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from config.settings import settings
from src.channel.whatsapp_client import WhatsAppClient
from src.pipeline import AgriculturalAssistantPipeline
from src.tools.mandi_tool import MandiPriceTool
from src.tools.weather_tool import WeatherTool

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Multilingual Voice-First Agricultural Assistant Backend"
)

# Enable CORS for Lovable Web UI and local browsers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount audio storage directory for public/local playback
settings.AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/audio", StaticFiles(directory=str(settings.AUDIO_DIR)), name="audio")

# Initialize Pipeline and WhatsApp client
pipeline = AgriculturalAssistantPipeline()
wa_client = WhatsAppClient()

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "vector_chunks": len(pipeline.vector_store.chunks)}

# --- WhatsApp Cloud API Webhooks ---
@app.get("/webhook")
async def verify_whatsapp_webhook(request: Request):
    """Meta WhatsApp Webhook verification handshake."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    verified_challenge = wa_client.verify_webhook(mode, token, challenge)
    if verified_challenge:
        return Response(content=str(verified_challenge), media_type="text/plain")
    return Response(content="Forbidden", status_code=403)

@app.post("/webhook")
async def receive_whatsapp_message(request: Request, background_tasks: BackgroundTasks):
    """Receives inbound messages (voice notes / text) from WhatsApp."""
    payload = await request.json()
    print(f"Incoming WhatsApp webhook: {payload}", flush=True)
    msg_info = wa_client.extract_message_info(payload)
    print(f"Extracted msg_info: {msg_info}", flush=True)

    m_type = msg_info.get("msg_type") or msg_info.get("type")
    if m_type in ["audio", "voice"]:
        background_tasks.add_task(handle_whatsapp_voice_message, msg_info)
    elif m_type == "text":
        background_tasks.add_task(handle_whatsapp_text_message, msg_info)

    return {"status": "received"}

def handle_whatsapp_voice_message(msg_info: dict):
    """Processes inbound voice note and replies over WhatsApp."""
    sender = msg_info["sender_id"]
    media_id = msg_info.get("media_id")
    try:
        print(f"Processing voice message from {sender}, media_id={media_id}", flush=True)
        wav_path = wa_client.download_media(media_id)
        print(f"Downloaded and converted audio to: {wav_path}", flush=True)
        result = pipeline.process_query(audio_file_path=wav_path, generate_audio=True)
        print(f"Transcribed: '{result.get('query')}' -> Reply: '{result.get('answer_text')}'", flush=True)
        
        # Send text summary
        t_res = wa_client.send_text_message(sender, result["answer_text"])
        print(f"WhatsApp text send response: {t_res}", flush=True)
        
        # Send voice reply directly via Meta Media Upload
        if result.get("audio_reply_path"):
            v_res = wa_client.send_voice_message(sender, result["audio_reply_path"])
            print(f"WhatsApp voice send response: {v_res}", flush=True)
    except Exception as e:
        print(f"Error handling WhatsApp voice message: {e}", flush=True)

def handle_whatsapp_text_message(msg_info: dict):
    """Processes inbound text message and replies over WhatsApp with both text and voice note."""
    sender = msg_info["sender_id"]
    text = msg_info.get("text", "")
    try:
        print(f"Processing text message from {sender}: '{text}'", flush=True)
        result = pipeline.process_query(text_query=text, generate_audio=True)
        print(f"Generated reply: '{result['answer_text']}'", flush=True)
        
        # 1. Send text reply
        res = wa_client.send_text_message(sender, result["answer_text"])
        print(f"WhatsApp text send response: {res}", flush=True)

        # 2. Send spoken voice note reply directly via Meta upload
        if result.get("audio_reply_path"):
            v_res = wa_client.send_voice_message(sender, result["audio_reply_path"])
            print(f"WhatsApp voice send response: {v_res}", flush=True)
    except Exception as e:
        print(f"Error handling WhatsApp text message: {e}", flush=True)

# --- REST API Endpoints for Web and Mobile Apps ---
def _attach_audio_url(res: dict) -> dict:
    """Adds a relative HTTP audio URL for browser playback."""
    audio_path = res.get("audio_reply_path")
    if audio_path and os.path.exists(audio_path):
        res["audio_url"] = f"/audio/{Path(audio_path).name}"
    else:
        res["audio_url"] = None
    return res

@app.post("/api/query/text")
async def query_text(request: Request, query: Optional[str] = None, language: str = "hi"):
    """Text-based query endpoint accepting either query params or JSON body."""
    if not query:
        try:
            body = await request.json()
            query = body.get("query", "")
            language = body.get("language", language)
        except Exception:
            query = ""

    if not query or not query.strip():
        return JSONResponse({"success": False, "error": "Query cannot be empty"}, status_code=400)

    res = pipeline.process_query(text_query=query, language_hint=language, generate_audio=True)
    return _attach_audio_url(res)

@app.post("/api/query/voice")
async def query_voice(file: UploadFile = File(...), language: str = Form("hi")):
    """Voice note upload and query endpoint."""
    safe_name = os.path.basename(file.filename or "voice.webm")
    temp_in = settings.AUDIO_DIR / f"upload_{safe_name}"
    with open(temp_in, "wb") as f:
        f.write(await file.read())

    res = pipeline.process_query(audio_file_path=str(temp_in), language_hint=language, generate_audio=True)
    return _attach_audio_url(res)

@app.get("/api/mandi")
def get_mandi(commodity: str = "cotton", location: str = "nagpur"):
    """Live/benchmark APMC mandi prices for a commodity or all commodities."""
    selected = MandiPriceTool.get_price(commodity=commodity, location=location)
    all_commodities = [
        MandiPriceTool.get_price(commodity=c, location=location)
        for c in ["cotton", "soybean", "wheat", "onion", "gram"]
    ]
    return {"selected": selected, "all_commodities": all_commodities}

@app.get("/api/weather")
def get_weather(location: str = "nagpur"):
    """Live Open-Meteo agromet weather & chemical spray advisory."""
    return WeatherTool.get_weather(location_name=location)

@app.get("/api/knowledge")
def get_knowledge():
    """Returns verified ICAR documents and trilingual glossary."""
    docs = []
    if settings.DOCS_DIR.exists():
        for doc_file in sorted(settings.DOCS_DIR.glob("*.md")):
            docs.append({
                "id": doc_file.stem,
                "filename": doc_file.name,
                "content": doc_file.read_text(encoding="utf-8")
            })
    glossary = {}
    if settings.GLOSSARY_PATH.exists():
        glossary = json.loads(settings.GLOSSARY_PATH.read_text(encoding="utf-8"))
    return {"documents": docs, "glossary": glossary}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app_api:app", host="0.0.0.0", port=8000, reload=True)
