"""add finance_documents

Revision ID: 3b7c0f1d2a7a
Revises: 771fc29afc7b
Create Date: 2026-02-25 19:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3b7c0f1d2a7a'
down_revision = '771fc29afc7b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'finance_documents',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('doc_type', sa.String(length=100), nullable=False),
        sa.Column('authority', sa.String(length=100), nullable=True),
        sa.Column('submitted_by', sa.String(length=50), nullable=True),
        sa.Column('entity_type', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True, server_default='archived'),
        sa.Column('year', sa.Integer(), nullable=True),
        sa.Column('period', sa.String(length=50), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('filed_date', sa.Date(), nullable=True),
        sa.Column('amount_due', sa.Numeric(12, 2), nullable=True),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('uploaded_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('finance_documents')
