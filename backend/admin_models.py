from sqlalchemy import Boolean, Column, Integer, String, DateTime
import datetime
from database import Base

class AdminClient(Base):
    """
    Centralized table in the 'public' schema to manage authorized tenants.
    """
    __tablename__ = "clients"
    # Ensure this stays in the public schema, independent of the tenant's schema translation
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False) # e.g. "Prahitha Edu"
    subdomain = Column(String, unique=True, index=True, nullable=False) # e.g. "prahitha"
    schema_name = Column(String, unique=True, nullable=False) # e.g. "tenant_prahithaeducational"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
