-- Initial database setup for TrueCheckIA
-- This script is run when PostgreSQL container is first created

-- Create database if not exists (handled by docker-compose)
-- The database 'truecheckia' is created by POSTGRES_DB env variable

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add any initial data or configurations here
-- For example, you might want to create some initial categories or settings

-- Log successful initialization
SELECT 'Database initialized successfully' AS message;