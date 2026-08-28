-- ============================================================================
-- RepairReach Database Migration: V2__seed_data.sql
-- Description: Seed initial business configuration, primary location,
--              users, technician capabilities, availability rules,
--              service catalog (excluding mobile repair), service requirements,
--              and curated testimonials for Solapur, Maharashtra.
-- Dialect: PostgreSQL 16+ (Supabase compatible)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Default Business Record (Solapur, Maharashtra)
-- ----------------------------------------------------------------------------
INSERT INTO business (
    id,
    code,
    name,
    timezone,
    phone,
    email,
    address,
    city,
    state,
    postal_code,
    country,
    is_active
) VALUES (
    '00000000-0000-0000-0001-000000000001'::uuid,
    'SOLAPUR_MAIN',
    'RepairReach Solapur',
    'Asia/Kolkata',
    '+919876543210',
    'contact@repairreach.in',
    '101 Navi Peth Commercial Center, Solapur',
    'Solapur',
    'Maharashtra',
    '413001',
    'IN',
    true
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    timezone = EXCLUDED.timezone,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    postal_code = EXCLUDED.postal_code,
    country = EXCLUDED.country,
    is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 2. Business Settings
-- ----------------------------------------------------------------------------
INSERT INTO business_settings (
    id,
    business_id,
    weekday_open_time,
    weekday_close_time,
    sunday_open_time,
    sunday_close_time,
    afternoon_break_start,
    afternoon_break_end,
    default_slot_duration_minutes,
    default_travel_buffer_minutes,
    visiting_charge_amount,
    currency,
    max_advance_booking_days
) VALUES (
    '00000000-0000-0000-0001-000000000002'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    '09:00:00',
    '19:00:00',
    '09:00:00',
    '14:00:00',
    '14:00:00',
    '16:00:00',
    60,
    30,
    299.00,
    'INR',
    14
) ON CONFLICT (business_id) DO UPDATE SET
    weekday_open_time = EXCLUDED.weekday_open_time,
    weekday_close_time = EXCLUDED.weekday_close_time,
    sunday_open_time = EXCLUDED.sunday_open_time,
    sunday_close_time = EXCLUDED.sunday_close_time,
    afternoon_break_start = EXCLUDED.afternoon_break_start,
    afternoon_break_end = EXCLUDED.afternoon_break_end,
    default_slot_duration_minutes = EXCLUDED.default_slot_duration_minutes,
    default_travel_buffer_minutes = EXCLUDED.default_travel_buffer_minutes,
    visiting_charge_amount = EXCLUDED.visiting_charge_amount,
    currency = EXCLUDED.currency,
    max_advance_booking_days = EXCLUDED.max_advance_booking_days;

-- ----------------------------------------------------------------------------
-- 3. Business Location (Solapur Central)
-- ----------------------------------------------------------------------------
INSERT INTO business_location (
    id,
    business_id,
    name,
    code,
    address,
    city,
    latitude,
    longitude,
    is_primary,
    is_active
) VALUES (
    '00000000-0000-0000-0001-000000000003'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'Solapur Central Workshop & Office',
    'SOLAPUR_CENTRAL',
    'Shop No. 12, Navi Peth Commercial Complex, Solapur',
    'Solapur',
    17.65991000,
    75.90639000,
    true,
    true
) ON CONFLICT (business_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    is_primary = EXCLUDED.is_primary,
    is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 4. Application Users (Owner & Primary Technician)
-- ----------------------------------------------------------------------------
INSERT INTO application_user (
    id,
    business_id,
    email,
    phone,
    full_name,
    role,
    is_active
) VALUES
(
    '00000000-0000-0000-0002-000000000001'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'owner@repairreach.in',
    '+919876543210',
    'Sanjay Kulkarni',
    'OWNER',
    true
),
(
    '00000000-0000-0000-0002-000000000002'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'ramesh.tech@repairreach.in',
    '+919876543211',
    'Ramesh Pawar',
    'TECHNICIAN',
    true
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 5. Technician Profile & Capabilities
-- ----------------------------------------------------------------------------
INSERT INTO technician (
    id,
    business_id,
    user_id,
    full_name,
    phone,
    email,
    home_location_lat,
    home_location_lon,
    is_active
) VALUES (
    '00000000-0000-0000-0003-000000000001'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    '00000000-0000-0000-0002-000000000002'::uuid,
    'Ramesh Pawar',
    '+919876543211',
    'ramesh.tech@repairreach.in',
    17.66000000,
    75.90000000,
    true
) ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    home_location_lat = EXCLUDED.home_location_lat,
    home_location_lon = EXCLUDED.home_location_lon,
    is_active = EXCLUDED.is_active;

-- Technician Capabilities for core appliances
INSERT INTO technician_capability (
    id,
    technician_id,
    capability_key,
    proficiency_level,
    is_active
) VALUES
(
    '00000000-0000-0000-0004-000000000001'::uuid,
    '00000000-0000-0000-0003-000000000001'::uuid,
    'WASHING_MACHINE',
    'EXPERT',
    true
),
(
    '00000000-0000-0000-0004-000000000002'::uuid,
    '00000000-0000-0000-0003-000000000001'::uuid,
    'REFRIGERATOR',
    'EXPERT',
    true
),
(
    '00000000-0000-0000-0004-000000000003'::uuid,
    '00000000-0000-0000-0003-000000000001'::uuid,
    'MICROWAVE',
    'EXPERT',
    true
),
(
    '00000000-0000-0000-0004-000000000004'::uuid,
    '00000000-0000-0000-0003-000000000001'::uuid,
    'AC',
    'EXPERT',
    true
),
(
    '00000000-0000-0000-0004-000000000005'::uuid,
    '00000000-0000-0000-0003-000000000001'::uuid,
    'TV',
    'EXPERT',
    true
) ON CONFLICT (technician_id, capability_key) DO UPDATE SET
    proficiency_level = EXCLUDED.proficiency_level,
    is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 6. Availability Rules (Business & Primary Technician)
-- ----------------------------------------------------------------------------

-- Business Working Hours (Mon-Sat 09:00-19:00 with 14:00-16:00 Break; Sun 09:00-14:00)
-- day_of_week: 1=Monday ... 7=Sunday
INSERT INTO availability_rule (
    business_id,
    technician_id,
    day_of_week,
    start_time,
    end_time,
    is_break,
    is_active
) VALUES
-- Monday to Saturday Working Window
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 1, '09:00:00', '19:00:00', false, true),
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 2, '09:00:00', '19:00:00', false, true),
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 3, '09:00:00', '19:00:00', false, true),
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 4, '09:00:00', '19:00:00', false, true),
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 5, '09:00:00', '19:00:00', false, true),
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 6, '09:00:00', '19:00:00', false, true),
-- Monday to Saturday Afternoon Break
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 1, '14:00:00', '16:00:00', true, true),
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 2, '14:00:00', '16:00:00', true, true),
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 3, '14:00:00', '16:00:00', true, true),
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 4, '14:00:00', '16:00:00', true, true),
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 5, '14:00:00', '16:00:00', true, true),
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 6, '14:00:00', '16:00:00', true, true),
-- Sunday Working Window (No afternoon shift on Sunday)
('00000000-0000-0000-0001-000000000001'::uuid, NULL, 7, '09:00:00', '14:00:00', false, true),

