from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from geoalchemy2 import Geometry

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Security Fields
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    
    # GDPR / Privacy Consent
    terms_accepted_at = db.Column(db.DateTime, nullable=True)
    privacy_policy_accepted_at = db.Column(db.DateTime, nullable=True)
    
    # Two-Factor Authentication (OTP)
    two_factor_secret = db.Column(db.String(32), nullable=True)
    is_two_factor_enabled = db.Column(db.Boolean, default=False)
    two_factor_enforced_by_admin = db.Column(db.Boolean, default=False)
    
    # Relationships
    customer = db.relationship('Customer', backref='user', uselist=False, cascade='all, delete-orphan')
    courier = db.relationship('Courier', backref='user', uselist=False, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        # Using specific method for stronger security (pbkdf2:sha256 with 600,000 iterations)
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256:600000')
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class WebAuthnCredential(db.Model):
    __tablename__ = 'webauthn_credentials'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    full_name = db.Column(db.String(100), nullable=False)
    company_name = db.Column(db.String(100), nullable=True)
    business_id = db.Column(db.String(20), nullable=True) # H.P. / Company ID
    contact_person = db.Column(db.String(100), nullable=True) # Name of contact if company
    default_address = db.Column(db.Text, nullable=True)
    billing_address = db.Column(db.Text, nullable=True)
    credit_limit = db.Column(db.Numeric(10, 2), default=0.00)
    balance = db.Column(db.Numeric(10, 2), default=0.00)
    rating = db.Column(db.Float, default=5.0)
    total_orders = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    deliveries = db.relationship('Delivery', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    invoices = db.relationship('Invoice', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    ratings = db.relationship('Rating', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Customer {self.full_name}>'


# ============================================================================
# Courier Model
# ============================================================================

class Courier(db.Model):
    __tablename__ = 'couriers'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
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
    national_id = db.Column(db.String(20), nullable=True) # Teudat Zehut
    drivers_license_number = db.Column(db.String(20), nullable=True)
    insurance_policy_number = db.Column(db.String(50), nullable=True)
    is_freelance_declared = db.Column(db.Boolean, default=False)
    onboarding_status = db.Column(onboarding_status_enum, default='new')
    rejection_reason = db.Column(db.Text, nullable=True)
    
    rating = db.Column(db.Float, default=5.0)
    total_deliveries = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    deliveries = db.relationship('Delivery', backref='courier', lazy='dynamic')
    tracking = db.relationship('DeliveryTracking', backref='courier', lazy='dynamic', cascade='all, delete-orphan')
    ratings = db.relationship('Rating', backref='courier', lazy='dynamic', cascade='all, delete-orphan')
    documents = db.relationship('CourierDocument', backref='courier', lazy='dynamic', cascade='all, delete-orphan')
    
    __table_args__ = (
        db.Index('idx_courier_available', 'is_available'),
        db.Index('idx_courier_location', 'current_location_lat', 'current_location_lng'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f'<Courier {self.full_name}>'


# ============================================================================
# Address Model
# ============================================================================

class Address(db.Model):
    __tablename__ = 'addresses'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Optional: address can be global or user-specific
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
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id'), nullable=True)
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
    pod_recipient_id = db.Column(db.String(20), nullable=True) # Required for legal documents
    pod_location_lat = db.Column(db.Float, nullable=True) # GPS at moment of signature
    pod_location_lng = db.Column(db.Float, nullable=True)
    
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
        db.Index('idx_delivery_customer', 'customer_id'),
        db.Index('idx_delivery_points', 'pickup_point_id', 'delivery_point_id'),
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
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id'), nullable=False)
    status = db.Column(delivery_status_enum, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    location_lat = db.Column(db.Float, nullable=True)
    location_lng = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
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
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id'), nullable=False, unique=True)
    
    issue_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime, nullable=True)
    
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
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
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id'), nullable=False)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id'), nullable=False)
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
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id'), nullable=False, unique=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id'), nullable=False)
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id'), nullable=True)
    type = db.Column(db.Enum('sms', 'email', 'push', name='notification_types'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.Index('idx_notif_user_read', 'user_id', 'is_read'),
        {'extend_existing': True}
    )
    
    def __repr__(self):
        return f'<Notification {self.title}>'



    
# ============================================================================
# Audit Log Model
# ============================================================================

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
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
# Courier Documents Model
# ============================================================================

class CourierDocument(db.Model):
    __tablename__ = 'courier_documents'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id'), nullable=False)
    document_type = db.Column(db.String(50), nullable=False) # e.g., 'id_card', 'license', 'insurance', 'vehicle_license'
    file_path = db.Column(db.String(255), nullable=False)
    status = db.Column(document_status_enum, default='pending')
    expiry_date = db.Column(db.Date, nullable=True)  # For documents that expire (license, insurance)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
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
    courier_id = db.Column(db.Integer, db.ForeignKey('couriers.id'), nullable=False)
    
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
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    target_role = db.Column(db.String(20), nullable=False) # 'courier', 'customer', 'admin'
    is_used = db.Column(db.Boolean, default=False)
    used_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False) # The customer/courier
    assigned_admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Support agent
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
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('deliveries.id'), nullable=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    subject = db.Column(db.String(200), nullable=False)
    status = db.Column(support_ticket_status_enum, default='open', nullable=False)
    priority = db.Column(ticket_priority_enum, default='medium', nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    messages = db.relationship('TicketMessage', backref='ticket', lazy='dynamic', cascade='all, delete-orphan')
    user = db.relationship('User', foreign_keys=[user_id], backref='tickets')
    assignee = db.relationship('User', foreign_keys=[assigned_to], backref='assigned_tickets')

    __table_args__ = (
        db.Index('idx_ticket_status', 'status'),
        db.Index('idx_ticket_user', 'user_id'),
        db.Index('idx_ticket_assigned', 'assigned_to'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f'<SupportTicket {self.id} - {self.subject}>'

class TicketMessage(db.Model):
    __tablename__ = 'ticket_messages'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('support_tickets.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

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
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
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
    
    def __repr__(self):
        return f'<StorageZone {self.name} in Warehouse {self.warehouse_id}>'

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
    
    unit_value = db.Column(db.Numeric(10, 2), default=0.00)
    min_stock_level = db.Column(db.Integer, default=10) # Alert threshold
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def update_available(self):
        self.quantity_available = self.quantity_on_hand - self.quantity_allocated

    def __repr__(self):
        return f'<InventoryItem {self.sku} - {self.name}>'

class StockMovement(db.Model):
    __tablename__ = 'stock_movements'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('inventory_items.id'), nullable=False)
    warehouse_id = db.Column(db.Integer, db.ForeignKey('warehouses.id'), nullable=False)
    zone_id = db.Column(db.Integer, db.ForeignKey('storage_zones.id'), nullable=True)
    
    movement_type = db.Column(db.Enum('inbound', 'outbound', 'transfer', 'adjustment', name='movement_type_enum'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    reference_order_id = db.Column(db.Integer, db.ForeignKey('deliveries.id'), nullable=True)
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
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
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Sales rep
    
    # Notes
    notes = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    converted_at = db.Column(db.DateTime, nullable=True)  # When converted to customer
    converted_to_customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    
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
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
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
