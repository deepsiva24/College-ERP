import os
from sqlalchemy import create_engine, text

os.environ['DATABASE_URL'] = 'postgresql://postgres:erp-secure-production-db-password-2026@localhost:5432/postgres'
engine = create_engine(os.environ['DATABASE_URL']).execution_options(isolation_level='AUTOCOMMIT')
with engine.connect() as conn:
    conn.execute(text('DROP SCHEMA IF EXISTS "tenant_demoschool" CASCADE'))
    print('Schema dropped successfully')
