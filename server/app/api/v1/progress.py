from fastapi import APIRouter

router = APIRouter()


@router.get("")
def get_progress() -> dict[str, object]:
    return {
        "detail": "not_implemented",
        "hint": "Progress sync arrives in phase 3",
        "levels": [],
    }
