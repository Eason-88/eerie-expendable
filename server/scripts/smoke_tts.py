import asyncio
from pathlib import Path

import edge_tts

async def main() -> None:
    out = Path("data/tts_cache")
    out.mkdir(parents=True, exist_ok=True)
    path = out / "_smoke.mp3"
    communicate = edge_tts.Communicate(
        "黑鹰七号，请立即报告状况。",
        "zh-CN-YunjianNeural",
        rate="+8%",
        pitch="-2Hz",
    )
    await communicate.save(str(path))
    print("ok", path.stat().st_size)

asyncio.run(main())
