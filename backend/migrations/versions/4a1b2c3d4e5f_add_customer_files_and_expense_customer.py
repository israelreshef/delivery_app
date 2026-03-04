"""add customer files and expense customer link

Revision ID: 4a1b2c3d4e5f
Revises: 9b0f7f1b2c1d
Create Date: 2026-02-25 21:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4a1b2c3d4e5f'
down_revision = '9b0f7f1b2c1d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('expenses', sa.Column('customer_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_expenses_customer', 'expenses', 'customers', ['customer_id'], ['id'])

    op.create_table(
        'customer_files',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('file_type', sa.String(length=50), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True, server_default='active'),
        sa.Column('archived', sa.Boolean(), nullable=True, server_default=sa.text('false')),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('customer_files')
    op.drop_constraint('fk_expenses_customer', 'expenses', type_='foreignkey')
    op.drop_column('expenses', 'customer_id')
