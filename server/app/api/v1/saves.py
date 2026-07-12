from fastapi import APIRouter

from app.core.deps import CurrentUser, DbDep
from app.schemas import SavePayload, SaveResponse
from app.services.saves import ensure_save, put_save, save_to_response

router = APIRouter()


@router.get("/current", response_model=SaveResponse)
def get_current_save(db: DbDep, user: CurrentUser) -> SaveResponse:
    slot = ensure_save(db, user)
    return save_to_response(slot)


@router.put("/current", response_model=SaveResponse)
def put_current_save(body: SavePayload, db: DbDep, user: CurrentUser) -> SaveResponse:
    return put_save(db, user, body)
