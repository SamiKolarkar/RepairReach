-- V5__customer_oauth.sql

-- Add auth_user_id to customer table for Supabase Auth integration
ALTER TABLE customer ADD COLUMN auth_user_id UUID UNIQUE;

-- Drop capability_token from booking table as we are switching to standard OAuth
ALTER TABLE booking DROP COLUMN capability_token;
