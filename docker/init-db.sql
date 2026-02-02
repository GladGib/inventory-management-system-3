-- Initialize database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create shared schema for tenant management
CREATE SCHEMA IF NOT EXISTS shared;

-- Grant permissions
GRANT ALL ON SCHEMA shared TO ims_user;
GRANT ALL ON SCHEMA public TO ims_user;

-- Create function to create tenant schema
CREATE OR REPLACE FUNCTION shared.create_tenant_schema(tenant_slug TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', tenant_slug);
  EXECUTE format('GRANT ALL ON SCHEMA %I TO ims_user', tenant_slug);
END;
$$ LANGUAGE plpgsql;

-- Create function to drop tenant schema
CREATE OR REPLACE FUNCTION shared.drop_tenant_schema(tenant_slug TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', tenant_slug);
END;
$$ LANGUAGE plpgsql;
