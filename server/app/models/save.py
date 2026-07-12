from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class SaveSlot(Base):
    __tablename__ = "save_slots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    schema_version: Mapped[int] = mapped_column(Integer, default=1)
    version: Mapped[int] = mapped_column(Integer, default=1)
    checkpoint: Mapped[str] = mapped_column(String(64), default="intro")
    level_id: Mapped[str] = mapped_column(String(64), default="level_01")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    client_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    server_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    user = relationship("User", back_populates="save")
