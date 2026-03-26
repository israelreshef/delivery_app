from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.types import TypeDecorator, String
from utils.encryption import encrypt_data, decrypt_data
from extensions import db

class EncryptedString(TypeDecorator):
    """Transparent AES-256 encryption for database columns."""
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt_data(value)

    def process_result_value(self, value, dialect):
        return decrypt_data(value)

# ============================================================================
# Shared Enums
# ============================================================================
delivery_status_enum = db.Enum('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed', name='delivery_status_type', metadata=db.metadata)
priority_enum = db.Enum('low', 'normal', 'high', 'urgent', name='priority_level_type', metadata=db.metadata)
package_size_enum = db.Enum('small', 'medium', 'large', 'xlarge', name='package_size_type', metadata=db.metadata)
admin_role_enum = db.Enum('super_admin', 'support_admin', 'content_admin', 'finance_admin', name='admin_role_types', metadata=db.metadata)
document_status_enum = db.Enum('pending', 'approved', 'rejected', 'expired', name='document_status_types', metadata=db.metadata)
onboarding_status_enum = db.Enum('new', 'docs_uploaded', 'pending_approval', 'approved', 'rejected', name='onboarding_status_types', metadata=db.metadata)
chat_status_enum = db.Enum('active', 'closed', 'archived', name='chat_status_types', metadata=db.metadata)

# CRM Enums
lead_status_enum = db.Enum('new', 'contacted', 'meeting', 'proposal', 'negotiation', 'won', 'lost', name='lead_status_types', metadata=db.metadata)
activity_type_enum = db.Enum('call', 'email', 'meeting', 'note', 'whatsapp', name='activity_type_types', metadata=db.metadata)
lead_source_enum = db.Enum('website', 'facebook', 'referral', 'cold_call', 'other', name='lead_source_types', metadata=db.metadata)

# ============================================================================
# User & Authentication Models
# ============================================================================

