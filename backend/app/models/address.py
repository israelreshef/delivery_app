from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.core.db import Base

class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True) # Optional: saved address
    street = Column(String, nullable=False)
    city = Column(String, nullable=False)
    postal_code = Column(String, nullable=True)
    building_number = Column(String, nullable=False)
    apartment = Column(String, nullable=True)
    floor = Column(String, nullable=True)
    entrance = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # PostGIS Field: Point(lng, lat)
    location = Column(Geometry(geometry_type='POINT', srid=4326), nullable=True)

    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", backref="addresses")
