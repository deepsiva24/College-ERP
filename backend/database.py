import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from contextlib import contextmanager

Base = declarative_base()

# Use environment variable for the PostgreSQL connection string
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

# Create a single shared engine for the PostgreSQL database
engine = create_engine(DATABASE_URL)

# Cache session makers per tenant to avoid rebuilding engines
engines = {}

def get_tenant_db_engine(client_id: str):
    # Clean client_id for schema name
    schema_name = f"tenant_{client_id}".replace("-", "_").replace(" ", "_").lower()
    
    if client_id not in engines:
        # Create schema if it doesn't exist
        with engine.begin() as conn:
            conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
            
        # Create a tenant-specific engine by mapping the default (None) schema to the tenant schema
        tenant_engine = engine.execution_options(schema_translate_map={None: schema_name})
        engines[client_id] = sessionmaker(autocommit=False, autoflush=False, bind=tenant_engine)
        
        # Ensure tables are created for this specific tenant schema lazily
        import models
        models.Base.metadata.create_all(bind=tenant_engine)
        
    return engines[client_id]

def get_tenant_db(client_id: str = "Prahitha Educational"):
    """
    Dependency to yield a DB session explicitly tied to a tenant.
    We default to Prahitha Educational as requested by the user.
    """
    safe_client_id = "".join(c for c in client_id if c.isalnum() or c in ("_", "-")).lower()
    SessionLocal = get_tenant_db_engine(safe_client_id)
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_tenant_db_ctx(client_id: str = "Prahitha Educational"):
    safe_client_id = "".join(c for c in client_id if c.isalnum() or c in ("_", "-")).lower()
    SessionLocal = get_tenant_db_engine(safe_client_id)
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
