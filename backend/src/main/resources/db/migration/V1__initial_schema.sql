-- ============================================================================
-- RepairReach Database Migration: V1__initial_schema.sql
-- Description: Core schema definition with 29 relational tables, custom enums,
--              PostgreSQL GiST schedule exclusion constraint, indexes, and triggers.
-- Dialect: PostgreSQL 16+ (Supabase compatible)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PostgreSQL Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ----------------------------------------------------------------------------
-- 2. Custom Enumeration Types
-- ----------------------------------------------------------------------------
CREATE TYPE user_role_enum AS ENUM (
    'TECHNICIAN',
    'OWNER',
    'OPERATOR',
    'ADMIN'
);

CREATE TYPE identity_provider_enum AS ENUM (
    'FIREBASE',
    'SUPABASE',
    'LOCAL'
);

CREATE TYPE service_category_enum AS ENUM (
    'HOME_APPLIANCE',
    'ELECTRONICS',
    'COMMERCIAL_APPLIANCE'
);

CREATE TYPE booking_state_enum AS ENUM (
    'REQUESTED',
    'SLOT_SELECTION_REQUIRED',
    'CONFIRMED',
    'CANCELLED',
    'CLOSED'
);

CREATE TYPE job_state_enum AS ENUM (
    'ASSIGNMENT_PENDING',
    'ASSIGNED',
    'SCHEDULED',
    'EN_ROUTE',
    'ARRIVED',
    'DIAGNOSING',
    'DEVICE_TRANSFERRED',
    'WORKSHOP_REPAIR',
    'COMPLETED',
    'UNABLE_TO_SERVE'
);

CREATE TYPE assignment_status_enum AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'SUPERSEDED',
    'FULFILLED'
);

CREATE TYPE schedule_activity_type_enum AS ENUM (
    'HOME_VISIT',
    'WORKSHOP_REPAIR',
    'TRAVEL_BUFFER',
    'BREAK',
    'EXCEPTION_BLOCK'
);

CREATE TYPE schedule_entry_status_enum AS ENUM (
    'ACTIVE',
    'RELEASED',
    'MOVED'
);

CREATE TYPE cancellation_charge_type_enum AS ENUM (
    'NONE',
    'PRE_ARRIVAL_NO_VISIT_CHARGE',
    'POST_ARRIVAL_VISIT_CHARGE_APPLICABLE'
);

CREATE TYPE feedback_analysis_status_enum AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED'
);

CREATE TYPE sentiment_enum AS ENUM (
    'POSITIVE',
    'NEUTRAL',
    'NEGATIVE'
);

CREATE TYPE escalation_status_enum AS ENUM (
    'OPEN',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'DISMISSED'
);

CREATE TYPE escalation_priority_enum AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);

CREATE TYPE testimonial_provenance_enum AS ENUM (
    'MANUAL_CURATED',
    'VERIFIED_CUSTOMER',
    'IMPORTED_EXTERNAL'
);

CREATE TYPE review_sync_status_enum AS ENUM (
    'SYNCED',
    'PENDING_CURATION',
    'EXCLUDED'
);

CREATE TYPE outbox_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'DEAD_LETTER'
);

CREATE TYPE notification_channel_enum AS ENUM (
    'SMS',
    'WHATSAPP',
    'EMAIL',
    'PUSH'
);

-- ----------------------------------------------------------------------------
-- 3. Business & Multi-Tenant Tables (Tables 1-3)
-- ----------------------------------------------------------------------------

-- Table 1: business
CREATE TABLE business (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Solapur',
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    postal_code VARCHAR(20) NOT NULL DEFAULT '413001',
    country VARCHAR(50) NOT NULL DEFAULT 'IN',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

-- Table 2: business_settings
CREATE TABLE business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES business(id) ON DELETE RESTRICT,
    weekday_open_time TIME NOT NULL DEFAULT '09:00:00',
    weekday_close_time TIME NOT NULL DEFAULT '19:00:00',
    sunday_open_time TIME NOT NULL DEFAULT '09:00:00',
    sunday_close_time TIME NOT NULL DEFAULT '14:00:00',
    afternoon_break_start TIME NOT NULL DEFAULT '14:00:00',
    afternoon_break_end TIME NOT NULL DEFAULT '16:00:00',
    default_slot_duration_minutes INT NOT NULL DEFAULT 60,
    default_travel_buffer_minutes INT NOT NULL DEFAULT 30,
    visiting_charge_amount NUMERIC(10,2) NOT NULL DEFAULT 299.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    max_advance_booking_days INT NOT NULL DEFAULT 14,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: business_location
CREATE TABLE business_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Solapur',
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_business_location_business_code UNIQUE(business_id, code)
);

