"""add crm fields to customers

Revision ID: a1b2c3d4e5f6
Revises: 9b0f7f1b2c1d
Create Date: 2026-02-28 19:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '9b0f7f1b2c1d'
branch_labels = None
depends_on = None


def upgrade():
    # Add new CRM fields to customers table
    with op.batch_alter_table('customers') as batch_op:
        batch_op.add_column(sa.Column('website', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('lead_source', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('tags', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('phone', sa.String(length=20), nullable=True))


def downgrade():
    with op.batch_alter_table('customers') as batch_op:
        batch_op.drop_column('phone')
        batch_op.drop_column('tags')
        batch_op.drop_column('lead_source')
        batch_op.drop_column('website')
