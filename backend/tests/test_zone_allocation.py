import unittest
from unittest.mock import MagicMock, patch
import json
import logging
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

class TestZoneAllocation(unittest.TestCase):
    def setUp(self):
        # Configure logging
        logging.basicConfig(level=logging.DEBUG)
        
        # Mocking the models and db for the engine
        self.mock_zone = MagicMock()
        self.mock_zone.id = 1
        self.mock_zone.name = "Tel Aviv Center"
        self.mock_zone.polygon_coords = json.dumps([
            {"lat": 32.0, "lng": 34.0},
            {"lat": 32.1, "lng": 34.0},
            {"lat": 32.1, "lng": 34.1},
            {"lat": 32.0, "lng": 34.1}
        ])
        self.mock_zone.is_active = True

        self.mock_courier_in = MagicMock()
        self.mock_courier_in.id = 101
        self.mock_courier_in.full_name = "Courier Inside"
        self.mock_courier_in.current_location_lat = 32.05
        self.mock_courier_in.current_location_lng = 34.05
        self.mock_courier_in.is_available = True
        self.mock_courier_in.onboarding_status = 'approved'
        self.mock_courier_in.vehicle_type = 'car'
        self.mock_courier_in.performance_index = 90
        self.mock_courier_in.certifications = []
        self.mock_courier_in.gamification = None

        self.mock_courier_out = MagicMock()
        self.mock_courier_out.id = 102
        self.mock_courier_out.full_name = "Courier Outside"
        self.mock_courier_out.current_location_lat = 32.15
        self.mock_courier_out.current_location_lng = 34.05
        self.mock_courier_out.is_available = True
        self.mock_courier_out.onboarding_status = 'approved'
        self.mock_courier_out.vehicle_type = 'car'
        self.mock_courier_out.performance_index = 95
        self.mock_courier_out.certifications = []
        self.mock_courier_out.gamification = None

        self.mock_delivery = MagicMock()
        self.mock_delivery.order_number = "ORD-TEST-001"
        self.mock_delivery.pickup_point.address.latitude = 32.02
        self.mock_delivery.pickup_point.address.longitude = 34.02
        self.mock_delivery.package_size = 'medium'
        self.mock_delivery.delivery_type = 'standard'
        # Keep legacy allocation tests independent from academy protocol DB context.
        self.mock_delivery.protocol_slug = None

    @patch('utils.allocation_engine.Zone')
    @patch('utils.allocation_engine.Courier')
    @patch('utils.allocation_engine.GoogleMapsService.get_distance_matrix')
    @patch('utils.allocation_engine.db')
    def test_courier_inside_zone_selected(self, mock_db, mock_matrix, mock_courier_cls, mock_zone_cls):
        from utils.allocation_engine import AllocationEngine
        
        # Setup mocks
        mock_zone_cls.query.filter_by.return_value.all.return_value = [self.mock_zone]
        mock_courier_cls.query.filter_by.return_value.all.return_value = [self.mock_courier_in, self.mock_courier_out]
        mock_matrix.return_value = None

        # Act
        result = AllocationEngine.find_best_courier(self.mock_delivery)

        # Assert
        self.assertIsNotNone(result)
        self.assertEqual(result.id, self.mock_courier_in.id)

    @patch('utils.allocation_engine.Zone')
    @patch('utils.allocation_engine.Courier')
    @patch('utils.allocation_engine.db')
    def test_no_couriers_in_zone_returns_none(self, mock_db, mock_courier_cls, mock_zone_cls):
        from utils.allocation_engine import AllocationEngine
        
        # Setup mocks
        mock_zone_cls.query.filter_by.return_value.all.return_value = [self.mock_zone]
        mock_courier_cls.query.filter_by.return_value.all.return_value = [self.mock_courier_out]

        # Act
        result = AllocationEngine.find_best_courier(self.mock_delivery)

        # Assert
        self.assertIsNone(result)

    @patch('utils.allocation_engine.Zone')
    @patch('utils.allocation_engine.Courier')
    @patch('utils.allocation_engine.GoogleMapsService.get_distance_matrix')
    @patch('utils.allocation_engine.db')
    def test_no_zone_for_pickup_falls_back_to_radius(self, mock_db, mock_matrix, mock_courier_cls, mock_zone_cls):
        from utils.allocation_engine import AllocationEngine
        
        # Move pickup point outside all zones BUT within radius (30km) of courier_out
        # Courier_out is at (32.15, 34.05). Let's put pickup at (32.16, 34.06) (~1.5km away)
        self.mock_delivery.pickup_point.address.latitude = 32.16
        self.mock_delivery.pickup_point.address.longitude = 34.06
        
        # Setup mocks
        mock_zone_cls.query.filter_by.return_value.all.return_value = [self.mock_zone]
        mock_courier_cls.query.filter_by.return_value.all.return_value = [self.mock_courier_out]
        mock_matrix.return_value = None

        # Act
        with self.assertLogs('utils.allocation_engine', level='WARNING') as cm:
            result = AllocationEngine.find_best_courier(self.mock_delivery)
        
        # Assert
        self.assertIsNotNone(result)
        self.assertEqual(result.id, self.mock_courier_out.id)
        self.assertTrue(any("Falling back to radius-based allocation" in output for output in cm.output))

    def test_point_in_polygon_unit(self):
        from utils.allocation_engine import AllocationEngine
        
        # Rectangle covering [0,0] to [10,10]
        # Coordinates in order: (0,0), (10,0), (10,10), (0,10)
        # Note: polygon_coords in code use 'lat'/'lng' keys
        poly = [
            {"lat": 0, "lng": 0},
            {"lat": 10, "lng": 0},
            {"lat": 10, "lng": 10},
            {"lat": 0, "lng": 10}
        ]
        
        # Inside (lat 5, lng 5)
        self.assertTrue(AllocationEngine._is_point_in_polygon(5, 5, poly))
        # Outside (lat 15, lng 5)
        self.assertFalse(AllocationEngine._is_point_in_polygon(15, 5, poly))
        # Empty
        self.assertFalse(AllocationEngine._is_point_in_polygon(5, 5, []))

if __name__ == "__main__":
    unittest.main()
