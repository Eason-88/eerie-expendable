from fastapi import APIRouter

from app.core.config import settings
from app.schemas import ClientConfigResponse

router = APIRouter()


@router.get("/client", response_model=ClientConfigResponse)
def get_client_config() -> ClientConfigResponse:
    return ClientConfigResponse(
        schemaVersion=1,
        radioCanTransmit=False,
        fogDensity=0.035,
        difficulty="normal",
        voEnabled=True,
        cdnBaseUrl=settings.cdn_base_url.rstrip("/"),
        features={
            "cloudSave": True,
            "ranking": False,
            "wechatLogin": True,
            "devLogin": True,
        },
    )
