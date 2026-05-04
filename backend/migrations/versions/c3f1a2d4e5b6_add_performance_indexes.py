"""add_performance_indexes

Revision ID: c3f1a2d4e5b6
Revises: 8ebf26e0bedf
Create Date: 2026-05-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c3f1a2d4e5b6'
down_revision: Union[str, None] = '8ebf26e0bedf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Composite index satisfies both WHERE job.user_id = ? AND ORDER BY created_at DESC
    # in a single index scan — eliminates full table scan on the jobs list endpoint.
    op.create_index('idx_job_user_created', 'job', ['user_id', 'created_at'])

    # Covers the WHERE thumbnail.job_id IN (...) batch fetch in get_all_jobs
    # and the per-job thumbnail lookup in get_job / stream_job.
    op.create_index('idx_thumbnail_job_id', 'thumbnail', ['job_id'])

    # Covers the per-user thumbnail list endpoint (GET /thumbnails).
    op.create_index('idx_thumbnail_user_created', 'thumbnail', ['user_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('idx_thumbnail_user_created', table_name='thumbnail')
    op.drop_index('idx_thumbnail_job_id', table_name='thumbnail')
    op.drop_index('idx_job_user_created', table_name='job')