-- ----------------------------------------------------------------------------
-- 4. Identity & Technician Tables (Tables 4-7)
-- ----------------------------------------------------------------------------

-- Table 4: application_user
CREATE TABLE application_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'TECHNICIAN',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

-- Table 5: external_identity
CREATE TABLE external_identity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES application_user(id) ON DELETE CASCADE,
    provider identity_provider_enum NOT NULL,
    provider_subject VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_external_identity_provider_subject UNIQUE(provider, provider_subject)
);

-- Table 6: technician
CREATE TABLE technician (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL UNIQUE REFERENCES application_user(id) ON DELETE RESTRICT,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    home_location_lat NUMERIC(10,8),
    home_location_lon NUMERIC(11,8),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

-- Table 7: technician_capability
CREATE TABLE technician_capability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technician(id) ON DELETE CASCADE,
    capability_key VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_technician_capability_key UNIQUE(technician_id, capability_key)
);

-- ----------------------------------------------------------------------------
-- 5. Service Catalog Tables (Tables 8-9)
-- ----------------------------------------------------------------------------

-- Table 8: service_offering
CREATE TABLE service_offering (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category service_category_enum NOT NULL DEFAULT 'HOME_APPLIANCE',
    base_duration_minutes INT NOT NULL DEFAULT 60,
    buffer_duration_minutes INT NOT NULL DEFAULT 0,
    supports_home_service BOOLEAN NOT NULL DEFAULT true,
    supports_workshop_repair BOOLEAN NOT NULL DEFAULT true,
    supports_device_transfer BOOLEAN NOT NULL DEFAULT true,
    is_published BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

-- Table 9: service_requirement
CREATE TABLE service_requirement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_offering_id UUID NOT NULL REFERENCES service_offering(id) ON DELETE CASCADE,
    requirement_key VARCHAR(100) NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_service_requirement_key UNIQUE(service_offering_id, requirement_key)
);

-- ----------------------------------------------------------------------------
-- 6. Customer & Device Tables (Tables 10-12)
-- ----------------------------------------------------------------------------

-- Table 10: customer
CREATE TABLE customer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    normalized_phone VARCHAR(20) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_customer_business_phone UNIQUE(business_id, normalized_phone)
);

