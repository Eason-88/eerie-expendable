import json
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.save import SaveSlot
from app.models.user import User
from app.schemas import SavePayload, SaveResponse


def ensure_save(db: Session, user: User) -> SaveSlot:
    slot = db.query(SaveSlot).filter(SaveSlot.user_id == user.id).one_or_none()
    if slot:
        return slot
    slot = SaveSlot(user_id=user.id, payload_json="{}")
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


def save_to_response(
    slot: SaveSlot,
    *,
    conflict: bool = False,
    message: str | None = None,
) -> SaveResponse:
    data = json.loads(slot.payload_json or "{}")
    return SaveResponse(
        schema_version=slot.schema_version,
        version=slot.version,
        level_id=slot.level_id,
        checkpoint=slot.checkpoint,
        client_updated_at=slot.client_updated_at,
        server_updated_at=slot.server_updated_at,
        data=data,
        conflict=conflict,
        message=message,
    )


def put_save(db: Session, user: User, body: SavePayload) -> SaveResponse:
    """
    Conflict policy:
    - Client must send version == server.version to overwrite (optimistic lock).
    - If client.version < server.version → reject, return server copy with conflict=true.
    - If client.version == server.version → accept, bump version.
    - If no save yet → create at version 1.
    """
    slot = db.query(SaveSlot).filter(SaveSlot.user_id == user.id).one_or_none()
    now = datetime.now(UTC)
    client_ts = body.client_updated_at or now

    if slot is None:
        slot = SaveSlot(
            user_id=user.id,
            schema_version=body.schema_version,
            version=1,
            level_id=body.level_id,
            checkpoint=body.checkpoint,
            payload_json=json.dumps(body.data, ensure_ascii=False),
            client_updated_at=client_ts,
            server_updated_at=now,
        )
        db.add(slot)
        db.commit()
        db.refresh(slot)
        return save_to_response(slot)

    if body.version < slot.version:
        return save_to_response(
            slot,
            conflict=True,
            message="server_newer",
        )

    if body.version > slot.version + 1:
        # Client jumped ahead — still accept but rebase to server+1
        pass

    slot.schema_version = body.schema_version
    slot.version = slot.version + 1
    slot.level_id = body.level_id
    slot.checkpoint = body.checkpoint
    slot.payload_json = json.dumps(body.data, ensure_ascii=False)
    slot.client_updated_at = client_ts
    slot.server_updated_at = now
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return save_to_response(slot)
