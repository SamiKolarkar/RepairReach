-- V3__widen_token_columns.sql
-- Widen capability token and feedback token columns to support standard JWT sizes

ALTER TABLE booking ALTER COLUMN capability_token TYPE VARCHAR(512);
ALTER TABLE job ALTER COLUMN feedback_capability_token TYPE VARCHAR(512);
