"""add customer files, contact logs, finance docs, expense customer, and optional customer user

Revision ID: c9c1f6d0b7a2
Revises: b50b2ff93c85
Create Date: 2026-02-25 21:10:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


# revision identifiers, used by Alembic.
revision = 'c9c1f6d0b7a2'
down_revision = 'b50b2ff93c85'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if 'customer_contact_logs' not in tables:
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

    if 'customer_files' not in tables:
        op.create_table(
            'customer_files',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id'), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('file_type', sa.String(length=50), nullable=True),
            sa.Column('category', sa.String(length=100), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=True),
            sa.Column('archived', sa.Boolean(), nullable=True),
            sa.Column('file_name', sa.String(length=255), nullable=False),
            sa.Column('file_path', sa.String(length=500), nullable=False),
            sa.Column('mime_type', sa.String(length=100), nullable=True),
            sa.Column('file_size', sa.Integer(), nullable=True),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )

    if 'finance_documents' not in tables:
        op.create_table(
            'finance_documents',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('doc_type', sa.String(length=100), nullable=False),
            sa.Column('authority', sa.String(length=100), nullable=True),
            sa.Column('submitted_by', sa.String(length=50), nullable=True),
            sa.Column('entity_type', sa.String(length=50), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=True),
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

    if 'expenses' in tables:
        expense_cols = {col['name'] for col in inspector.get_columns('expenses')}
        if 'customer_id' not in expense_cols:
            op.add_column('expenses', sa.Column('customer_id', sa.Integer(), nullable=True))

        expense_fks = inspector.get_foreign_keys('expenses')
        has_customer_fk = any(
            fk.get('referred_table') == 'customers'
            and 'customer_id' in (fk.get('constrained_columns') or [])
            for fk in expense_fks
        )
        if not has_customer_fk:
            op.create_foreign_key(
                'fk_expenses_customer_id_customers',
                'expenses',
                'customers',
                ['customer_id'],
                ['id'],
            )

    if 'customers' in tables:
        customer_cols = {col['name']: col for col in inspector.get_columns('customers')}
        user_col = customer_cols.get('user_id')
        if user_col and user_col.get('nullable') is False:
            op.alter_column('customers', 'user_id', existing_type=sa.Integer(), nullable=True)


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if 'expenses' in tables:
        expense_cols = {col['name'] for col in inspector.get_columns('expenses')}
        if 'customer_id' in expense_cols:
            expense_fks = inspector.get_foreign_keys('expenses')
            for fk in expense_fks:
                if fk.get('referred_table') == 'customers' and 'customer_id' in (fk.get('constrained_columns') or []):
                    op.drop_constraint(fk.get('name'), 'expenses', type_='foreignkey')
                    break
            op.drop_column('expenses', 'customer_id')

    if 'finance_documents' in tables:
        op.drop_table('finance_documents')

    if 'customer_files' in tables:
        op.drop_table('customer_files')

    if 'customer_contact_logs' in tables:
        op.drop_table('customer_contact_logs')

    if 'customers' in tables:
        # Only tighten user_id if there are no NULL values.
        result = bind.execute(text("SELECT COUNT(*) FROM customers WHERE user_id IS NULL"))
        null_count = result.scalar() or 0
        if null_count == 0:
            op.alter_column('customers', 'user_id', existing_type=sa.Integer(), nullable=False)
