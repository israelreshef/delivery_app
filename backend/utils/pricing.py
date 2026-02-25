from datetime import datetime

class PricingEngine:
    # Base rates
    BASE_RATE_PER_KM = 4.00
    MINIMUM_BASE_PRICE = 45.00
    
    # Large distance discount (over 50km)
    LONG_DISTANCE_RATE_PER_KM = 3.00

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
    INSURANCE_RATE_PERCENT = 0.015

    @classmethod
    def calculate_price(cls, distance_km: float, package_size: str, urgency: str, 
                       delivery_type: str = 'standard', insurance_value: float = 0.0,
                       weight_kg: float = 0.0, customer_id: int = None) -> dict:
        """
        Calculate precise delivery price based on all factors, including B2B overrides.
        Returns detailed breakdown.
        """
        from models import CustomerPricingOverride
        
        # Load Overrides if B2B Customer is provided
        override = CustomerPricingOverride.query.filter_by(customer_id=customer_id).first() if customer_id else None
        
        # Overridable Base Rates
        base_rate_km = float(override.price_per_km) if override and override.price_per_km else cls.BASE_RATE_PER_KM
        min_base_price = float(override.base_price) if override and override.base_price else cls.MINIMUM_BASE_PRICE
        discount_pct = override.discount_percentage if override else 0.0
        
        # 1. Base Distance Price
        if distance_km <= 50:
            distance_price = distance_km * base_rate_km
        else:
            # First 50km at base rate, rest at discounted rate (or custom override applies to all)
            if override and override.price_per_km:
                distance_price = distance_km * base_rate_km # Custom B2B usually gets flat rate
            else:
                distance_price = (50 * base_rate_km) + ((distance_km - 50) * cls.LONG_DISTANCE_RATE_PER_KM)
            
        # Ensure minimum
        base_price = max(distance_price, min_base_price)
        
        # 2. Size Multiplier
        size_mult = cls.PACKAGE_SIZE_MULTIPLIERS.get(package_size, 1.0)
        price_after_size = base_price * size_mult
        
        # 3. Urgency Multiplier
        urgency_mult = cls.URGENCY_MULTIPLIERS.get(urgency, 1.0)
        price_after_urgency = price_after_size * urgency_mult
        
        # 4. Type Multiplier (Logistics Type)
        type_mult = cls.TYPE_MULTIPLIERS.get(delivery_type, 1.0)
        price_after_type = price_after_urgency * type_mult
        
        # 5. Weight Surcharge (e.g. over 10kg)
        weight_surcharge = 0.0
        price_per_extra_kg = float(override.price_per_kg) if override and override.price_per_kg else 5.0
        
        if weight_kg > 10:
            weight_surcharge = (weight_kg - 10) * price_per_extra_kg 
            
        subtotal = price_after_type + weight_surcharge
        
        # 5.5 Apply B2B Blanket Discount
        if discount_pct > 0.0:
            subtotal = subtotal * (1.0 - discount_pct)
        
        # 6. Insurance
        insurance_cost = 0.0
        if insurance_value > 0:
            insurance_cost = insurance_value * cls.INSURANCE_RATE_PERCENT
            # Minimum insurance fee logic could go here
            if insurance_cost < 10: insurance_cost = 10.0 # Min fee
            
        final_price = subtotal + insurance_cost
        
        return {
            'final_price': round(final_price, 2),
            'breakdown': {
                'base_price': round(base_price, 2),
                'distance_km': distance_km,
                'size_multiplier': size_mult,
                'urgency_multiplier': urgency_mult,
                'type_multiplier': type_mult,
                'weight_surcharge': round(weight_surcharge, 2),
                'insurance_cost': round(insurance_cost, 2)
            }
        }