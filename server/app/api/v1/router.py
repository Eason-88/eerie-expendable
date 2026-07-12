from fastapi import APIRouter

from app.api.v1 import auth, config, progress, saves

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(saves.router, prefix="/saves", tags=["saves"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
