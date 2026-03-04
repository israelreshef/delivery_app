"""add customer contact logs

Revision ID: 9b0f7f1b2c1d
Revises: 6c5e9e5d2f2a
Create Date: 2026-02-25 20:45:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9b0f7f1b2c1d'
down_revision = '6c5e9e5d2f2a'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'customer_contact_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id'), nullable=False),
        sa.Column('contact_type', sa.String(length=50), nullable=True),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('outcome', sa.String(length=100), nullable=True),
        sa.Column('contact_date', sa.DateTime(), nullable=False),
        sa.Column('next_follow_up', sa.Date(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('customer_contact_logs')
