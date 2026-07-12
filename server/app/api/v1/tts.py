"""Neural TTS via Microsoft Edge voices (edge-tts)."""

from __future__ import annotations

import hashlib
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

router = APIRouter()

CACHE_DIR = Path("data/tts_cache")
DEFAULT_VOICE = "zh-CN-YunjianNeural"  # male tactical
HQ_VOICE = "zh-CN-YunxiNeural"
ANNOUNCER_VOICE = "zh-CN-XiaoyiNeural"


def _voice_for(speaker: str | None) -> str:
    if not speaker:
        return ANNOUNCER_VOICE
    if "总部" in speaker or "播报" in speaker:
        return HQ_VOICE
    if "小队" in speaker or "支援" in speaker:
        return DEFAULT_VOICE
    return DEFAULT_VOICE


def _cache_path(voice: str, text: str) -> Path:
    key = hashlib.sha1(f"{voice}|{text}".encode()).hexdigest()
    return CACHE_DIR / f"{key}.mp3"


@router.get("/speak")
async def speak(
    text: str = Query(..., min_length=1, max_length=280),
    speaker: str | None = Query(None, max_length=40),
    voice: str | None = Query(None, max_length=64),
) -> Response:
    """Return MP3 of neural Chinese TTS. Cached on disk."""
    try:
        import edge_tts
    except ImportError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="edge-tts not installed") from exc

    spoken = text if not speaker else f"{speaker}。{text}"
    chosen = voice or _voice_for(speaker)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = _cache_path(chosen, spoken)
    if not path.exists():
        try:
            communicate = edge_tts.Communicate(spoken, chosen, rate="+8%", pitch="-2Hz")
            await communicate.save(str(path))
        except Exception as exc:  # network / service
            raise HTTPException(status_code=502, detail=f"tts failed: {exc}") from exc

    data = path.read_bytes()
    if len(data) < 32:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=502, detail="tts empty")
    return Response(
        content=data,
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )
