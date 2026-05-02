"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user",
        sa.Column("id", sqlmodel.AutoString(), primary_key=True, nullable=False),
        sa.Column("email", sqlmodel.AutoString(), nullable=False, server_default=""),
        sa.Column("password_hash", sqlmodel.AutoString(), nullable=False, server_default=""),
        sa.Column("name", sqlmodel.AutoString(), nullable=True),
        sa.Column("location", sqlmodel.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("role", sqlmodel.AutoString(), nullable=False, server_default="USER"),
    )
    op.create_table(
        "job",
        sa.Column("id", sqlmodel.AutoString(), primary_key=True, nullable=False),
        sa.Column("user_id", sqlmodel.AutoString(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("prompt", sqlmodel.AutoString(), nullable=False, server_default=""),
        sa.Column("num_thumbnails", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("headshot_url", sqlmodel.AutoString(), nullable=True),
        sa.Column("status", sqlmodel.AutoString(), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "thumbnail",
        sa.Column("id", sqlmodel.AutoString(), primary_key=True, nullable=False),
        sa.Column("user_id", sqlmodel.AutoString(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("job_id", sqlmodel.AutoString(), sa.ForeignKey("job.id"), nullable=False),
        sa.Column("style_name", sqlmodel.AutoString(), nullable=False, server_default=""),
        sa.Column("imagekit_url", sqlmodel.AutoString(), nullable=True),
        sa.Column("status", sqlmodel.AutoString(), nullable=False, server_default="PENDING"),
        sa.Column("error_message", sqlmodel.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "creditsbucket",
        sa.Column("id", sqlmodel.AutoString(), primary_key=True, nullable=False),
        sa.Column("user_id", sqlmodel.AutoString(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("credits", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    # Drop in reverse FK dependency order
    op.drop_table("creditsbucket")
    op.drop_table("thumbnail")
    op.drop_table("job")
    op.drop_table("user")
