from datetime import datetime
import logging
from decimal import Decimal, ROUND_HALF_UP

logger = logging.getLogger(__name__)

class PricingEngine:
    # Base rates
    BASE_RATE_PER_KM = Decimal('4.00')
    MINIMUM_BASE_PRICE = Decimal('45.00')
    
    # Large distance discount (over 50km)
    LONG_DISTANCE_RATE_PER_KM = Decimal('3.00')

    # Multipliers
    URGENCY_MULTIPLIERS = {
        'standard': 1.0,
        'express': 1.5,     # +50%
        'economy': 0.8,     # -20%
        'same_day': 2.5     # +150%
    }
    
    TYPE_MULTIPLIERS = {
        'standard': 1.0,
        'legal_document': 1.3, # +30% for handling sensitivity
        'valuable': 1.5        # +50% for risk
    }
    
    PACKAGE_SIZE_MULTIPLIERS = {
        'envelope': 1.0,
        'small': 1.0,
        'medium': 1.2,
        'large': 1.4,
        'xlarge': 1.8,
        'custom': 2.0
    }
    
    # Insurance: 1.5% of declared value if required
    INSURANCE_RATE_PERCENT = Decimal('0.015')

    @classmethod
    def calculate_price(cls, distance_km: float, package_size: str, urgency: str, 
                       delivery_type: str = 'standard', insurance_value: float = 0.0,
                       weight_kg: float = 0.0, customer_id: int = None,
                       pickup_coords: tuple = None, delivery_coords: tuple = None) -> dict:
        """
        Calculate precise delivery price based on all factors, including B2B overrides.
        Can use road distance if coordinates are provided.
        Returns detailed breakdown.
        """
        from models import CustomerPricingOverride
        from utils.google_maps import GoogleMapsService
        
        # 0. Try to get road distance if coordinates provided
        used_road_distance = False
        if pickup_coords and delivery_coords:
            road_info = GoogleMapsService.get_road_distance(pickup_coords, delivery_coords)
            if road_info:
                distance_km = road_info['distance_km']
                used_road_distance = True
                logger.info(f"Pricing: Using road distance {distance_km}km for calculation (Customer: {customer_id})")
        
        # Convert inputs to Decimal
        dist_km = Decimal(str(distance_km))
        
        # Load Overrides if B2B Customer is provided
        override = CustomerPricingOverride.query.filter_by(customer_id=customer_id).first() if customer_id else None
        
        # Overridable Base Rates
        base_rate_km = Decimal(str(override.price_per_km)) if override and override.price_per_km else cls.BASE_RATE_PER_KM
        min_base_price = Decimal(str(override.base_price)) if override and override.base_price else cls.MINIMUM_BASE_PRICE
        discount_pct = Decimal(str(override.discount_percentage)) if override else Decimal('0.0')
        
        # 1. Base Distance Price
        if dist_km <= Decimal('50'):
            distance_price = dist_km * base_rate_km
        else:
            # First 50km at base rate, rest at discounted rate (or custom override applies to all)
            if override and override.price_per_km:
                distance_price = dist_km * base_rate_km # Custom B2B usually gets flat rate
            else:
                distance_price = (Decimal('50') * base_rate_km) + ((dist_km - Decimal('50')) * cls.LONG_DISTANCE_RATE_PER_KM)
            
        # Ensure minimum
        base_price = max(distance_price, min_base_price)
        
        # 2. Size Multiplier
        size_mult = Decimal(str(cls.PACKAGE_SIZE_MULTIPLIERS.get(package_size, 1.0)))
        price_after_size = base_price * size_mult
        
        # 3. Urgency Multiplier
        urgency_mult = Decimal(str(cls.URGENCY_MULTIPLIERS.get(urgency, 1.0)))
        price_after_urgency = price_after_size * urgency_mult
        
        # 4. Type Multiplier (Logistics Type)
        type_mult = Decimal(str(cls.TYPE_MULTIPLIERS.get(delivery_type, 1.0)))
        price_after_type = price_after_urgency * type_mult
        
        # 5. Weight Surcharge (e.g. over 10kg)
        weight_surcharge = Decimal('0.0')
        price_per_extra_kg = Decimal(str(override.price_per_kg)) if override and override.price_per_kg else Decimal('5.0')
        w_kg = Decimal(str(weight_kg))
        
        if w_kg > Decimal('10'):
            weight_surcharge = (w_kg - Decimal('10')) * price_per_extra_kg 
            
        subtotal = price_after_type + weight_surcharge
        
        # 5.5 Apply B2B Blanket Discount
        if discount_pct > Decimal('0.0'):
            subtotal = subtotal * (Decimal('1.0') - discount_pct)
        
        # 6. Insurance
        insurance_cost = Decimal('0.0')
        ins_val = Decimal(str(insurance_value))
        if ins_val > Decimal('0'):
            insurance_cost = ins_val * cls.INSURANCE_RATE_PERCENT
            # Minimum insurance fee logic could go here
            if insurance_cost < Decimal('10'): insurance_cost = Decimal('10.0') # Min fee
            
        final_price = subtotal + insurance_cost
        
        # Rounding for output
        curr_quant = Decimal('0.01')
        return {
            'final_price': float(final_price.quantize(curr_quant, rounding=ROUND_HALF_UP)),
            'breakdown': {
                'base_price': float(base_price.quantize(curr_quant, rounding=ROUND_HALF_UP)),
                'distance_km': float(dist_km.quantize(curr_quant, rounding=ROUND_HALF_UP)),
                'used_road_distance': used_road_distance,
                'size_multiplier': float(size_mult),
                'urgency_multiplier': float(urgency_mult),
                'type_multiplier': float(type_mult),
                'weight_surcharge': float(weight_surcharge.quantize(curr_quant, rounding=ROUND_HALF_UP)),
                'insurance_cost': float(insurance_cost.quantize(curr_quant, rounding=ROUND_HALF_UP))
            }
        }