-- Primary Technician Availability Rules
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 1, '09:00:00', '19:00:00', false, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 2, '09:00:00', '19:00:00', false, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 3, '09:00:00', '19:00:00', false, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 4, '09:00:00', '19:00:00', false, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 5, '09:00:00', '19:00:00', false, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 6, '09:00:00', '19:00:00', false, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 1, '14:00:00', '16:00:00', true, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 2, '14:00:00', '16:00:00', true, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 3, '14:00:00', '16:00:00', true, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 4, '14:00:00', '16:00:00', true, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 5, '14:00:00', '16:00:00', true, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 6, '14:00:00', '16:00:00', true, true),
('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0003-000000000001'::uuid, 7, '09:00:00', '14:00:00', false, true);

-- ----------------------------------------------------------------------------
-- 7. Configurable Service Offerings (Mobile Repair STRICTLY EXCLUDED)
-- ----------------------------------------------------------------------------
INSERT INTO service_offering (
    id,
    business_id,
    code,
    name,
    description,
    category,
    base_duration_minutes,
    buffer_duration_minutes,
    supports_home_service,
    supports_workshop_repair,
    supports_device_transfer,
    is_published,
    display_order
) VALUES
(
    '00000000-0000-0000-0005-000000000001'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'WASHING_MACHINE_REPAIR',
    'Washing Machine Repair & Service',
    'Front-load, top-load, and semi-automatic washing machine diagnosis, motor repairs, spin cycle issues, and water drainage fixes.',
    'HOME_APPLIANCE',
    60,
    0,
    true,
    true,
    true,
    true,
    1
),
(
    '00000000-0000-0000-0005-000000000002'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'REFRIGERATOR_REPAIR',
    'Refrigerator Repair & Service',
    'Single door, double door, and frost-free refrigerator cooling repair, gas refilling, compressor check, and thermostat replacement.',
    'HOME_APPLIANCE',
    60,
    0,
    true,
    true,
    true,
    true,
    2
),
(
    '00000000-0000-0000-0005-000000000003'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'MICROWAVE_REPAIR',
    'Microwave Oven Repair & Service',
    'Convection, grill, and solo microwave heating issues, magnetron replacement, keypad repair, and turntable motor fix.',
    'HOME_APPLIANCE',
    60,
    0,
    true,
    true,
    true,
    true,
    3
),
(
    '00000000-0000-0000-0005-000000000004'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'AC_REPAIR',
    'Air Conditioner Repair & Servicing',
    'Split and window AC deep cleaning, gas charging, cooling issue troubleshooting, PCB repair, and fan motor servicing.',
    'HOME_APPLIANCE',
    60,
    0,
    true,
    true,
    true,
    true,
    4
),
(
    '00000000-0000-0000-0005-000000000005'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'TV_REPAIR',
    'Television & Display Repair',
    'LED, LCD, and Smart TV panel diagnosis, backlight strip replacement, motherboard repair, and sound/display fix.',
    'ELECTRONICS',
    60,
    0,
    true,
    true,
    true,
    true,
    5
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    base_duration_minutes = EXCLUDED.base_duration_minutes,
    buffer_duration_minutes = EXCLUDED.buffer_duration_minutes,
    supports_home_service = EXCLUDED.supports_home_service,
    supports_workshop_repair = EXCLUDED.supports_workshop_repair,
    supports_device_transfer = EXCLUDED.supports_device_transfer,
    is_published = EXCLUDED.is_published,
    display_order = EXCLUDED.display_order;

-- ----------------------------------------------------------------------------
-- 8. Service Requirements (Linking Service Offerings to Capabilities)
-- ----------------------------------------------------------------------------
INSERT INTO service_requirement (
    id,
    service_offering_id,
    requirement_key,
    is_mandatory
) VALUES
(
    '00000000-0000-0000-0006-000000000001'::uuid,
    '00000000-0000-0000-0005-000000000001'::uuid,
    'WASHING_MACHINE',
    true
),
(
    '00000000-0000-0000-0006-000000000002'::uuid,
    '00000000-0000-0000-0005-000000000002'::uuid,
    'REFRIGERATOR',
    true
),
(
    '00000000-0000-0000-0006-000000000003'::uuid,
    '00000000-0000-0000-0005-000000000003'::uuid,
    'MICROWAVE',
    true
),
(
    '00000000-0000-0000-0006-000000000004'::uuid,
    '00000000-0000-0000-0005-000000000004'::uuid,
    'AC',
    true
),
(
    '00000000-0000-0000-0006-000000000005'::uuid,
    '00000000-0000-0000-0005-000000000005'::uuid,
    'TV',
    true
) ON CONFLICT (service_offering_id, requirement_key) DO UPDATE SET
    is_mandatory = EXCLUDED.is_mandatory;

-- ----------------------------------------------------------------------------
-- 9. Curated Testimonials for Solapur Customers
-- ----------------------------------------------------------------------------
INSERT INTO testimonial (
    id,
    business_id,
    customer_name,
    rating,
    review_text,
    service_type_display,
    location_display,
    provenance,
    is_published,
    display_order
) VALUES
(
    '00000000-0000-0000-0007-000000000001'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'Rajesh Sharma',
    5,
    'Prompt and honest service for our LG front load washing machine in Navi Peth. The technician arrived on time, diagnosed the drum vibration issue quickly, and charged standard visiting rates.',
    'Washing Machine Repair',
    'Navi Peth, Solapur',
    'MANUAL_CURATED',
    true,
    1
),
(
    '00000000-0000-0000-0007-000000000002'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'Anjali Deshmukh',
    5,
    'Excellent TV repair service! Our Samsung Smart LED display had stopped working. The technician fixed the backlight panel on the same day. Very transparent pricing.',
    'TV Repair',
    'Hotgi Road, Solapur',
    'MANUAL_CURATED',
    true,
    2
),
(
    '00000000-0000-0000-0007-000000000003'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'Vikram Patil',
    5,
    'Our double-door refrigerator was not cooling during the hot summer. RepairReach technician came within the booked slot, recharged the refrigerant gas, and fixed the thermostat issue.',
    'Refrigerator Repair',
    'Jule Solapur',
    'MANUAL_CURATED',
    true,
    3
),
(
    '00000000-0000-0000-0007-000000000004'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'Sunita Kulkarni',
    5,
    'Very professional AC deep cleaning and servicing. The technician explained all maintenance steps clearly and left the work area clean. Highly recommended in Solapur!',
    'AC Servicing',
    'Saat Rasta, Solapur',
    'MANUAL_CURATED',
    true,
    4
),
(
    '00000000-0000-0000-0007-000000000005'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    'Mahesh Joshi',
    5,
    'Microwave heating issue was resolved within an hour. Genuine spare parts used and clear explanation of the repair warranty provided.',
    'Microwave Repair',
    'Budhwar Peth, Solapur',
    'MANUAL_CURATED',
    true,
    5
) ON CONFLICT (id) DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    rating = EXCLUDED.rating,
    review_text = EXCLUDED.review_text,
    service_type_display = EXCLUDED.service_type_display,
    location_display = EXCLUDED.location_display,
    provenance = EXCLUDED.provenance,
    is_published = EXCLUDED.is_published,
    display_order = EXCLUDED.display_order;
