from fastapi import APIRouter

from app.core.deps import CurrentUser, DbDep
from app.schemas import ProgressResponse
from app.services.saves import ensure_save

router = APIRouter()


@router.get("", response_model=ProgressResponse)
def get_progress(db: DbDep, user: CurrentUser) -> ProgressResponse:
    slot = ensure_save(db, user)
    levels = [
        {
            "id": "level_01",
            "title": "诡异弃子·第一关",
            "unlocked": True,
            "cleared": slot.checkpoint in {"win", "cleared"},
            "checkpoint": slot.checkpoint if slot.level_id == "level_01" else "intro",
        }
    ]
    return ProgressResponse(
        levels=levels,
        current_level=slot.level_id,
        checkpoint=slot.checkpoint,
    )
