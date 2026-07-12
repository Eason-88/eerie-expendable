from fastapi import APIRouter

router = APIRouter()


@router.get("/current")
def get_current_save() -> dict[str, str]:
    return {"detail": "not_implemented", "hint": "Cloud saves arrive in phase 3"}


@router.put("/current")
def put_current_save() -> dict[str, str]:
    return {"detail": "not_implemented", "hint": "Cloud saves arrive in phase 3"}
