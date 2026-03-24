import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from contextlib import contextmanager
from fastapi import HTTPException, status
from config import settings

Base = declarative_base()

# Use environment variable for the PostgreSQL connection string
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

# Create a single shared engine for the PostgreSQL database
engine = create_engine(DATABASE_URL)

# Cache session makers per tenant to avoid rebuilding engines
engines = {}

def get_tenant_db_engine(client_id: str):
    import admin_models
    import models
    from auth import hash_password
    
    # Try looking up exactly by Name first, then fallback to subdomain-like matching
    # if the client_id passed from frontend is the human readable name like "Prahitha Edu"
    
    # 1. Connect to the default 'public' schema to verify the client exists
    # We create a brief session just for checking the admin table
    SessionLocalTemp = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    temp_db = SessionLocalTemp()
    
    try:
        # Check if client_id matches the name or subdomain
        client_record = temp_db.query(admin_models.AdminClient).filter(
            (admin_models.AdminClient.name == client_id) | 
            (admin_models.AdminClient.subdomain == client_id.lower())
        ).first()
        
        if not client_record or not client_record.is_active:
            raise Exception(f"Unauthorized or inactive client: {client_id}")
            
        schema_name = client_record.schema_name
        tenant_name = client_record.name
        
        # 2. Check if the schema actually exists in postgres and has our foundational tables
        is_initialized = False
        with engine.connect() as conn:
            # First ensure schema exists
            conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
            conn.commit()
            
            # Now check if the 'users' table exists inside it
            result = conn.execute(text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = :schema_name AND table_name = 'users'"
            ), {"schema_name": schema_name}).fetchone()
            is_initialized = result is not None
            
        # 3. Provision the schema if it is not fully initialized
        if not is_initialized:
            print(f"Dynamically provisioning tables for {tenant_name} in schema: {schema_name}")
                
            tenant_engine = engine.execution_options(schema_translate_map={None: schema_name})
            
            # Create all tables in the new schema
            models.Base.metadata.create_all(bind=tenant_engine)
            
            # Create the default admin user
            InitSession = sessionmaker(autocommit=False, autoflush=False, bind=tenant_engine)
            init_db = InitSession()
            try:
                admin_email = f"admin@{tenant_name.lower().replace(' ', '')}.edu"
                default_password = f"{tenant_name.lower().replace(' ', '')}@5115" # Default password pattern from yaml
                
                admin_user = models.User(
                    email=admin_email,
                    hashed_password=hash_password(default_password),
                    role=models.RoleEnum.college_admin
                )
                init_db.add(admin_user)
                init_db.flush()
                
                admin_profile = models.Profile(
                    first_name="Admin",
                    last_name="User",
                    user_id=admin_user.id
                )
                init_db.add(admin_profile)
                init_db.commit()
                print(f"Provisioned default admin: {admin_email} for schema {schema_name}")
            except Exception as e:
                init_db.rollback()
                print(f"Failed to create default admin for {schema_name}: {e}")
            finally:
                init_db.close()
                

    finally:
        temp_db.close()

    # 4. Return the cached or newly created engine for this tenant
    # Use the reliable generated schema_name from the central table as the key
    if schema_name not in engines:
        tenant_engine = engine.execution_options(schema_translate_map={None: schema_name})
        engines[schema_name] = sessionmaker(autocommit=False, autoflush=False, bind=tenant_engine)
        
    return engines[schema_name]

def get_tenant_db(client_id: str = settings.DEFAULT_CLIENT_ID):
    """
    Dependency to yield a DB session explicitly tied to a tenant.
    Default is read from DEFAULT_CLIENT_ID environment variable.
    """
    SessionLocal = get_tenant_db_engine(client_id)
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_tenant_db_ctx(client_id: str = settings.DEFAULT_CLIENT_ID):
    SessionLocal = get_tenant_db_engine(client_id)
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
