import os
import yaml
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


# Use environment variable for the PostgreSQL connection string
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
engine = create_engine(DATABASE_URL)

def main():
    import models
    from auth import hash_password
    
    config_path = os.path.join(os.path.dirname(__file__), '..', 'client_config.yaml')
    if not os.path.exists(config_path):
        print(f"Error: Could not find {config_path}")
        return

    with open(config_path, 'r') as f:
        try:
            config = yaml.safe_load(f)
        except yaml.YAMLError as e:
            print(f"Error parsing YAML: {e}")
            return

    if not config or 'clients' not in config:
        print("No 'clients' list found in config.")
        return

    # First, create the central admin table in the public schema
    print("Initializing central Admin Clients table in 'public' schema...")
    import admin_models
    admin_models.Base.metadata.create_all(bind=engine)
    
    # We will use the default engine (public schema) to insert/update the central clients
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    public_db = Session()

    for client in config['clients']:
        name = client.get('name')
        password = client.get('User login Password for app')
        
        if not name or not password:
            print(f"Skipping invalid client entry (missing name or password): {client}")
            continue
            
        # Match the sanitization strictly used in database.py
        safe_client_id = "".join(c for c in name if c.isalnum() or c in ("_", "-")).lower()
        schema_name = f"tenant_{safe_client_id}".replace("-", "_").replace(" ", "_").lower()
        
        # Optionally allowed subdomains can be configured or derived
        # Defaulting simple subdomain derivation for legacy setups
        subdomain = client.get('subdomain', safe_client_id)
        
        print(f"\nVerifying admin client registration for: '{name}' (Subdomain: {subdomain}, Schema: {schema_name})")
        
        try:
            existing_client = public_db.query(admin_models.AdminClient).filter_by(name=name).first()
            if not existing_client:
                new_client = admin_models.AdminClient(
                    name=name,
                    subdomain=subdomain,
                    schema_name=schema_name,
                    is_active=True
                )
                public_db.add(new_client)
                public_db.commit()
                print(f" -> Registered new admin client: {name}")
            else:
                print(f" -> Admin client '{name}' already exists.")
                # ensure schema mapping is correct
                if existing_client.schema_name != schema_name:
                    existing_client.schema_name = schema_name
                    public_db.commit()
        except Exception as e:
            public_db.rollback()
            print(f" -> Failed to register admin client for {name}: {e}")
            continue

        
        # 1. Create Schema
        with engine.begin() as conn:
            conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
            
        # 2. Create Tables within the specific Tenant schema
        tenant_engine = engine.execution_options(schema_translate_map={None: schema_name})
        models.Base.metadata.create_all(bind=tenant_engine)
        
        # 3. Create Admin User
        TenantSession = sessionmaker(autocommit=False, autoflush=False, bind=tenant_engine)
        db = TenantSession()
        
        # Consistent email logic
        admin_email = f"admin@{name.lower().replace(' ', '')}.edu"
        
        try:
            # Check if admin already exists
            existing_admin = db.query(models.User).filter_by(email=admin_email).first()
            if not existing_admin:
                admin_user = models.User(
                    email=admin_email,
                    hashed_password=hash_password(password),
                    role=models.RoleEnum.college_admin
                )
                db.add(admin_user)
                db.flush()
                
                admin_profile = models.Profile(
                    first_name="Admin",
                    last_name="User",
                    user_id=admin_user.id
                )
                db.add(admin_profile)
                db.commit()
                print(f" -> Created Admin User: {admin_email}")
            else:
                print(f" -> Admin User '{admin_email}' already exists. Skipping creation.")
        except Exception as e:
            db.rollback()
            print(f" -> Failed to create admin user for {name}: {e}")
        finally:
            db.close()
            
    public_db.close()
    print("\nClient Database Initialization Complete.")

if __name__ == "__main__":
    main()
