import os

from sqlmodel import create_engine, Session
from alembic.config import Config
from alembic import command
from sqlalchemy import inspect

from config import DATABASE_URL

# check_same_thread is only a valid kwarg for SQLite
_extra: dict = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, echo=True, **_extra)

_ALEMBIC_CFG_PATH = os.path.join(os.path.dirname(__file__), "alembic.ini")


def run_migrations() -> None:
    alembic_cfg = Config(_ALEMBIC_CFG_PATH)

    with engine.connect() as conn:
        inspector = inspect(conn)
        existing_tables = set(inspector.get_table_names())

    # Tables exist but no alembic_version table means the DB was created by
    # the old create_all() approach. Stamp it at head so Alembic knows the
    # initial migration is already applied, then continue upgrading normally.
    core_tables = {"user", "job", "thumbnail"}
    if core_tables.issubset(existing_tables) and "alembic_version" not in existing_tables:
        command.stamp(alembic_cfg, "head")
    else:
        command.upgrade(alembic_cfg, "head")


def get_session():
    with Session(engine) as session:
        yield session
