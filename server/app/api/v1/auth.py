from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.deps import DbDep
from app.schemas import DevLoginRequest, TokenResponse, WechatLoginRequest
from app.services.auth import issue_token, upsert_user

router = APIRouter()


@router.post("/dev-login", response_model=TokenResponse)
def dev_login(body: DevLoginRequest, db: DbDep) -> TokenResponse:
    """Browser / editor login — no WeChat required."""
    external_id = f"dev:{body.device_id.strip()}"
    user = upsert_user(
        db,
        external_id=external_id,
        display_name=body.display_name.strip() or "黑鹰7号",
        platform="dev",
    )
    return issue_token(user)


@router.post("/wechat", response_model=TokenResponse)
def wechat_login(body: WechatLoginRequest, db: DbDep) -> TokenResponse:
    """
    WeChat mini-game login.
    Production: exchange `code` via jscode2session.
    Development without credentials: treat code as mock openid.
    """
    code = body.code.strip()
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty_code")

    if settings.wechat_app_id and settings.wechat_app_secret:
        # Placeholder for real WeChat API wiring (phase 3 scaffold).
        # Keeping mock path until credentials are configured.
        openid = f"wx_pending:{code}"
    else:
        openid = f"wx_mock:{code}"

    user = upsert_user(
        db,
        external_id=openid,
        display_name=body.display_name.strip() or "黑鹰7号",
        platform="wechat",
    )
    return issue_token(user)