class User(db.Model):
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    user_type = db.Column(db.Enum('admin', 'customer', 'courier', name='user_types'), nullable=False)
    admin_role = db.Column(admin_role_enum, nullable=True) # Only for user_type='admin'
    is_active = db.Column(db.Boolean, default=True)
    fcm_token = db.Column(db.String(255), nullable=True) # For push notifications
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Security Fields
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    
    # 2FA / MFA Fields
    totp_secret = db.Column(db.String(32), nullable=True)
    mfa_enabled = db.Column(db.Boolean, default=False)
    mfa_recovery_code = db.Column(db.String(64), nullable=True)
    
    # GDPR / Privacy Consent
    terms_accepted_at = db.Column(db.DateTime, nullable=True)
    privacy_policy_accepted_at = db.Column(db.DateTime, nullable=True)
    
    # Two-Factor Authentication (OTP)
    two_factor_secret = db.Column(db.String(32), nullable=True)
    is_two_factor_enabled = db.Column(db.Boolean, default=False)
    two_factor_enforced_by_admin = db.Column(db.Boolean, default=False)

    # Google Calendar Integration
    google_access_token = db.Column(db.Text, nullable=True)
    google_refresh_token = db.Column(db.Text, nullable=True)
    google_token_expiry = db.Column(db.DateTime, nullable=True)
    google_calendar_id = db.Column(db.String(255), default='primary')
    
    # Relationships
    customer = db.relationship('Customer', backref='user', uselist=False, cascade='all, delete-orphan')
    courier = db.relationship('Courier', backref='user', uselist=False, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    user_groups = db.relationship(
        'UserGroup',
        foreign_keys='UserGroup.user_id',
        backref='user',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )
    
    def set_password(self, password):
        # Using specific method for stronger security (pbkdf2:sha256 with 600,000 iterations)
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256:600000')
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'


class Group(db.Model):
    __tablename__ = 'groups'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user_groups = db.relationship('UserGroup', backref='group', lazy='dynamic', cascade='all, delete-orphan')
    group_permissions = db.relationship('GroupPermission', backref='group', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Group {self.name}>'


class Permission(db.Model):
    __tablename__ = 'permissions'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    permission_key = db.Column(db.String(120), unique=True, nullable=False)  # e.g. support:view
    resource = db.Column(db.String(50), nullable=False)  # support/tasks/admin...
    action = db.Column(db.String(50), nullable=False)    # view/edit/manage...
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    group_permissions = db.relationship('GroupPermission', backref='permission', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Permission {self.permission_key}>'


class UserGroup(db.Model):
    __tablename__ = 'user_groups'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'group_id', name='uq_user_group'),
        {'extend_existing': True}
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<UserGroup user={self.user_id} group={self.group_id}>'


class GroupPermission(db.Model):
    __tablename__ = 'group_permissions'
    __table_args__ = (
        db.UniqueConstraint('group_id', 'permission_id', name='uq_group_permission'),
        {'extend_existing': True}
    )

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)
    permission_id = db.Column(db.Integer, db.ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<GroupPermission group={self.group_id} permission={self.permission_id}>'

class WebAuthnCredential(db.Model):
    __tablename__ = 'webauthn_credentials'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    credential_id = db.Column(db.LargeBinary, unique=True, nullable=False)
    public_key = db.Column(db.LargeBinary, nullable=False)
    sign_count = db.Column(db.Integer, default=0)
    transports = db.Column(db.String(255), nullable=True) # JSON list
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('webauthn_credentials', lazy='dynamic'))

    def __repr__(self):
        return f'<WebAuthnCredential {self.id} for User {self.user_id}>'

# ============================================================================
# Customer Model
# ============================================================================

class Customer(db.Model):
    __tablename__ = 'customers'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    full_name = db.Column(db.String(100), nullable=False)
    company_name = db.Column(db.String(100), nullable=True)
    
    # B2B vs Private Classification
    customer_type = db.Column(db.Enum('private', 'business', name='customer_type_enum'), default='private')
    
    # Israeli Compliance Fields
    tax_id = db.Column(db.String(20), nullable=True) # ח.פ / עוסק מורשה / ת.ז
    vat_status = db.Column(db.Enum('exempt', 'authorized_dealer', 'company', 'standard', name='vat_statuses'), default='authorized_dealer')
    payment_terms = db.Column(db.String(50), default='net_30', nullable=True) # e.g. EOM+30
    
    business_id = db.Column(db.String(20), nullable=True) # Kept for backward compatibility
    contact_person = db.Column(db.String(100), nullable=True) # Name of contact if company
    status = db.Column(db.String(20), default='active') # active, inactive, candidate, blocked
    default_address = db.Column(db.Text, nullable=True)
    billing_address = db.Column(db.Text, nullable=True)
    credit_limit = db.Column(db.Numeric(10, 2), default=0.00)
    balance = db.Column(db.Numeric(10, 2), default=0.00)
    rating = db.Column(db.Float, default=5.0)
    total_orders = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # CRM Extended Fields
    website = db.Column(db.String(255), nullable=True)
    lead_source = db.Column(db.String(100), nullable=True)  # e.g. referral, website, cold_call
    tags = db.Column(db.Text, nullable=True)  # JSON array stored as text e.g. '["VIP","Urgent"]'
    phone = db.Column(db.String(20), nullable=True)  # Primary phone
    additional_phones = db.Column(db.Text, nullable=True)  # JSON array of other phones e.g. '["0501111111", "0502222222"]'
    email = db.Column(db.String(120), nullable=True)  # Direct email for customer
    
    # Relationships
    deliveries = db.relationship('Delivery', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    invoices = db.relationship('Invoice', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    ratings = db.relationship('Rating', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    contact_logs = db.relationship('CustomerContactLog', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    files = db.relationship('CustomerFile', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    notes = db.relationship('CustomerNote', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    tasks = db.relationship('CustomerTask', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Customer {self.full_name}>'


# ============================================================================
# Customer Contact Log
# ============================================================================

class CustomerContactLog(db.Model):
    __tablename__ = 'customer_contact_logs'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False)
    contact_type = db.Column(db.String(50), default='call')  # call, email, whatsapp, meeting, other
    summary = db.Column(db.Text, nullable=False)
    outcome = db.Column(db.String(100), nullable=True)
    contact_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    next_follow_up = db.Column(db.Date, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<CustomerContactLog {self.customer_id} {self.contact_type}>'


# ============================================================================
# Customer Files (Receipts, Legal, Contracts, etc.)
# ============================================================================

class CustomerFile(db.Model):
    __tablename__ = 'customer_files'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    file_type = db.Column(db.String(50), default='other')  # receipt, contract, legal, other
    category = db.Column(db.String(100), nullable=True)  # custom folder/category
    status = db.Column(db.String(50), default='active')  # active, archived
    archived = db.Column(db.Boolean, default=False)

    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    mime_type = db.Column(db.String(100), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<CustomerFile {self.customer_id} {self.file_type}>'

# ============================================================================
# Customer Notes and Tasks
# ============================================================================

class CustomerNote(db.Model):
    __tablename__ = 'customer_notes'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<CustomerNote {self.id} Customer:{self.customer_id}>'

class CustomerTask(db.Model):
    __tablename__ = 'customer_tasks'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=True) # Optional, can be a general task
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    priority = db.Column(db.Enum('low', 'medium', 'high', name='task_priority_types'), default='medium')
    status = db.Column(db.Enum('open', 'in_progress', 'completed', 'cancelled', name='task_status_types'), default='open')
    
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    source = db.Column(db.String(255), nullable=True)  # e.g. 'requirements'
    source_id = db.Column(db.String(255), nullable=True)  # e.g. 'REQ-0001'

    def __repr__(self):
        return f'<CustomerTask {self.id} {self.title} source={self.source} source_id={self.source_id}>'


# ============================================================================
# Courier Model
# ============================================================================

class Courier(db.Model):
    __tablename__ = 'couriers'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    full_name = db.Column(db.String(100), nullable=False)
    vehicle_type = db.Column(db.Enum('motorcycle', 'scooter', 'car', 'bicycle', 'van', name='vehicle_types'), nullable=False)
    license_plate = db.Column(db.String(20), nullable=True)
    max_capacity = db.Column(db.Integer, default=10)  # מקסימום משלוחים בו-זמנית
    current_location_lat = db.Column(db.Float, nullable=True)
    current_location_lng = db.Column(db.Float, nullable=True)
    # PostGIS Field: Point(lng, lat)
    # location_geom = db.Column(Geometry(geometry_type='POINT', srid=4326), nullable=True)
    # location_geom = db.Column(Geometry(geometry_type='POINT', srid=4326), nullable=True)
    is_available = db.Column(db.Boolean, default=True)
    
    # Compliance & Onboarding
    national_id = db.Column(EncryptedString(255), nullable=True) # Teudat Zehut (Encrypted)
    drivers_license_number = db.Column(EncryptedString(255), nullable=True) # (Encrypted)
    insurance_policy_number = db.Column(EncryptedString(255), nullable=True) # (Encrypted)
    is_freelance_declared = db.Column(db.Boolean, default=False)
    employment_type = db.Column(db.Enum('freelance', 'employee', name='employment_types'), default='freelance')
    onboarding_status = db.Column(onboarding_status_enum, default='new')
    rejection_reason = db.Column(db.Text, nullable=True)
    
    rating = db.Column(db.Float, default=5.0)
    
    # Performance KPIs (Based on ERP Characterization)
    reliability_score = db.Column(db.Float, default=1.0) # 0.0 to 1.0 (Punctuality)
    integrity_score = db.Column(db.Float, default=1.0)   # 0.0 to 1.0 (Package Safety)
    service_score = db.Column(db.Float, default=1.0)     # 0.0 to 1.0 (Customer Satisfaction)
    efficiency_score = db.Column(db.Float, default=1.0)   # 0.0 to 1.0 (Speed/Routes)
    performance_index = db.Column(db.Float, default=100.0) # 0 to 100 (Weighted Score)
    
    total_deliveries = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    deliveries = db.relationship('Delivery', backref='courier', lazy='dynamic')
    tracking = db.relationship('DeliveryTracking', backref='courier', lazy='dynamic', cascade='all, delete-orphan')
    ratings = db.relationship('Rating', backref='courier', lazy='dynamic', cascade='all, delete-orphan')
    documents = db.relationship('CourierDocument', backref='courier', lazy='dynamic', cascade='all, delete-orphan')
    gamification = db.relationship('CourierGamification', backref='courier', uselist=False, cascade='all, delete-orphan')
    daily_missions = db.relationship('DailyMission', backref='courier', lazy='dynamic', cascade='all, delete-orphan')
    shift_sessions = db.relationship('ShiftSession', backref='courier', lazy='dynamic', cascade='all, delete-orphan')
    earned_milestones = db.relationship('EarnedMilestone', backref='courier', lazy='dynamic', cascade='all, delete-orphan')
    certifications = db.relationship('CourierCertification', backref='courier', lazy='dynamic', cascade='all, delete-orphan')
    
    __table_args__ = (
        db.Index('idx_courier_available', 'is_available'),
        db.Index('idx_courier_location', 'current_location_lat', 'current_location_lng'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f'<Courier {self.full_name}>'

# ============================================================================
# Gamification, Shift & Milestone Models (TZIR Academy)
# ============================================================================

class Milestone(db.Model):
    __tablename__ = 'milestones'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False) # e.g., "10,000 KM Driven"
    description = db.Column(db.Text, nullable=True)
    trigger_type = db.Column(db.String(50), nullable=False) # e.g., 'total_deliveries', 'total_distance'
    trigger_value = db.Column(db.Integer, nullable=False) # e.g., 10000
    reward_xp = db.Column(db.Integer, default=0)
    reward_cash = db.Column(db.Float, default=0.0)
    medal_icon_url = db.Column(db.String(255), nullable=True)
    
    def __repr__(self):
        return f'<Milestone {self.title}>'

class EarnedMilestone(db.Model):
    __tablename__ = 'earned_milestones'
    __table_args__ = (
        db.UniqueConstraint('courier_id', 'milestone_id', name='uq_courier_milestone'),
        {'extend_existing': True}
    )
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    milestone_id = db.Column(db.Integer, db.ForeignKey('milestones.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    milestone = db.relationship('Milestone')
    
    def __repr__(self):
        return f'<EarnedMilestone Courier:{self.courier_id} Milestone:{self.milestone_id}>'

class CourierGamification(db.Model):
    __tablename__ = 'courier_gamification'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False, unique=True)
    level = db.Column(db.Integer, default=1, nullable=False)
    xp = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<CourierGamification Courier:{self.courier_id} Lvl:{self.level} XP:{self.xp}>'

class DailyMission(db.Model):
    __tablename__ = 'daily_missions'
    __table_args__ = (
        db.UniqueConstraint('courier_id', 'mission_date', name='uq_courier_mission_date'),
        {'extend_existing': True}
    )
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    mission_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    
    completed_deliveries = db.Column(db.Integer, default=0)
    fast_deliveries = db.Column(db.Integer, default=0)
    five_star_reviews = db.Column(db.Integer, default=0)
    canceled_deliveries = db.Column(db.Integer, default=0)
    
    streak_days = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<DailyMission Courier:{self.courier_id} Date:{self.mission_date}>'

class ShiftSession(db.Model):
    __tablename__ = 'shift_sessions'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    
    is_active = db.Column(db.Boolean, default=True)
    rest_recommended_shown = db.Column(db.Boolean, default=False)
    forced_stop_applied = db.Column(db.Boolean, default=False)
    
    vibe_selected = db.Column(db.String(50), nullable=True) # offices, restaurants, etc
    
    def __repr__(self):
        return f'<ShiftSession Courier:{self.courier_id} Start:{self.start_time} Active:{self.is_active}>'

# ============================================================================
# Academy & Certifications Models (TZIR Academy Phase 3)
# ============================================================================

class Course(db.Model):
    __tablename__ = 'courses'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    required_level = db.Column(db.Integer, default=1)
    badge_icon_url = db.Column(db.String(255), nullable=True) # Icon for passing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    lessons = db.relationship('CourseLesson', backref='course', lazy='dynamic', cascade='all, delete-orphan')

class CourseLesson(db.Model):
    __tablename__ = 'course_lessons'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    content_text = db.Column(db.Text, nullable=True)
    video_url = db.Column(db.String(255), nullable=True)
    order_index = db.Column(db.Integer, default=0)

class CourierCertification(db.Model):
    __tablename__ = 'courier_certifications'
    __table_args__ = (
        db.UniqueConstraint('courier_id', 'course_id', name='uq_courier_course_cert'),
        {'extend_existing': True}
    )
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    # Statuses: locked, training, temporary, permanent
    status = db.Column(db.String(50), default='locked')
    
    progress_percent = db.Column(db.Float, default=0.0)
    temporary_orders_completed = db.Column(db.Integer, default=0) # For On-The-Job Training
    
    issued_at = db.Column(db.DateTime, nullable=True)

    course = db.relationship('Course')

    def __repr__(self):
        return f'<CourierCertification Courier:{self.courier_id} Course:{self.course_id} Status:{self.status}>'

# ============================================================================
# Address Model
# ============================================================================

class Address(db.Model):
    __tablename__ = 'addresses'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True) # Optional: address can be global or user-specific
    street = db.Column(db.String(200), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    postal_code = db.Column(db.String(20), nullable=True)
    building_number = db.Column(db.String(10), nullable=False)
    apartment = db.Column(db.String(10), nullable=True)
    floor = db.Column(db.String(10), nullable=True)
    entrance = db.Column(db.String(10), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    # PostGIS Field: Point(lng, lat)
    # geom = db.Column(Geometry(geometry_type='POINT', srid=4326), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('addresses', lazy='dynamic'))
    pickup_points = db.relationship('PickupPoint', backref='address', lazy='dynamic', cascade='all, delete-orphan')
    delivery_points = db.relationship('DeliveryPoint', backref='address', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Address {self.street} {self.building_number}, {self.city}>'


# ============================================================================
# Pickup Point Model
# ============================================================================

class PickupPoint(db.Model):
    __tablename__ = 'pickup_points'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    address_id = db.Column(db.Integer, db.ForeignKey('addresses.id'), nullable=False)
    contact_name = db.Column(db.String(100), nullable=False)
    contact_phone = db.Column(db.String(20), nullable=False)
    business_name = db.Column(db.String(100), nullable=True)
    pickup_instructions = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    deliveries = db.relationship('Delivery', backref='pickup_point', lazy='dynamic')
    
    def __repr__(self):
        return f'<PickupPoint {self.business_name or self.contact_name}>'


# ============================================================================
# Delivery Point Model
# ============================================================================

class DeliveryPoint(db.Model):
    __tablename__ = 'delivery_points'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    address_id = db.Column(db.Integer, db.ForeignKey('addresses.id'), nullable=False)
    recipient_name = db.Column(db.String(100), nullable=False)
    recipient_phone = db.Column(db.String(20), nullable=False)
    delivery_instructions = db.Column(db.Text, nullable=True)
    access_code = db.Column(db.String(20), nullable=True)
    is_residential = db.Column(db.Boolean, default=True)
    
    # Relationships
    deliveries = db.relationship('Delivery', backref='delivery_point', lazy='dynamic')
    
    def __repr__(self):
        return f'<DeliveryPoint {self.recipient_name}>'



# ============================================================================
# Delivery Model
# ============================================================================

class Delivery(db.Model):
    __tablename__ = 'deliveries'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=True)
    pickup_point_id = db.Column(db.Integer, db.ForeignKey('pickup_points.id'), nullable=False)
    delivery_point_id = db.Column(db.Integer, db.ForeignKey('delivery_points.id'), nullable=False)
    
    status = db.Column(delivery_status_enum, default='pending', nullable=False)
    priority = db.Column(priority_enum, default='normal')
    
    package_description = db.Column(db.Text, nullable=True)
    
    # E2EE Fields
    encrypted_payload = db.Column(db.Text, nullable=True)  # Stores sensitive data (contracts, content)
    encrypted_session_key = db.Column(db.Text, nullable=True) # Encrypted with Server RSA Public Key
    key_hash = db.Column(db.String(128), nullable=True)    # To identify which key encrypted it
    
    package_weight = db.Column(db.Float, nullable=True)  # בק"ג
    package_size = db.Column(package_size_enum, default='medium')
    
    estimated_pickup_time = db.Column(db.DateTime, nullable=True)
    actual_pickup_time = db.Column(db.DateTime, nullable=True)
    estimated_delivery_time = db.Column(db.DateTime, nullable=True)
    actual_delivery_time = db.Column(db.DateTime, nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True) # Alias for convenience
    delivery_fee = db.Column(db.Float, default=0.0)
    
    distance_km = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    
    # Logistics Fields
    delivery_type = db.Column(db.Enum('standard', 'legal_document', 'valuable', name='delivery_type_enum'), default='standard', nullable=False)
    urgency = db.Column(db.Enum('express', 'standard', 'economy', name='delivery_urgency_enum'), default='standard', nullable=False)
    
    insurance_required = db.Column(db.Boolean, default=False)
    insurance_value = db.Column(db.Numeric(10, 2), default=0.00)
    biometric_verification_required = db.Column(db.Boolean, default=False)

    tracking_number = db.Column(db.String(100), unique=True, nullable=True) # External/Barcode
    
    # Proof of Delivery (POD)
    pod_signature_path = db.Column(db.String(255), nullable=True)
    pod_image_path = db.Column(db.String(255), nullable=True)
    pod_recipient_id = db.Column(EncryptedString(255), nullable=True) # Required for legal documents (Encrypted)
    pod_location_lat = db.Column(db.Float, nullable=True) # GPS at moment of signature
    pod_location_lng = db.Column(db.Float, nullable=True)
    
    # OTP Verification
    otp_code = db.Column(db.String(6), nullable=True)
    otp_verified = db.Column(db.Boolean, default=False)
    
    # WMS Support
    current_bin_id = db.Column(db.Integer, db.ForeignKey('storage_bins.id', name='fk_delivery_bin_id'), nullable=True)
    current_bin = db.relationship('StorageBin', backref='stored_deliveries')
    
    # Multi-Stop Routing 
    waypoints = db.Column(db.Text, nullable=True) # JSON array of {address, lat, lng}
    
    protocol_slug = db.Column(db.String(100), db.ForeignKey('delivery_protocol_configs.slug'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    status_history = db.relationship('DeliveryStatus', backref='delivery', lazy='dynamic', cascade='all, delete-orphan', order_by='DeliveryStatus.timestamp.desc()')
    invoice = db.relationship('Invoice', backref='delivery', uselist=False, cascade='all, delete-orphan')
    tracking = db.relationship('DeliveryTracking', backref='delivery', lazy='dynamic', cascade='all, delete-orphan')
    rating = db.relationship('Rating', backref='delivery', uselist=False, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='delivery', lazy='dynamic', cascade='all, delete-orphan')
    
    __table_args__ = (
        db.Index('idx_delivery_status', 'status'),
        db.Index('idx_delivery_created', 'created_at'),
        db.Index('idx_delivery_courier_status', 'courier_id', 'status'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f'<Delivery {self.order_number}>'


# ============================================================================
# Delivery Status History Model
# ============================================================================

class DeliveryStatus(db.Model):
    __tablename__ = 'delivery_statuses'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(delivery_status_enum, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    location_lat = db.Column(db.Float, nullable=True)
    location_lng = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    
    def __repr__(self):
        return f'<DeliveryStatus {self.status} at {self.timestamp}>'


# ============================================================================
# Pricing Model
# ============================================================================

class Pricing(db.Model):
    __tablename__ = 'pricing'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    base_price = db.Column(db.Numeric(10, 2), nullable=False, default=20.00)
    price_per_km = db.Column(db.Numeric(10, 2), nullable=False, default=5.00)
    price_per_kg = db.Column(db.Numeric(10, 2), nullable=False, default=2.00)
    express_fee = db.Column(db.Numeric(10, 2), nullable=False, default=30.00)
    weekend_fee = db.Column(db.Numeric(10, 2), nullable=False, default=15.00)
    night_fee = db.Column(db.Numeric(10, 2), nullable=False, default=25.00)  # 20:00-06:00
    city_surcharge = db.Column(db.Numeric(10, 2), nullable=False, default=10.00)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Pricing base={self.base_price}>'


# ============================================================================
# Invoice Model
# ============================================================================

class Invoice(db.Model):
    __tablename__ = 'invoices'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    # invoice_number MUST strictly be consecutive according to Israeli law (ניהול ספרים)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    document_type = db.Column(db.Enum('tax_invoice_receipt', 'receipt', 'tax_invoice', 'transaction_invoice', 'credit_note', name='invoice_document_types'), nullable=False, server_default='tax_invoice_receipt')
    
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False)
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    issue_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime, nullable=True)
    
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    vat_rate = db.Column(db.Float, default=0.17, nullable=False) # 17% in Israel
    vat_amount = db.Column(db.Numeric(10, 2), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    
    status = db.Column(db.Enum('draft', 'sent', 'paid', 'overdue', 'cancelled', name='invoice_statuses'), default='draft')
    payment_method = db.Column(db.Enum('cash', 'credit_card', 'bank_transfer', 'invoice', name='payment_methods'), nullable=True)
    paid_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    
    # Relationships
    payments = db.relationship('Payment', backref='invoice', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'


# ============================================================================
# Payment Model
# ============================================================================

class Payment(db.Model):
    __tablename__ = 'payments'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.Enum('cash', 'credit_card', 'bank_transfer', 'check', name='payment_methods'), nullable=False)
    transaction_id = db.Column(db.String(100), nullable=True)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.Enum('pending', 'completed', 'failed', 'refunded', name='payment_statuses'), default='pending')
    notes = db.Column(db.Text, nullable=True)
    
    def __repr__(self):
        return f'<Payment {self.amount} - {self.status}>'


# ============================================================================
# Delivery Tracking Model
# ============================================================================

class DeliveryTracking(db.Model):
    __tablename__ = 'delivery_tracking'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id', ondelete='CASCADE'), nullable=False)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    speed = db.Column(db.Float, nullable=True)  # km/h
    heading = db.Column(db.Float, nullable=True)  # degrees
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f'<DeliveryTracking {self.delivery_id} at {self.timestamp}>'


# ============================================================================
# Rating Model
# ============================================================================

class Rating(db.Model):
    __tablename__ = 'ratings'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id', ondelete='CASCADE'), nullable=False, unique=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    rated_by = db.Column(db.Enum('customer', 'courier', 'system', name='rating_source'), default='customer', nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Rating {self.rating}/5 for delivery {self.delivery_id}>'


# ============================================================================
# Notification Model
# ============================================================================

class Notification(db.Model):
    __tablename__ = 'notifications'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id', ondelete='CASCADE'), nullable=True)
    type = db.Column(db.Enum('sms', 'email', 'push', name='notification_types'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Notification {self.title}>'



    
# ============================================================================
# Audit Log Model
# ============================================================================

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    action = db.Column(db.String(50), nullable=False) # e.g., 'LOGIN', 'VIEW_SENSITIVE', 'DECRYPT'
    resource_type = db.Column(db.String(50), nullable=True) # e.g., 'Delivery', 'User'
    resource_id = db.Column(db.String(50), nullable=True) # Use String to support non-integer IDs if needed
    ip_address = db.Column(db.String(45), nullable=True)
    status = db.Column(db.String(20), default='SUCCESS') # 'SUCCESS', 'FAILURE'
    details = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='audit_logs')

    def __repr__(self):
        return f'<AuditLog {self.action} by {self.user_id} at {self.timestamp}>'


# ============================================================================
# Token Blacklist Model — used for JWT revocation on logout + token rotation
# ============================================================================

class TokenBlacklist(db.Model):
    __tablename__ = 'token_blacklist'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<TokenBlacklist jti={self.jti}>'

    @classmethod
    def cleanup_expired(cls):
        """Delete blacklist entries whose tokens have already expired. Call daily."""
        cls.query.filter(cls.expires_at < datetime.utcnow()).delete()
        from extensions import db as _db
        _db.session.commit()




# ============================================================================
# Courier Documents Model
# ============================================================================

class CourierDocument(db.Model):
    __tablename__ = 'courier_documents'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    document_type = db.Column(db.String(50), nullable=False) # e.g., 'id_card', 'license', 'insurance', 'vehicle_license'
    file_path = db.Column(db.String(255), nullable=False)
    status = db.Column(document_status_enum, default='pending')
    expiry_date = db.Column(db.Date, nullable=True)  # For documents that expire (license, insurance)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    
    def __repr__(self):
        return f'<CourierDocument {self.document_type} for {self.courier_id}>'


# ============================================================================
# Payout Model (Freelancer Payments)
# ============================================================================

payout_status_enum = db.Enum('draft', 'approved', 'paid', 'cancelled', name='payout_status_types', metadata=db.metadata)

class Payout(db.Model):
    __tablename__ = 'payouts'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    
    period_start = db.Column(db.Date, nullable=False)
    period_end = db.Column(db.Date, nullable=False)
    
    total_deliveries = db.Column(db.Integer, default=0)
    total_amount = db.Column(db.Numeric(10, 2), default=0.00)
    
    status = db.Column(payout_status_enum, default='draft', nullable=False)
    invoice_number = db.Column(db.String(50), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime, nullable=True)
    paid_at = db.Column(db.DateTime, nullable=True)
    
    # Relationship
    courier = db.relationship('Courier', backref='payouts')
    
    def __repr__(self):
        return f'<Payout {self.id} for Courier {self.courier_id}>'


# ============================================================================
# Invitation Code Model
# ============================================================================

class InvitationCode(db.Model):
    __tablename__ = 'invitation_codes'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    target_role = db.Column(db.String(20), nullable=False) # 'courier', 'customer', 'admin'
    is_used = db.Column(db.Boolean, default=False)
    used_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    def __repr__(self):
        return f'<InvitationCode {self.code}>'


# ============================================================================
# Chat Support System
# ============================================================================

class ChatSession(db.Model):
    __tablename__ = 'chat_sessions'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False) # The customer/courier
    assigned_admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True) # Support agent
    status = db.Column(chat_status_enum, default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    closed_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    messages = db.relationship('ChatMessage', backref='session', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<ChatSession {self.id} User:{self.user_id}>'


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('chat_sessions.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ChatMessage {self.id} from {self.sender_id}>'

class Zone(db.Model):
    __tablename__ = 'zones'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    
    # Polygon coordinates stored as JSON string (list of [lat, lng])
    polygon_coords = db.Column(db.Text, nullable=False) 
    
    # Pricing Rules
    price_multiplier = db.Column(db.Float, default=1.0)
    base_price_addition = db.Column(db.Float, default=0.0)
    
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'polygon_coords': json.loads(self.polygon_coords),
            'price_multiplier': self.price_multiplier,
            'base_price_addition': self.base_price_addition,
            'is_active': self.is_active
        }


# ============================================================================
# Support Center Models
# ============================================================================

support_ticket_status_enum = db.Enum('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed', name='ticket_status_types', metadata=db.metadata)
ticket_priority_enum = db.Enum('low', 'medium', 'high', 'urgent', name='ticket_priority_types', metadata=db.metadata)

class SupportTicket(db.Model):
    __tablename__ = 'support_tickets'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('deliveries.id', ondelete='CASCADE'), nullable=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)

    subject = db.Column(db.String(200), nullable=False)
    status = db.Column(support_ticket_status_enum, default='open', nullable=False)
    priority = db.Column(ticket_priority_enum, default='medium', nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    messages = db.relationship('TicketMessage', backref='ticket', lazy='dynamic', cascade='all, delete-orphan')
    user = db.relationship('User', foreign_keys=[user_id], backref='tickets')
    assignee = db.relationship('User', foreign_keys=[assigned_to], backref='assigned_tickets')

    def __repr__(self):
        return f'<SupportTicket {self.id} - {self.subject}>'

class TicketMessage(db.Model):
    __tablename__ = 'ticket_messages'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('support_tickets.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    message = db.Column(db.Text, nullable=False)
    is_internal = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    sender = db.relationship('User', foreign_keys=[sender_id])

    def __repr__(self):
        return f'<TicketMessage {self.id} from User {self.sender_id}>'


# ============================================================================
# WMS (Warehouse Management System) Models
# ============================================================================

class Warehouse(db.Model):
    __tablename__ = 'warehouses'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255), nullable=True)
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    zones = db.relationship('StorageZone', backref='warehouse', lazy='dynamic')
    movements = db.relationship('StockMovement', backref='warehouse', lazy='dynamic')

    def __repr__(self):
        return f'<Warehouse {self.name}>'

class StorageZone(db.Model):
    __tablename__ = 'storage_zones'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey('warehouses.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False) # e.g., "Zone A", "Shelf 3", "Cooler"
    zone_type = db.Column(db.String(50), default='general') # general, cold_storage, secure
    capacity_limit = db.Column(db.Integer, nullable=True) # Max items/pallets
    
    bins = db.relationship('StorageBin', backref='zone', lazy='dynamic')
    
    def __repr__(self):
        return f'<StorageZone {self.name} in Warehouse {self.warehouse_id}>'

class StorageBin(db.Model):
    __tablename__ = 'storage_bins'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    zone_id = db.Column(db.Integer, db.ForeignKey('storage_zones.id'), nullable=False)
    bin_index = db.Column(db.String(50), nullable=False) # e.g., A1-B2-01
    
    max_volume_cm3 = db.Column(db.Integer, nullable=True) # Capacity in cubic cm
    current_volume_cm3 = db.Column(db.Integer, default=0)
    
    locations = db.relationship('ItemLocation', backref='bin', lazy='dynamic')
    
    def __repr__(self):
        return f'<StorageBin {self.bin_index}>'

class InventoryItem(db.Model):
    __tablename__ = 'inventory_items'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    barcode = db.Column(db.String(100), unique=True, nullable=True)
    
    # Stock Levels
    quantity_on_hand = db.Column(db.Integer, default=0)
    quantity_allocated = db.Column(db.Integer, default=0) # Reserved for orders
    quantity_available = db.Column(db.Integer, default=0) # on_hand - allocated
    
    # Item Dimensions
    volume_per_unit_cm3 = db.Column(db.Integer, default=0)
    
    unit_value = db.Column(db.Numeric(10, 2), default=0.00)
    min_stock_level = db.Column(db.Integer, default=10) # Alert threshold
    
    locations = db.relationship('ItemLocation', backref='item', lazy='dynamic')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def update_available(self):
        self.quantity_available = self.quantity_on_hand - self.quantity_allocated

    def __repr__(self):
        return f'<InventoryItem {self.sku} - {self.name}>'

class ItemLocation(db.Model):
    __tablename__ = 'item_locations'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('inventory_items.id'), nullable=False)
    warehouse_id = db.Column(db.Integer, db.ForeignKey('warehouses.id'), nullable=False)
    zone_id = db.Column(db.Integer, db.ForeignKey('storage_zones.id'), nullable=True)
    bin_id = db.Column(db.Integer, db.ForeignKey('storage_bins.id'), nullable=True)
    
    quantity = db.Column(db.Integer, default=0)
    
    def __repr__(self):
        return f'<ItemLocation Item:{self.item_id} Bin:{self.bin_id} Qty:{self.quantity}>'

class StockMovement(db.Model):
    __tablename__ = 'stock_movements'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('inventory_items.id'), nullable=False)
    warehouse_id = db.Column(db.Integer, db.ForeignKey('warehouses.id'), nullable=False)
    zone_id = db.Column(db.Integer, db.ForeignKey('storage_zones.id'), nullable=True)
    bin_id = db.Column(db.Integer, db.ForeignKey('storage_bins.id'), nullable=True)
    
    movement_type = db.Column(db.Enum('inbound', 'outbound', 'transfer', 'adjustment', name='movement_type_enum'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    reference_order_id = db.Column(db.Integer, db.ForeignKey('deliveries.id', ondelete='CASCADE'), nullable=True)
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    notes = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    item = db.relationship('InventoryItem', backref='movements')
    user = db.relationship('User', backref='stock_movements')

    def __repr__(self):
        return f'<StockMovement {self.movement_type} {self.quantity} of {self.item_id}>'


# ============================================================================
# CRM Models
# ============================================================================

class Lead(db.Model):
    __tablename__ = 'leads'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(100), nullable=False)
    contact_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=False)
    
    # Lead Management
    status = db.Column(lead_status_enum, default='new', nullable=False)
    source = db.Column(lead_source_enum, default='other', nullable=False)
    estimated_monthly_value = db.Column(db.Integer, default=0)  # Estimated monthly revenue
    
    # Follow-up
    next_follow_up = db.Column(db.DateTime, nullable=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)  # Sales rep
    
    # Notes
    notes = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    converted_at = db.Column(db.DateTime, nullable=True)  # When converted to customer
    converted_to_customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=True)
    
    # Relationships
    assigned_user = db.relationship('User', foreign_keys=[assigned_to], backref='assigned_leads')
    converted_customer = db.relationship('Customer', foreign_keys=[converted_to_customer_id])
    
    def __repr__(self):
        return f'<Lead {self.company_name} - {self.status}>'

class LeadActivity(db.Model):
    __tablename__ = 'lead_activities'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=False)
    activity_type = db.Column(activity_type_enum, nullable=False)
    description = db.Column(db.Text, nullable=False)
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    lead = db.relationship('Lead', backref='activities')
    user = db.relationship('User', backref='lead_activities')
    
    def __repr__(self):
        return f'<LeadActivity {self.activity_type} for Lead {self.lead_id}>'


# ============================================================================
# API Key Model (for External Integrations)
# ============================================================================

class ApiKey(db.Model):
    __tablename__ = 'api_keys'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    prefix = db.Column(db.String(8), nullable=False, index=True) # First 8 chars for lookup
    key_hash = db.Column(db.String(255), nullable=False) # Bcrypt hash of full key
    merchant_name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f'<ApiKey {self.merchant_name} ({self.prefix})>'


# ============================================================================
# API Usage Tracking Model (for Expenses Dashboard)
# ============================================================================

class ApiUsage(db.Model):
    __tablename__ = 'api_usage'
    __table_args__ = (
        db.UniqueConstraint('service_name', 'usage_date', name='uq_service_date'),
        {'extend_existing': True}
    )
    
    id = db.Column(db.Integer, primary_key=True)
    service_name = db.Column(db.String(50), nullable=False)  # 'google_places', 'nominatim', 'hosting', etc.
    usage_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    
    call_count = db.Column(db.Integer, default=0)
    cost_per_call = db.Column(db.Float, default=0.0)  # Cost in USD per call
    total_cost = db.Column(db.Float, default=0.0)  # Calculated total cost
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<ApiUsage {self.service_name} {self.usage_date}: {self.call_count} calls, ${self.total_cost}>'


# ============================================================================
# Phase 3: Legal Deliveries & HR Models
# ============================================================================

class LegalDeliveryEvidence(db.Model):
    __tablename__ = 'legal_delivery_evidence'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Mandatory Geolocation + Timestamp at time of signature
    signed_lat = db.Column(db.Float, nullable=False)
    signed_lng = db.Column(db.Float, nullable=False)
    signed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Digital Signature Reference (hash or ID from external service like DocuSign)
    digital_signature_id = db.Column(db.String(255), nullable=True)
    chain_of_custody_log = db.Column(db.Text, nullable=True) # JSON array of handlers and times
    
    delivery = db.relationship('Delivery', backref=db.backref('legal_evidence', uselist=False))

    def __repr__(self):
        return f'<LegalDeliveryEvidence Delivery:{self.delivery_id}>'

class InsurancePolicy(db.Model):
    __tablename__ = 'insurance_policies'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    policy_type = db.Column(db.Enum('vehicle', 'professional_liability', name='insurance_policy_types'), nullable=False)
    provider_name = db.Column(db.String(100), nullable=False)
    policy_number = db.Column(db.String(100), nullable=False)
    
    valid_from = db.Column(db.Date, nullable=False)
    first_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=True)
    
    # Financial/Regulatory Fields
    tax_id = db.Column(db.String(20), nullable=True)  # H.P or C.N
    withholding_tax_rate = db.Column(db.Float, default=0.0) # ניכוי מס במקור
    withholding_expiry = db.Column(db.Date, nullable=True)
    
    is_available = db.Column(db.Boolean, default=False)
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    courier = db.relationship('Courier', backref='insurance_policies')

    def __repr__(self):
        return f'<InsurancePolicy {self.policy_type} for Courier:{self.courier_id}>'

class EmploymentContract(db.Model):
    __tablename__ = 'employment_contracts'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    contract_type = db.Column(db.Enum('freelance', 'employee', name='contract_types'), nullable=False)
    
    document_url = db.Column(db.String(255), nullable=False)
    digital_signature_id = db.Column(db.String(255), nullable=True)
    
    signed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    courier = db.relationship('Courier', backref='employment_contracts')

    def __repr__(self):
        return f'<EmploymentContract {self.contract_type} for Courier:{self.courier_id}>'

# ============================================================================
# Phase 4: B2B CRM Pricing Overrides
# ============================================================================

class CustomerPricingOverride(db.Model):
    __tablename__ = 'customer_pricing_overrides'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Specific Overrides (Leave null to fallback to global Pricing)
    base_price = db.Column(db.Numeric(10, 2), nullable=True)
    price_per_km = db.Column(db.Numeric(10, 2), nullable=True)
    price_per_kg = db.Column(db.Numeric(10, 2), nullable=True)
    
    # Blanket discount (e.g. 0.10 for 10% off)
    discount_percentage = db.Column(db.Float, default=0.0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    customer = db.relationship('Customer', backref=db.backref('pricing_override', uselist=False))

    def __repr__(self):
        return f'<CustomerPricingOverride Customer:{self.customer_id}>'

# ============================================================================
# Phase 7: Regulatory Reports & Traffic Compliance
# ============================================================================

class Expense(db.Model):
    __tablename__ = 'expenses'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(255), nullable=False)
    
    # Linked to Courier (Contributor/Supplier)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=True)
    # Optional link to Customer (Client-related expense)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=True)
    
    # Breakdown for PCN 874 / Israeli Tax
    base_amount = db.Column(db.Numeric(10, 2), nullable=False) # Without VAT
    vat_amount = db.Column(db.Numeric(10, 2), default=0.0)
    withholding_tax_deducted = db.Column(db.Numeric(10, 2), default=0.0) # Tax deducted by us (for contractors)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False) # Final paid amount (base + vat - withholding)
    
    expense_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    category = db.Column(db.String(100), nullable=True)
    vendor_name = db.Column(db.String(100), nullable=True)
    payment_method = db.Column(db.String(50), nullable=True) # Cash, Bank Transfer, Credit Card
    receipt_url = db.Column(db.String(255), nullable=True)
    is_contractor_invoice = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    courier = db.relationship('Courier', backref=db.backref('agent_expenses', lazy='dynamic'))
    customer = db.relationship('Customer', backref=db.backref('customer_expenses', lazy='dynamic'))

    def __repr__(self):
        return f'<Expense {self.id}: {self.description} - {self.total_amount}>'

class FinanceDocument(db.Model):
    __tablename__ = 'finance_documents'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)

    doc_type = db.Column(db.String(100), nullable=False)  # expense_receipt, income_receipt, tax_report, debt_notice, etc.
    authority = db.Column(db.String(100), nullable=True)  # e.g. tax_authority, national_insurance
    submitted_by = db.Column(db.String(50), nullable=True)  # self, accountant, lawyer, other
    entity_type = db.Column(db.String(50), nullable=True)  # sole_prop, llc, etc.
    status = db.Column(db.String(50), default='archived')  # draft, submitted, accepted, rejected, overdue, archived

    year = db.Column(db.Integer, nullable=True)
    period = db.Column(db.String(50), nullable=True)  # monthly/quarterly/annual label
    due_date = db.Column(db.Date, nullable=True)
    filed_date = db.Column(db.Date, nullable=True)
    amount_due = db.Column(db.Numeric(12, 2), nullable=True)

    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    mime_type = db.Column(db.String(100), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)

    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<FinanceDocument {self.id} {self.doc_type} {self.title}>'

class TrafficScore(db.Model):
    __tablename__ = 'traffic_scores'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    points = db.Column(db.Integer, default=0)
    violation_type = db.Column(db.String(100), nullable=False) # e.g. "Speeding", "Red Light"
    violation_date = db.Column(db.DateTime, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    courier = db.relationship('Courier', backref=db.backref('traffic_records', lazy='dynamic'))

    def __repr__(self):
        return f'<TrafficScore {self.points}pts Courier:{self.courier_id}>'

class LegalCase(db.Model):
    __tablename__ = 'legal_cases'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=False)
    case_number = db.Column(db.String(100), unique=True, nullable=False)
    status = db.Column(db.Enum('open', 'in_progress', 'closed', name='legal_case_status'), default='open')
    description = db.Column(db.Text, nullable=False)
    lawyer_assigned = db.Column(db.String(255), nullable=True)
    court_date = db.Column(db.DateTime, nullable=True)
    documents_url = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    courier = db.relationship('Courier', backref=db.backref('legal_cases', lazy='dynamic'))

    def __repr__(self):
        return f'<LegalCase {self.case_number} Courier:{self.courier_id}>'

# ============================================================================
# Phase 9: Advanced Route Builder 2.0
# ============================================================================

class SavedRoute(db.Model):
    __tablename__ = 'saved_routes'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    status = db.Column(db.Enum('draft', 'published', 'assigned', 'completed', name='route_status'), default='draft')
    
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id', ondelete='CASCADE'), nullable=True)
    scheduled_at = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    stops = db.relationship('RouteStop', backref='route', lazy='dynamic', cascade='all, delete-orphan', order_by='RouteStop.sequence_number')
    courier = db.relationship('Courier', backref=db.backref('assigned_saved_routes', lazy='dynamic'))

    def __repr__(self):
        return f'<SavedRoute {self.name} Status:{self.status}>'

class RouteStop(db.Model):
    __tablename__ = 'route_stops'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    route_id = db.Column(db.Integer, db.ForeignKey('saved_routes.id'), nullable=False)
    sequence_number = db.Column(db.Integer, nullable=False)
    
    address = db.Column(db.String(255), nullable=False) # Full address
    city = db.Column(db.String(100), nullable=True)
    street = db.Column(db.String(200), nullable=True)
    building_number = db.Column(db.String(10), nullable=True)
    floor = db.Column(db.String(10), nullable=True)
    apartment = db.Column(db.String(10), nullable=True)
    
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    
    contact_name = db.Column(db.String(100), nullable=True)
    contact_phone = db.Column(db.String(20), nullable=True)
    
    note = db.Column(db.Text, nullable=True)
    time_window_start = db.Column(db.DateTime, nullable=True)
    time_window_end = db.Column(db.DateTime, nullable=True)
    
    # Optional link to an existing order
    order_id = db.Column(db.Integer, db.ForeignKey('deliveries.id', ondelete='CASCADE'), nullable=True)
    
    stop_type = db.Column(db.Enum('pickup', 'delivery', 'waypoint', name='stop_type'), default='delivery')
    is_completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f'<RouteStop {self.sequence_number} Route:{self.route_id} Address:{self.address}>'

class CompanySettings(db.Model):
    __tablename__ = 'company_settings'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    legal_name = db.Column(db.String(100), nullable=False)
    tax_id = db.Column(db.String(20), nullable=False) # H.P
    address = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(100), nullable=True)
    
    # Reporting Settings
    vat_reporting_frequency = db.Column(db.String(20), default='monthly') # monthly, bimonthly
    income_tax_advance_rate = db.Column(db.Float, default=0.0)
    
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<CompanySettings {self.legal_name}>'

# ============================================================================
# Protocol & Academy Models
# ============================================================================

class DeliveryProtocolTemplate(db.Model):
    __tablename__ = 'delivery_protocol_templates'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(1), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    steps = db.Column(db.JSON, nullable=False) # JSON list of steps

class DeliveryProtocolConfig(db.Model):
    __tablename__ = 'delivery_protocol_configs'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    base_protocol = db.Column(db.String(1), db.ForeignKey('delivery_protocol_templates.code'))
    
    requires_id_verification = db.Column(db.Boolean, default=False)
    requires_photo = db.Column(db.Boolean, default=True)
    requires_signature = db.Column(db.Boolean, default=True)
    requires_otp = db.Column(db.Boolean, default=False)
    otp_alternatives = db.Column(db.JSON, nullable=True) # JSON list of alternatives
    
    max_attempts = db.Column(db.Integer, default=1)
    return_document_required = db.Column(db.Boolean, default=False)
    multi_stop_allowed = db.Column(db.Boolean, default=False)
    chain_of_custody = db.Column(db.Boolean, default=False)
    
    pricing_tier = db.Column(db.Integer, default=1)
    pricing_multiplier = db.Column(db.Numeric(4, 2), default=1.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AcademyProtocolCourse(db.Model):
    __tablename__ = 'academy_protocol_courses'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    protocol_slug = db.Column(db.String(100), db.ForeignKey('delivery_protocol_configs.slug'))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    estimated_minutes = db.Column(db.Integer, default=15)
    passing_score = db.Column(db.Integer, default=80)
    required_level = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AcademyProtocolLesson(db.Model):
    __tablename__ = 'academy_protocol_lessons'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('academy_protocol_courses.id'))
    order_index = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False) # Markdown
    lesson_type = db.Column(db.String(50)) # theory, legal, practical, quiz
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AcademyProtocolProgress(db.Model):
    __tablename__ = 'academy_protocol_progress'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id'))
    course_id = db.Column(db.Integer, db.ForeignKey('academy_protocol_courses.id'))
    status = db.Column(db.String(20), default='not_started') # not_started, in_progress, passed, failed
    score = db.Column(db.Integer, nullable=True)
    attempts = db.Column(db.Integer, default=0)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    __table_args__ = (
        db.UniqueConstraint('courier_id', 'course_id', name='unique_courier_course_progress'),
        {'extend_existing': True}
    )

class AcademyProtocolQuizQuestion(db.Model):
    __tablename__ = 'academy_protocol_quiz_questions'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('academy_protocol_courses.id', ondelete='CASCADE'))
    order_index = db.Column(db.Integer, nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    option_1 = db.Column(db.Text, nullable=False)
    option_2 = db.Column(db.Text, nullable=False)
    option_3 = db.Column(db.Text, nullable=False)
    option_4 = db.Column(db.Text, nullable=False)
    correct_option = db.Column(db.Integer, nullable=False) # 1, 2, 3, or 4
    explanation = db.Column(db.Text) # shown after answer
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ============================================================================
# Customer Wallet & Wallet Transaction Models
# ============================================================================

class CustomerWallet(db.Model):
    __tablename__ = 'customer_wallets'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False, unique=True)
    balance = db.Column(db.Numeric(10, 2), default=0.00)
    currency = db.Column(db.String(3), default='ILS')
    last_topup_at = db.Column(db.DateTime, nullable=True)
    is_frozen = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    transactions = db.relationship('WalletTransaction', backref='wallet', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<CustomerWallet customer={self.customer_id} balance={self.balance}>'

class WalletTransaction(db.Model):
    __tablename__ = 'wallet_transactions'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    wallet_id = db.Column(db.Integer, db.ForeignKey('customer_wallets.id', ondelete='CASCADE'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    transaction_type = db.Column(db.Enum('topup', 'payment', 'refund', 'adjustment', name='wallet_transaction_types'), nullable=False)
    payment_method = db.Column(db.String(50), nullable=True) # smartbee, manual, system
    reference_id = db.Column(db.String(100), nullable=True) # Order ID or SmartBee Transaction ID
    status = db.Column(db.String(20), default='completed') # pending, completed, failed
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<WalletTransaction wallet={self.wallet_id} amount={self.amount} type={self.transaction_type}>'
