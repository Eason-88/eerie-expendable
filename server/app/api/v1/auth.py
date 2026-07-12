from fastapi import APIRouter

router = APIRouter()


@router.post("/wechat")
def wechat_login() -> dict[str, str]:
    return {"detail": "not_implemented", "hint": "WeChat login arrives in phase 3"}