def calculate_order_price(distance_km: float, protocol_slug: str, package_size: str = 'medium', urgency: str = 'standard') -> dict:
    """
    Standalone pricing utility for customer app.
    Formula: (20 + distance * 5) * protocol_multiplier
    """
    from models import DeliveryProtocolConfig
    from decimal import Decimal, ROUND_HALF_UP

    base_const = Decimal('20.00')
    price_per_km = Decimal('5.00')
    dist = Decimal(str(distance_km))

    # Calculate base on distance
    base_price = base_const + (dist * price_per_km)

    # Apply protocol multiplier
    config = DeliveryProtocolConfig.query.filter_by(slug=protocol_slug).first()
    multiplier = Decimal(str(config.pricing_multiplier)) if config else Decimal('1.00')
    
    final_price = base_price * multiplier
    
    # Round to 2 decimals
    curr_quant = Decimal('0.01')
    return {
        "final_price": float(final_price.quantize(curr_quant, rounding=ROUND_HALF_UP)),
        "breakdown": {
            "base": float(base_price.quantize(curr_quant, rounding=ROUND_HALF_UP)),
            "multiplier": float(multiplier),
            "distance": float(dist)
        }
    }


# ============================================================================
# Israeli Delivery Pricing Model (from Excel — 2025)
# ₪ prices include VAT (17%)
# ============================================================================

_PRICING_TIERS = [
    {'max_km': 6,  'total': 56.10},
    {'max_km': 12, 'total': 87.60},
    {'max_km': 22, 'total': 135.70},
    {'max_km': 25, 'total': 150.85},
    {'max_km': 36, 'total': 192.00},
    {'max_km': 44, 'total': 202.80},
    {'max_km': 59, 'total': 251.75},
    {'max_km': 79, 'total': 320.85},
]
_BASE_80_PLUS = 320.85      # Base total for 79 km
_EXTRA_KM_RATE = 3.70       # Per km above 79
_MIN_PRICE = 56.10
_COURIER_SHARE = 0.70       # Freelance courier gets 70%


def calculate_delivery_price(distance_km: float) -> dict:
    """
    Calculate delivery price using the Israeli tiered pricing model.
    
    Args:
        distance_km: Road distance in kilometres (float).
    
    Returns:
        dict with total_price, courier_payment, platform_margin, distance_km.
    """
    dist = float(distance_km)

    if dist <= 6:
        total = _MIN_PRICE
    elif dist >= 80:
        total = _BASE_80_PLUS + (dist - 79) * _EXTRA_KM_RATE
    else:
        # Find the matching tier
        total = None
        for tier in _PRICING_TIERS:
            if dist <= tier['max_km']:
                total = tier['total']
                break
        if total is None:
            # Shouldn't happen but safeguard
            total = _BASE_80_PLUS + (dist - 79) * _EXTRA_KM_RATE

    total = round(total, 2)
    courier_payment = round(total * _COURIER_SHARE, 2)
    platform_margin = round(total * (1 - _COURIER_SHARE), 2)

    return {
        'total_price': total,
        'courier_payment': courier_payment,
        'platform_margin': platform_margin,
        'distance_km': dist
    }