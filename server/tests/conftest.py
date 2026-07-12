import os
from pathlib import Path

# Must run before app modules import Settings / Engine.
_TEST_DB = Path(__file__).resolve().parent / "test_eerie.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB.as_posix()}"
os.environ["JWT_SECRET"] = "test-secret-eerie-expendable-32b"
os.environ["APP_ENV"] = "test"

if _TEST_DB.exists():
    _TEST_DB.unlink()
