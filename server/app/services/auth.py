from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.user import User
from app.schemas import TokenResponse
from app.services.saves import ensure_save


def upsert_user(db: Session, *, external_id: str, display_name: str, platform: str) -> User:
    user = db.query(User).filter(User.external_id == external_id).one_or_none()
    if user:
        user.display_name = display_name
        user.platform = platform
    else:
        user = User(external_id=external_id, display_name=display_name, platform=platform)
        db.add(user)
    db.commit()
    db.refresh(user)
    ensure_save(db, user)
    return user


def issue_token(user: User) -> TokenResponse:
    token = create_access_token(str(user.id), extra={"platform": user.platform})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        display_name=user.display_name,
        platform=user.platform,
    )