-- Table 11: customer_address
CREATE TABLE customer_address (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    address_line TEXT NOT NULL,
    landmark TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Solapur',
    postal_code VARCHAR(20),
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    is_default BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 12: customer_device
CREATE TABLE customer_device (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    appliance_type VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    model_number VARCHAR(100),
    serial_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. Availability & Scheduling Policy Tables (Tables 13-14)
-- ----------------------------------------------------------------------------

-- Table 13: availability_rule
CREATE TABLE availability_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    technician_id UUID REFERENCES technician(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_break BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 14: availability_exception
CREATE TABLE availability_exception (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    technician_id UUID REFERENCES technician(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN NOT NULL DEFAULT false,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8. Booking, Job & Assignment Domain Tables (Tables 15-18)
-- ----------------------------------------------------------------------------

-- Table 15: booking
CREATE TABLE booking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    public_reference VARCHAR(64) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
    service_offering_id UUID NOT NULL REFERENCES service_offering(id) ON DELETE RESTRICT,
    customer_address_id UUID REFERENCES customer_address(id) ON DELETE SET NULL,
    customer_name_snapshot VARCHAR(255) NOT NULL,
    customer_phone_snapshot VARCHAR(20) NOT NULL,
    service_name_snapshot VARCHAR(255) NOT NULL,
    address_snapshot TEXT NOT NULL,
    problem_description TEXT NOT NULL,
    state booking_state_enum NOT NULL DEFAULT 'REQUESTED',
    requested_slot_start TIMESTAMPTZ NOT NULL,
    requested_slot_end TIMESTAMPTZ NOT NULL,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancellation_charge_applicable BOOLEAN NOT NULL DEFAULT false,
    cancellation_charge_type cancellation_charge_type_enum NOT NULL DEFAULT 'NONE',
    capability_token VARCHAR(255) NOT NULL UNIQUE,
    capability_token_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

-- Table 16: job
CREATE TABLE job (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    booking_id UUID NOT NULL UNIQUE REFERENCES booking(id) ON DELETE RESTRICT,
    job_reference VARCHAR(64) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
    state job_state_enum NOT NULL DEFAULT 'ASSIGNMENT_PENDING',
    planned_start_time TIMESTAMPTZ NOT NULL,
    planned_end_time TIMESTAMPTZ NOT NULL,
    actual_en_route_at TIMESTAMPTZ,
    actual_arrived_at TIMESTAMPTZ,
    actual_started_at TIMESTAMPTZ,
    actual_completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    diagnosis_notes TEXT,
    workshop_notes TEXT,
    inability_reason TEXT,
    unable_to_serve_at TIMESTAMPTZ,
    feedback_capability_token VARCHAR(255) UNIQUE,
    feedback_token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

-- Table 17: job_event
CREATE TABLE job_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job(id) ON DELETE CASCADE,
    from_state job_state_enum,
    to_state job_state_enum NOT NULL,
    actor_id UUID,
    actor_type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 18: assignment
CREATE TABLE assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES technician(id) ON DELETE RESTRICT,
    status assignment_status_enum NOT NULL DEFAULT 'PENDING',
    selection_reason VARCHAR(255) NOT NULL DEFAULT 'DEFAULT_CAPABILITY_POLICY',
    selection_policy_version VARCHAR(50) NOT NULL DEFAULT 'v1',
    score NUMERIC(6,3) DEFAULT 1.000,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason VARCHAR(255),
    rejection_notes TEXT,
    is_current BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 9. Schedule Entries & Overlap Exclusion (Tables 19-20)
-- ----------------------------------------------------------------------------

-- Table 19: schedule_entry (GiST Overlap Exclusion Constraint)
CREATE TABLE schedule_entry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    technician_id UUID NOT NULL REFERENCES technician(id) ON DELETE RESTRICT,
    job_id UUID REFERENCES job(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES booking(id) ON DELETE CASCADE,
    activity_type schedule_activity_type_enum NOT NULL DEFAULT 'HOME_VISIT',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    active_interval TSTZRANGE NOT NULL,
    status schedule_entry_status_enum NOT NULL DEFAULT 'ACTIVE',
    schedule_date DATE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT schedule_entry_interval_check CHECK (end_time > start_time),
    CONSTRAINT schedule_entry_no_overlap EXCLUDE USING gist (
        technician_id WITH =,
        active_interval WITH &&
    ) WHERE (status = 'ACTIVE')
);

-- Table 20: schedule_revision
CREATE TABLE schedule_revision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_entry_id UUID NOT NULL REFERENCES schedule_entry(id) ON DELETE CASCADE,
    command_name VARCHAR(100) NOT NULL,
    old_start_time TIMESTAMPTZ NOT NULL,
    old_end_time TIMESTAMPTZ NOT NULL,
    new_start_time TIMESTAMPTZ NOT NULL,
    new_end_time TIMESTAMPTZ NOT NULL,
    actor_id UUID,
    actor_type VARCHAR(50) NOT NULL,
    change_reason TEXT,
    idempotency_key VARCHAR(255),
    affected_entries_summary JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 10. Feedback, AI Analysis & Reviews (Tables 21-25)
-- ----------------------------------------------------------------------------

-- Table 21: feedback
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL UNIQUE REFERENCES job(id) ON DELETE RESTRICT,
    booking_id UUID NOT NULL REFERENCES booking(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_immutable BOOLEAN NOT NULL DEFAULT true,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    client_ip VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 22: feedback_analysis
CREATE TABLE feedback_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    provider_name VARCHAR(50) NOT NULL DEFAULT 'AI_PROVIDER_ABSTRACTION',
    model_version VARCHAR(50),
    prompt_version VARCHAR(50) DEFAULT 'v1',
    status feedback_analysis_status_enum NOT NULL DEFAULT 'PENDING',
    sentiment sentiment_enum,
    concern_categories JSONB DEFAULT '[]'::jsonb,
    severity_score NUMERIC(4,2) DEFAULT 0.00,
    is_unhappy_customer BOOLEAN NOT NULL DEFAULT false,
    analysis_summary TEXT,
    raw_provider_payload JSONB,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 23: escalation
CREATE TABLE escalation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
    status escalation_status_enum NOT NULL DEFAULT 'OPEN',
    priority escalation_priority_enum NOT NULL DEFAULT 'MEDIUM',
    trigger_source VARCHAR(50) NOT NULL DEFAULT 'AI_ANALYSIS',
    assigned_to_user_id UUID REFERENCES application_user(id) ON DELETE SET NULL,
    owner_notes TEXT,
    resolution_summary TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 24: testimonial
CREATE TABLE testimonial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NOT NULL,
    service_type_display VARCHAR(100) NOT NULL,
    location_display VARCHAR(100) NOT NULL DEFAULT 'Solapur',
    provenance testimonial_provenance_enum NOT NULL DEFAULT 'MANUAL_CURATED',
    source_feedback_id UUID REFERENCES feedback(id) ON DELETE SET NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 25: review_sync_record
CREATE TABLE review_sync_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE RESTRICT,
    provider VARCHAR(50) NOT NULL DEFAULT 'GOOGLE_REVIEWS',
    external_review_id VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_photo_url TEXT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    review_timestamp TIMESTAMPTZ NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    sync_status review_sync_status_enum NOT NULL DEFAULT 'SYNCED',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_review_sync_provider_external_id UNIQUE(provider, external_review_id)
);

-- ----------------------------------------------------------------------------
-- 11. Outbox, Notifications, Auditing & Idempotency (Tables 26-29)
-- ----------------------------------------------------------------------------

-- Table 26: outbox_event
CREATE TABLE outbox_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status outbox_status_enum NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 27: notification_attempt
CREATE TABLE notification_attempt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outbox_event_id UUID NOT NULL REFERENCES outbox_event(id) ON DELETE CASCADE,
    channel notification_channel_enum NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    payload_summary TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SENT',
    provider_response_id VARCHAR(255),
    error_details TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 28: audit_event
CREATE TABLE audit_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    actor_id UUID,
    actor_type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    actor_name VARCHAR(255),
    correlation_id VARCHAR(255),
    idempotency_key VARCHAR(255),
    previous_state JSONB,
    new_state JSONB,
    change_summary TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 29: idempotency_record
CREATE TABLE idempotency_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_status INT NOT NULL,
    response_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_body JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_idempotency_scope_key UNIQUE(scope, idempotency_key)
);

-- ----------------------------------------------------------------------------
-- 12. Indexes
-- ----------------------------------------------------------------------------

-- Business & Identity Indexes
CREATE INDEX idx_business_location_business ON business_location(business_id);
CREATE INDEX idx_application_user_business ON application_user(business_id);
CREATE INDEX idx_technician_user ON technician(user_id);
CREATE INDEX idx_technician_active ON technician(business_id, is_active);
CREATE INDEX idx_technician_capability_lookup ON technician_capability(capability_key, is_active);

-- Catalog & Customer Indexes
CREATE INDEX idx_service_offering_lookup ON service_offering(business_id, is_published, category);
CREATE INDEX idx_service_offering_display ON service_offering(business_id, display_order);
CREATE INDEX idx_customer_phone ON customer(business_id, normalized_phone);
CREATE INDEX idx_customer_address_cust ON customer_address(customer_id);
CREATE INDEX idx_customer_device_cust ON customer_device(customer_id);

-- Scheduling & Availability Indexes
CREATE INDEX idx_availability_rule_query ON availability_rule(business_id, technician_id, day_of_week, is_active);
CREATE INDEX idx_availability_exception_query ON availability_exception(business_id, technician_id, exception_date);

-- Booking & Job Indexes
CREATE INDEX idx_booking_customer ON booking(customer_id);
CREATE INDEX idx_booking_public_ref ON booking(public_reference);
CREATE INDEX idx_booking_capability_token ON booking(capability_token);
CREATE INDEX idx_booking_state_date ON booking(business_id, state, requested_slot_start);

CREATE INDEX idx_job_booking ON job(booking_id);
CREATE INDEX idx_job_customer ON job(customer_id);
CREATE INDEX idx_job_reference ON job(job_reference);
CREATE INDEX idx_job_state_planned ON job(business_id, state, planned_start_time);
CREATE INDEX idx_job_feedback_token ON job(feedback_capability_token);
CREATE INDEX idx_job_event_job ON job_event(job_id, created_at);

-- Assignment Indexes
CREATE INDEX idx_assignment_job_current ON assignment(job_id, is_current);
CREATE INDEX idx_assignment_technician_status ON assignment(technician_id, status);

-- Schedule Entry & Revision Indexes
CREATE INDEX idx_schedule_entry_query ON schedule_entry(technician_id, schedule_date, status);
CREATE INDEX idx_schedule_entry_job ON schedule_entry(job_id);
CREATE INDEX idx_schedule_entry_booking ON schedule_entry(booking_id);
CREATE INDEX idx_schedule_revision_entry ON schedule_revision(schedule_entry_id);

-- Feedback, Escalation, Reviews Indexes
CREATE INDEX idx_feedback_job ON feedback(job_id);
CREATE INDEX idx_feedback_booking ON feedback(booking_id);
CREATE INDEX idx_feedback_customer ON feedback(customer_id);
CREATE INDEX idx_feedback_analysis_status ON feedback_analysis(status, is_unhappy_customer);
CREATE INDEX idx_escalation_status ON escalation(status, priority);
CREATE INDEX idx_testimonial_published ON testimonial(business_id, is_published, display_order);
CREATE INDEX idx_review_sync_lookup ON review_sync_record(business_id, provider, sync_status);

-- Outbox, Audit & Idempotency Indexes
CREATE INDEX idx_outbox_event_polling ON outbox_event(status, next_attempt_at) WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX idx_notification_attempt_outbox ON notification_attempt(outbox_event_id);
CREATE INDEX idx_audit_event_aggregate ON audit_event(aggregate_type, aggregate_id, created_at);
CREATE INDEX idx_audit_event_actor ON audit_event(actor_type, actor_id, created_at);
CREATE INDEX idx_idempotency_lookup ON idempotency_record(scope, idempotency_key, expires_at);

-- ----------------------------------------------------------------------------
-- 13. Triggers & Trigger Functions
-- ----------------------------------------------------------------------------

-- Trigger Function: Auto-maintain active_interval and schedule_date on schedule_entry
CREATE OR REPLACE FUNCTION trg_sync_schedule_entry_interval()
RETURNS TRIGGER AS $$
BEGIN
    NEW.active_interval := tstzrange(NEW.start_time, NEW.end_time, '[)');
    NEW.schedule_date := (NEW.start_time AT TIME ZONE 'Asia/Kolkata')::DATE;
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schedule_entry_interval_sync
BEFORE INSERT OR UPDATE ON schedule_entry
FOR EACH ROW EXECUTE FUNCTION trg_sync_schedule_entry_interval();

-- Trigger Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all mutable tables
CREATE TRIGGER trg_business_updated_at BEFORE UPDATE ON business FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_business_settings_updated_at BEFORE UPDATE ON business_settings FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_business_location_updated_at BEFORE UPDATE ON business_location FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_application_user_updated_at BEFORE UPDATE ON application_user FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_external_identity_updated_at BEFORE UPDATE ON external_identity FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_technician_updated_at BEFORE UPDATE ON technician FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_service_offering_updated_at BEFORE UPDATE ON service_offering FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_customer_updated_at BEFORE UPDATE ON customer FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_customer_address_updated_at BEFORE UPDATE ON customer_address FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_customer_device_updated_at BEFORE UPDATE ON customer_device FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_availability_rule_updated_at BEFORE UPDATE ON availability_rule FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_availability_exception_updated_at BEFORE UPDATE ON availability_exception FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_booking_updated_at BEFORE UPDATE ON booking FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_job_updated_at BEFORE UPDATE ON job FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_assignment_updated_at BEFORE UPDATE ON assignment FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_feedback_analysis_updated_at BEFORE UPDATE ON feedback_analysis FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_escalation_updated_at BEFORE UPDATE ON escalation FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_testimonial_updated_at BEFORE UPDATE ON testimonial FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_review_sync_record_updated_at BEFORE UPDATE ON review_sync_record FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_outbox_event_updated_at BEFORE UPDATE ON outbox_event FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
