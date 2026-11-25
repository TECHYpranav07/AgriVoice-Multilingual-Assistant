import os
import requests
from pathlib import Path
from config.settings import settings
from .audio_converter import AudioConverter

class WhatsAppClient:
    """
    Handles Meta WhatsApp Cloud API webhooks, media downloads, 
    and sending voice/text responses.
    """

    def __init__(self, token: str = None, phone_number_id: str = None):
        self.token = token or settings.WHATSAPP_TOKEN
        self.phone_number_id = phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID
        self.api_url = f"https://graph.facebook.com/v21.0/{self.phone_number_id}"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def verify_webhook(self, mode: str, token: str, challenge: str):
        """Validates Meta WhatsApp Webhook subscription."""
        if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
            return int(challenge)
        return None

    def extract_message_info(self, payload: dict) -> dict:
        """
        Extracts sender, message type (audio/text), media_id, and message_id
        from WhatsApp webhook JSON payload.
        """
        try:
            entry = payload["entry"][0]
            change = entry["changes"][0]["value"]
            
            if "messages" not in change or not change["messages"]:
                return {"type": "event", "data": "status_update_or_read_receipt"}

            msg = change["messages"][0]
            contact = change.get("contacts", [{}])[0]
            sender_name = contact.get("profile", {}).get("name", "Farmer")
            sender_id = msg.get("from")
            msg_type = msg.get("type")
            msg_id = msg.get("id")

            result = {
                "sender_id": sender_id,
                "sender_name": sender_name,
                "msg_id": msg_id,
                "msg_type": msg_type
            }

            if msg_type in ["audio", "voice"]:
                result["media_id"] = msg[msg_type].get("id")
                result["mime_type"] = msg[msg_type].get("mime_type")
            elif msg_type == "text":
                result["text"] = msg.get("text", {}).get("body", "")
            
            return result
        except (KeyError, IndexError) as e:
            return {"type": "invalid_payload", "error": str(e)}

    def download_media(self, media_id: str, output_path: str = None) -> str:
        """
        Downloads voice note from WhatsApp Graph API and converts to 16kHz WAV.
        """
        if not self.token:
            raise ValueError("WHATSAPP_TOKEN is not configured in .env.")

        # Step 1: Get media URL
        media_info_url = f"https://graph.facebook.com/v21.0/{media_id}"
        resp = requests.get(media_info_url, headers={"Authorization": f"Bearer {self.token}"})
        resp.raise_for_status()
        download_url = resp.json().get("url")

        # Step 2: Download raw binary
        media_resp = requests.get(download_url, headers={"Authorization": f"Bearer {self.token}", "User-Agent": "curl/7.68.0"})
        media_resp.raise_for_status()

        temp_ogg = settings.AUDIO_DIR / f"{media_id}.ogg"
        with open(temp_ogg, "wb") as f:
            f.write(media_resp.content)

        # Step 3: Convert to 16kHz mono WAV for ASR
        wav_path = AudioConverter.to_16khz_wav(str(temp_ogg), output_path)
        return wav_path

    def send_text_message(self, recipient_id: str, text: str) -> dict:
        """Sends a text message back to the farmer."""
        if not self.token or not self.phone_number_id:
            # Simulated sending if credentials are not configured
            return {"status": "simulated", "recipient": recipient_id, "text": text}

        url = f"{self.api_url}/messages"
        data = {
            "messaging_product": "whatsapp",
            "to": recipient_id,
            "type": "text",
            "text": {"body": text}
        }
        resp = requests.post(url, headers=self.headers, json=data)
        return resp.json()

    def upload_media(self, file_path: str, mime_type: str = "audio/mpeg") -> str:
        """Uploads audio file directly to Meta WhatsApp Media API."""
        url = f"{self.api_url}/media"
        headers = {"Authorization": f"Bearer {self.token}"}
        with open(file_path, "rb") as f:
            files = {
                "file": (os.path.basename(file_path), f, mime_type),
                "messaging_product": (None, "whatsapp")
            }
            resp = requests.post(url, headers=headers, files=files)
            resp.raise_for_status()
            return resp.json().get("id")

    def send_voice_message(self, recipient_id: str, audio_path_or_url: str) -> dict:
        """Sends an audio voice note directly by uploading file to Meta or by URL."""
        if not self.token or not self.phone_number_id:
            return {"status": "simulated", "recipient": recipient_id, "audio": audio_path_or_url}

        # If local file, upload directly to Meta so it never depends on tunnel hosting
        if os.path.exists(audio_path_or_url):
            try:
                media_id = self.upload_media(audio_path_or_url, "audio/mpeg")
                url = f"{self.api_url}/messages"
                data = {
                    "messaging_product": "whatsapp",
                    "to": recipient_id,
                    "type": "audio",
                    "audio": {"id": media_id}
                }
                resp = requests.post(url, headers=self.headers, json=data)
                return resp.json()
            except Exception as e:
                print(f"Direct media upload error: {e}", flush=True)

        url = f"{self.api_url}/messages"
        data = {
            "messaging_product": "whatsapp",
            "to": recipient_id,
            "type": "audio",
            "audio": {"link": audio_path_or_url}
        }
        resp = requests.post(url, headers=self.headers, json=data)
        return resp.json()
