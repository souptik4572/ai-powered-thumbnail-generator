from logging.config import fileConfig
import sys
import os

from sqlalchemy import engine_from_config, pool
from alembic import context

# Put backend/ on sys.path so imports resolve without the package prefix
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import SQLModel

# Import every model so SQLModel.metadata is fully populated before Alembic
# compares the target schema against the database.
import models  # noqa: F401

from config import DATABASE_URL

alembic_config = context.config
alembic_config.set_main_option("sqlalchemy.url", DATABASE_URL)

if alembic_config.config_file_name is not None:
    fileConfig(alembic_config.config_file_name, disable_existing_loggers=False)

target_metadata = SQLModel.metadata

# SQLite lacks native ALTER TABLE support; batch mode rewrites the whole table.
# PostgreSQL and MySQL handle ALTER TABLE natively, so batch mode is not needed.
_render_as_batch = DATABASE_URL.startswith("sqlite")


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (generates SQL to stdout)."""
    url = alembic_config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=_render_as_batch,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    # When called from database.run_migrations() at app startup, an existing
    # connection is passed via config.attributes to avoid a second round-trip.
    passed_conn = context.config.attributes.get("connection")
    if passed_conn is not None:
        context.configure(
            connection=passed_conn,
            target_metadata=target_metadata,
            render_as_batch=_render_as_batch,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()
        return

    # Standalone `alembic upgrade head` path — open a fresh connection.
    connectable = engine_from_config(
        alembic_config.get_section(alembic_config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=_render_as_batch,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
