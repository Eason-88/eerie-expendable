from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    display_name: str
    platform: str


class DevLoginRequest(BaseModel):
    device_id: str = Field(min_length=3, max_length=128)
    display_name: str = Field(default="黑鹰7号", max_length=64)


class WechatLoginRequest(BaseModel):
    code: str = Field(min_length=1, max_length=128)
    display_name: str = Field(default="黑鹰7号", max_length=64)


class SavePayload(BaseModel):
    schema_version: int = 1
    version: int = 1
    level_id: str = "level_01"
    checkpoint: str = "intro"
    client_updated_at: datetime | None = None
    data: dict[str, Any] = Field(default_factory=dict)


class SaveResponse(BaseModel):
    schema_version: int
    version: int
    level_id: str
    checkpoint: str
    client_updated_at: datetime
    server_updated_at: datetime
    data: dict[str, Any]
    conflict: bool = False
    message: str | None = None


class ProgressResponse(BaseModel):
    levels: list[dict[str, Any]]
    current_level: str
    checkpoint: str


class ClientConfigResponse(BaseModel):
    schemaVersion: int = 1
    radioCanTransmit: bool = False
    fogDensity: float = 0.035
    difficulty: str = "normal"
    voEnabled: bool = True
    cdnBaseUrl: str
    features: dict[str, bool]
