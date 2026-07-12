from fastapi import APIRouter

router = APIRouter()


@router.get("/client")
def get_client_config() -> dict[str, object]:
    return {
        "schemaVersion": 1,
        "radioCanTransmit": False,
        "fogDensity": 0.035,
        "features": {
            "cloudSave": False,
            "ranking": False,
        },
    }
