from app import create_app
from extensions import db
from models import Warehouse, StorageZone, StorageBin, InventoryItem

app = create_app()

with app.app_context():
    # 1. Ensure at least one Warehouse exists
    wh = Warehouse.query.first()
    if not wh:
        wh = Warehouse(name="Tel Aviv Main Hub", address="Yigal Alon 98, Tel Aviv")
        db.session.add(wh)
        db.session.commit()
    
    # 2. Ensure Zones exist
    zone_a = StorageZone.query.filter_by(warehouse_id=wh.id, name="Zone A (Electronics)").first()
    if not zone_a:
        zone_a = StorageZone(warehouse_id=wh.id, name="Zone A (Electronics)", zone_type="general")
        db.session.add(zone_a)
        
    zone_b = StorageZone.query.filter_by(warehouse_id=wh.id, name="Zone B (Apparel)").first()
    if not zone_b:
        zone_b = StorageZone(warehouse_id=wh.id, name="Zone B (Apparel)", zone_type="general")
        db.session.add(zone_b)
        
    db.session.commit()
    
    # 3. Ensure Bins exist in Zone A
    if zone_a.bins.count() == 0:
        db.session.add(StorageBin(zone_id=zone_a.id, bin_index="A1-01", max_volume_cm3=50000))
        db.session.add(StorageBin(zone_id=zone_a.id, bin_index="A1-02", max_volume_cm3=50000))
        db.session.add(StorageBin(zone_id=zone_a.id, bin_index="A2-01", max_volume_cm3=80000))
    
    # 4. Ensure Bins exist in Zone B
    if zone_b.bins.count() == 0:
        db.session.add(StorageBin(zone_id=zone_b.id, bin_index="B1-01", max_volume_cm3=120000))
        db.session.add(StorageBin(zone_id=zone_b.id, bin_index="B1-02", max_volume_cm3=120000))
    
    db.session.commit()
    
    print("WMS Seed Data (Warehouses, Zones, Bins) generated successfully.")
