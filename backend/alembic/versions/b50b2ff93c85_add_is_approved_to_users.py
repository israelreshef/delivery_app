"""add is_approved to users

Revision ID: b50b2ff93c85
Revises: fb3bcdc67c9e
Create Date: 2026-02-15 15:54:03.875589

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b50b2ff93c85'
down_revision: Union[str, None] = 'fb3bcdc67c9e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_approved', sa.Boolean(), nullable=True, server_default=sa.text('false')))


def downgrade() -> None:
    op.drop_column('users', 'is_approved')
