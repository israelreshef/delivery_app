
# ============================================================================
# CRM Models
# ============================================================================

class Lead(db.Model):
    __tablename__ = 'leads'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    company_name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=False)
    
    status = db.Column(lead_status_enum, default='new', nullable=False)
    source = db.Column(lead_source_enum, default='other', nullable=False)
    estimated_value = db.Column(db.Numeric(10, 2), default=0.00)
    
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    activities = db.relationship('SalesActivity', backref='lead', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Lead {self.first_name} {self.last_name}>'

class SalesActivity(db.Model):
    __tablename__ = 'sales_activities'
    
    id = db.Column(db.Integer, primary_key=True)
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    type = db.Column(activity_type_enum, nullable=False)
    summary = db.Column(db.Text, nullable=True)
    
    scheduled_at = db.Column(db.DateTime, default=datetime.utcnow) # Can be past (logged) or future (scheduled)
    is_completed = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<SalesActivity {self.type} for Lead {self.lead_id}>'
