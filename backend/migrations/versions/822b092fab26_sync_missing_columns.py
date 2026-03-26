from alembic import op
import sqlalchemy as sa

revision = '822b092fab26'
down_revision = '402e4df019c7'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('insurance_policies', schema=None) as batch_op:
        batch_op.add_column(sa.Column('first_name', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('last_name', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('tax_id', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('withholding_tax_rate', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('withholding_expiry', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('is_available', sa.Boolean(), nullable=True))
        batch_op.drop_column('is_verified')
        batch_op.drop_column('document_url')
        batch_op.drop_column('valid_to')

    with op.batch_alter_table('couriers', schema=None) as batch_op:
        batch_op.drop_column('withholding_tax_rate')
        batch_op.drop_column('withholding_expiry')
        batch_op.drop_column('tax_id')

    with op.batch_alter_table('expenses', schema=None) as batch_op:
        batch_op.drop_column('amount')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('privacy_consent_at')

def downgrade():
    pass
