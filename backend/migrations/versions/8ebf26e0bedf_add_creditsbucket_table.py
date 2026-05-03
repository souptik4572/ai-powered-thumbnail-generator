"""add_creditsbucket_table

Revision ID: 8ebf26e0bedf
Revises: 001
Create Date: 2026-05-02 07:26:40.619476

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlmodel import AutoString


revision: str = '8ebf26e0bedf'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # creditsbucket was already created by migration 001; skip if it exists.
    bind = op.get_bind()
    if 'creditsbucket' not in sa.inspect(bind).get_table_names():
        op.create_table(
            'creditsbucket',
            sa.Column('id', AutoString(), nullable=False),
            sa.Column('user_id', AutoString(), nullable=False),
            sa.Column('credits', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['user.id']),
            sa.PrimaryKeyConstraint('id'),
        )


def downgrade() -> None:
    # Only drop if this migration was the one that created it (i.e. 001 did not).
    bind = op.get_bind()
    if 'creditsbucket' in sa.inspect(bind).get_table_names():
        op.drop_table('creditsbucket')
