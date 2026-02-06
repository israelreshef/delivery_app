
# ============================================================================
# WMS (Warehouse Management System) Models
# ============================================================================

class Warehouse(db.Model):
    __tablename__ = 'warehouses'
    
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
    
    id = db.Column(db.Integer, primary_key=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey('warehouses.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False) # e.g., "Zone A", "Shelf 3", "Cooler"
    zone_type = db.Column(db.String(50), default='general') # general, cold_storage, secure
    capacity_limit = db.Column(db.Integer, nullable=True) # Max items/pallets
    
    def __repr__(self):
        return f'<StorageZone {self.name} in Warehouse {self.warehouse_id}>'

class InventoryItem(db.Model):
    __tablename__ = 'inventory_items'
    
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
