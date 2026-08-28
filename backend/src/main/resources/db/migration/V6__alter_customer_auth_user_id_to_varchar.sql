-- V6__alter_customer_auth_user_id_to_varchar.sql
-- Alter customer.auth_user_id from UUID to VARCHAR(128) for Firebase Auth UID compatibility

ALTER TABLE customer ALTER COLUMN auth_user_id TYPE VARCHAR(128) USING auth_user_id::varchar;
