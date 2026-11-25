import subprocess
import time
import re
import sys
from pathlib import Path
from pyngrok import ngrok

def start_server_and_tunnel():
    print("=" * 60)
    print("🌾 Starting AgriVoice WhatsApp Server & Ngrok Tunnel...")
    print("=" * 60)

    # Step 1: Start FastAPI backend with Uvicorn (log to file)
    print("1. Launching FastAPI backend on http://127.0.0.1:8000 ...")
    api_log_path = Path(__file__).resolve().parent / "data" / "api_server.log"
    api_log_file = open(api_log_path, "w", encoding="utf-8")
    api_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app_api:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=api_log_file,
        stderr=subprocess.STDOUT
    )
    time.sleep(2)

    # Step 2: Start stable public HTTPS tunnel with ngrok
    print("2. Creating secure public HTTPS tunnel with ngrok...")
    tunnel = ngrok.connect(8000)
    public_url = tunnel.public_url

    if public_url:
        # Ensure https
        if public_url.startswith("http://"):
            public_url = public_url.replace("http://", "https://")

        # Save public URL in .env
        env_path = Path(__file__).resolve().parent / ".env"
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                env_text = f.read()
            if "PUBLIC_BASE_URL=" in env_text:
                env_text = re.sub(r'PUBLIC_BASE_URL=.*', f'PUBLIC_BASE_URL={public_url}', env_text)
            else:
                env_text += f"\nPUBLIC_BASE_URL={public_url}\n"
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(env_text)

        print("\n" + "=" * 60)
        print("🎉 SUCCESS! YOUR WHATSAPP WEBHOOK IS READY & ONLINE!")
        print("=" * 60)
        print(f"👉 Callback URL : {public_url}/webhook")
        print(f"👉 Verify Token : agri_assistant_secret_token_123")
        print("=" * 60)
        print("\nPaste these into your Meta for Developers WhatsApp Configuration page.")
        print("Press Ctrl+C to stop the server when finished.\n")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down server and tunnel...")
            ngrok.disconnect(public_url)
            api_process.terminate()
    else:
        print("Could not retrieve tunnel URL. Exiting...")
        api_process.terminate()

if __name__ == "__main__":
    start_server_and_tunnel()
