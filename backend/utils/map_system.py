import sqlite3
import requests
from datetime import datetime
import json
import os
import time
from typing import Optional, Tuple, Dict, List

class DeliveryMapSystem:
    def __init__(self, db_path=None):
        if db_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(base_dir, 'database', 'deliveries.db')
        
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.create_tables()
        self.last_request_time = 0
    
    def create_tables(self):
        cursor = self.conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                street TEXT NOT NULL,
                city TEXT NOT NULL,
                postal_code TEXT,
                latitude REAL,
                longitude REAL,
                geocode_success INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS deliveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address_id INTEGER,
                customer_name TEXT NOT NULL,
                phone TEXT,
                delivery_size TEXT DEFAULT 'small',
                status TEXT DEFAULT 'pending',
                distance_km REAL,
                estimated_time_min INTEGER,
                base_price REAL,
                size_price REAL,
                total_price REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (address_id) REFERENCES addresses (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS routes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_lat REAL NOT NULL,
                from_lon REAL NOT NULL,
                to_lat REAL NOT NULL,
                to_lon REAL NOT NULL,
                distance_km REAL,
                duration_min INTEGER,
                route_data TEXT,
                cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_routes_coords 
            ON routes(from_lat, from_lon, to_lat, to_lon)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_deliveries_status 
            ON deliveries(status)
        ''')
        
        self.conn.commit()
    
    def _wait_for_rate_limit(self, wait_seconds=1.5):
        elapsed = time.time() - self.last_request_time
        if elapsed < wait_seconds:
            time.sleep(wait_seconds - elapsed)
        self.last_request_time = time.time()
    
    def geocode_address(self, street: str, city: str, country: str = "Israel") -> Tuple[Optional[float], Optional[float]]:
        self._wait_for_rate_limit()
        
        base_url = "https://nominatim.openstreetmap.org/search"
        
        params = {
            'street': street,
            'city': city,
            'country': country,
            'format': 'json',
            'limit': 1,
            'addressdetails': 1
        }
        
        headers = {
            'User-Agent': 'DeliveryMapSystem/1.0'
        }
        
        try:
            response = requests.get(base_url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                return lat, lon
            return None, None
                
        except Exception as e:
            print(f"שגיאה ב-geocoding: {e}")
            return None, None
    
    def search_addresses(self, query: str, limit: int = 5) -> List[Dict]:
        self._wait_for_rate_limit()
        
        base_url = "https://nominatim.openstreetmap.org/search"
        
        params = {
            'q': query,
            'country': 'Israel',
            'format': 'json',
            'limit': limit,
            'addressdetails': 1
        }
        
        headers = {
            'User-Agent': 'DeliveryMapSystem/1.0'
        }
        
        try:
            response = requests.get(base_url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for item in data:
                address = item.get('address', {})
                results.append({
                    'display_name': item.get('display_name', ''),
                    'street': address.get('road', ''),
                    'city': address.get('city', address.get('town', address.get('village', ''))),
                    'lat': float(item['lat']),
                    'lon': float(item['lon'])
                })
            
            return results
            
        except Exception as e:
            print(f"שגיאה בחיפוש כתובות: {e}")
            return []
    
    def add_address(self, street: str, city: str, postal_code: Optional[str] = None) -> Optional[int]:
        lat, lon = self.geocode_address(street, city)
        
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO addresses (street, city, postal_code, latitude, longitude, geocode_success)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (street, city, postal_code, lat, lon, 1 if lat and lon else 0))
        
        self.conn.commit()
        return cursor.lastrowid
    
    def calculate_route(self, from_lat: float, from_lon: float, 
                       to_lat: float, to_lon: float) -> Optional[Dict]:
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT distance_km, duration_min, route_data
            FROM routes
            WHERE abs(from_lat - ?) < 0.0001 
            AND abs(from_lon - ?) < 0.0001
            AND abs(to_lat - ?) < 0.0001 
            AND abs(to_lon - ?) < 0.0001
            AND datetime(cached_at) > datetime('now', '-7 days')
        ''', (from_lat, from_lon, to_lat, to_lon))
        
        cached = cursor.fetchone()
        if cached:
            return {
                'distance_km': cached[0],
                'duration_min': cached[1],
                'route_data': json.loads(cached[2]) if cached[2] else None
            }
        
        url = f"http://router.project-osrm.org/route/v1/driving/{from_lon},{from_lat};{to_lon},{to_lat}"
        params = {
            'overview': 'full',
            'geometries': 'geojson',
            'steps': 'true'
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('code') == 'Ok' and data.get('routes'):
                route = data['routes'][0]
                distance_km = route['distance'] / 1000
                duration_min = route['duration'] / 60
                
                cursor.execute('''
                    INSERT INTO routes 
                    (from_lat, from_lon, to_lat, to_lon, distance_km, duration_min, route_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (from_lat, from_lon, to_lat, to_lon, distance_km, duration_min, 
                      json.dumps(route['geometry'])))
                
                self.conn.commit()
                
                return {
                    'distance_km': distance_km,
                    'duration_min': duration_min,
                    'route_data': route['geometry']
                }
            return None
                
        except Exception as e:
            print(f"שגיאה בחישוב מסלול: {e}")
            return None
    
    def calculate_price(self, distance_km: float, size: str = 'small', 
                       base_price: float = 20, price_per_km: float = 10) -> Dict:
        size_prices = {
            'small': 0,
            'medium': 20,
            'large': 50
        }
        
        size_price = size_prices.get(size, 0)
        delivery_price = base_price + (distance_km * price_per_km)
        total = delivery_price + size_price
        
        return {
            'base_price': delivery_price,
            'size_price': size_price,
            'total_price': total
        }
    
    def create_delivery(self, address_id: int, customer_name: str, 
                       phone: str = None, delivery_size: str = 'small',
                       warehouse_lat: float = 32.0853, 
                       warehouse_lon: float = 34.7818) -> Optional[int]:
        cursor = self.conn.cursor()
        
        cursor.execute('SELECT latitude, longitude FROM addresses WHERE id = ?', (address_id,))
        address = cursor.fetchone()
        
        if not address or not address['latitude'] or not address['longitude']:
            return None
        
        route = self.calculate_route(
            warehouse_lat, warehouse_lon, 
            address['latitude'], address['longitude']
        )
        
        if not route:
            return None
        
        prices = self.calculate_price(route['distance_km'], delivery_size)
        
        cursor.execute('''
            INSERT INTO deliveries 
            (address_id, customer_name, phone, delivery_size, distance_km, 
             estimated_time_min, base_price, size_price, total_price, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ''', (address_id, customer_name, phone, delivery_size, route['distance_km'], 
              route['duration_min'], prices['base_price'], prices['size_price'], 
              prices['total_price']))
        
        self.conn.commit()
        return cursor.lastrowid
    
    def get_pending_deliveries(self) -> List[sqlite3.Row]:
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT d.id, d.customer_name, d.phone, a.street, a.city, 
                   d.distance_km, d.estimated_time_min, d.total_price, 
                   d.delivery_size, d.status, a.latitude, a.longitude
            FROM deliveries d
            JOIN addresses a ON d.address_id = a.id
            WHERE d.status = 'pending'
            ORDER BY d.created_at
        ''')
        
        return cursor.fetchall()
    
    def update_delivery_status(self, delivery_id: int, status: str) -> bool:
        cursor = self.conn.cursor()
        cursor.execute('UPDATE deliveries SET status = ? WHERE id = ?', (status, delivery_id))
        self.conn.commit()
        return cursor.rowcount > 0
    
    def close(self):
        if self.conn:
            self.conn.close()