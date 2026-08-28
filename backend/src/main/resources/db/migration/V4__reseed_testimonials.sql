-- V4__reseed_testimonials.sql
-- Ensure curated testimonials are present in all environments

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
    'Sneha Kulkarni',
    4,
    'Fixed our convection microwave oven heating issue smoothly. Genuine spare parts used and complete invoice provided. Highly recommended for home appliance repair in Solapur.',
    'Microwave Oven Repair',
    'Saat Rasta, Solapur',
    'MANUAL_CURATED',
    true,
    4
) ON CONFLICT (id) DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    rating = EXCLUDED.rating,
    review_text = EXCLUDED.review_text,
    is_published = EXCLUDED.is_published,
    display_order = EXCLUDED.display_order;
