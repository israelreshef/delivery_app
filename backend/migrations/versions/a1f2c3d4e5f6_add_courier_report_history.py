"""add courier_report_history

Revision ID: a1f2c3d4e5f6
Revises: 7c1d2e3f4a5b
Create Date: 2026-08-05 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1f2c3d4e5f6'
down_revision = '7c1d2e3f4a5b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'courier_report_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('courier_id', sa.Integer(), sa.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('form_id', sa.String(length=50), nullable=False),
        sa.Column('period_type', sa.String(length=10), nullable=False),
        sa.Column('period_year', sa.Integer(), nullable=False),
        sa.Column('period_month', sa.Integer(), nullable=True),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_bytes', sa.LargeBinary(), nullable=False),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('source_fingerprint', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='up_to_date'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint(
            'courier_id', 'form_id', 'period_type', 'period_year', 'period_month',
            name='uq_courier_report_period'),
    )
    op.create_index('ix_courier_report_history_courier_id', 'courier_report_history', ['courier_id'])


def downgrade():
    op.drop_index('ix_courier_report_history_courier_id', table_name='courier_report_history')
    op.drop_table('courier_report_history')