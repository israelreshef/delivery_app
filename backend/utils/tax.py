"""Central source of truth for Israeli tax constants.

Israeli standard VAT (מע"מ) is 18% (effective 1 January 2025, unchanged for 2026).
Override via the VAT_RATE environment variable if the statutory rate changes.
"""
import os
from decimal import Decimal

VAT_RATE = Decimal(str(os.environ.get('VAT_RATE', '0.18')))

VAT_RATE_FLOAT = float(VAT_RATE)
