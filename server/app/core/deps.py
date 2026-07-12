from collections.abc import Generator
from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_db() -> Generator[None, None, None]:
    """Database session placeholder for phase 0."""
    yield None
