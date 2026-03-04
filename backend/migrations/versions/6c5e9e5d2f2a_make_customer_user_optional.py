"""make customer user optional

Revision ID: 6c5e9e5d2f2a
Revises: 3b7c0f1d2a7a
Create Date: 2026-02-25 20:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6c5e9e5d2f2a'
down_revision = '3b7c0f1d2a7a'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('customers', 'user_id', existing_type=sa.Integer(), nullable=True)


def downgrade():
    op.alter_column('customers', 'user_id', existing_type=sa.Integer(), nullable=False)
