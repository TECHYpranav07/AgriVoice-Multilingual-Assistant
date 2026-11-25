import os
import subprocess
import tempfile
from pathlib import Path
from config.settings import settings

class AudioConverter:
    """Handles audio format conversions using ffmpeg."""

    @staticmethod
    def ensure_dir(path: Path):
        path.mkdir(parents=True, exist_ok=True)

    @classmethod
    def to_16khz_wav(cls, input_audio_path: str, output_wav_path: str = None) -> str:
        """
        Converts any audio file (e.g. WhatsApp OGG/Opus, MP3, AAC, M4A)
        to 16 kHz, single-channel (mono) WAV for ASR engines.
        """
        if not output_wav_path:
            cls.ensure_dir(settings.AUDIO_DIR)
            fd, output_wav_path = tempfile.mkstemp(suffix=".wav", dir=settings.AUDIO_DIR)
            os.close(fd)

        cmd = [
            "ffmpeg", "-y",
            "-i", str(input_audio_path),
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            str(output_wav_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg audio conversion failed: {res.stderr}")

        return output_wav_path

    @classmethod
    def to_opus_ogg(cls, input_wav_path: str, output_ogg_path: str = None) -> str:
        """
        Compresses WAV/MP3 to low-bandwidth OGG Opus (ideal for WhatsApp voice notes).
        """
        if not output_ogg_path:
            cls.ensure_dir(settings.AUDIO_DIR)
            fd, output_ogg_path = tempfile.mkstemp(suffix=".ogg", dir=settings.AUDIO_DIR)
            os.close(fd)

        cmd = [
            "ffmpeg", "-y",
            "-i", str(input_wav_path),
            "-c:a", "libopus",
            "-b:a", "32k",
            "-vbr", "on",
            str(output_ogg_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            # Fallback to standard libvorbis or mp3 if libopus is not available
            cmd_fallback = [
                "ffmpeg", "-y",
                "-i", str(input_wav_path),
                "-c:a", "libmp3lame",
                "-b:a", "48k",
                str(output_ogg_path).replace(".ogg", ".mp3")
            ]
            res_fb = subprocess.run(cmd_fallback, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res_fb.returncode == 0:
                return str(output_ogg_path).replace(".ogg", ".mp3")
            raise RuntimeError(f"FFmpeg compression failed: {res.stderr}")

        return output_ogg_path
