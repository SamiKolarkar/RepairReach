#!/usr/bin/env python3
"""
Tier 5 Adversarial Database Migration Test Suite
Performs empirical stress testing, constraint verification, and boundary analysis
on RepairReach PostgreSQL database schema (V1__initial_schema.sql, V2__seed_data.sql).
"""

import sys
import os
import uuid
import datetime
import psycopg2
import psycopg2.extras

DB_HOST = os.environ.get("RR_DB_HOST", "localhost")
DB_PORT = int(os.environ.get("RR_DB_PORT", "54332"))
DB_USER = os.environ.get("RR_DB_USER", "postgres")
DB_PASS = os.environ.get("RR_DB_PASS", "postgres")
DB_NAME = os.environ.get("RR_DB_NAME", "repairreach_adversarial")

passed_tests = 0
failed_tests = 0
test_results = []

def record_test(name, passed, detail=""):
    global passed_tests, failed_tests
    if passed:
        passed_tests += 1
        test_results.append({"name": name, "status": "PASS", "detail": detail})
        print(f"  [PASS] {name} {detail}")
    else:
        failed_tests += 1
        test_results.append({"name": name, "status": "FAIL", "detail": detail})
        print(f"  [FAIL] {name} - ERROR: {detail}")

def get_conn():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        dbname=DB_NAME
    )
    conn.autocommit = False
    return conn

def setup_test_fixtures(cur):
    """Ensure baseline test fixtures exist (e.g. sample customer, job, booking)"""
    cur.execute("SELECT id FROM business WHERE code = 'SOLAPUR_MAIN';")
    biz_id = cur.fetchone()[0]
    
    cur.execute("SELECT id FROM technician WHERE business_id = %s LIMIT 1;", (biz_id,))
    tech_id = cur.fetchone()[0]
    
    cur.execute("SELECT id FROM service_offering WHERE code = 'WASHING_MACHINE_REPAIR';")
    service_id = cur.fetchone()[0]
    
    # Clean up any residual schedule entries from previous test runs
    cur.execute("DELETE FROM schedule_entry WHERE technician_id = %s;", (tech_id,))
    
    # Create test customer
    cust_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO customer (id, business_id, normalized_phone, full_name)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (business_id, normalized_phone) DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING id;
    """, (cust_id, biz_id, '+919999000001', 'Adversarial Test Customer'))
    cust_id = cur.fetchone()[0]
    
    # Create test booking
    booking_id = str(uuid.uuid4())
    pub_ref = f"BK-TEST-{uuid.uuid4().hex[:8].upper()}"
    cap_token = f"cap-test-{uuid.uuid4().hex}"
    cur.execute("""
        INSERT INTO booking (
            id, business_id, public_reference, customer_id, service_offering_id,
            customer_name_snapshot, customer_phone_snapshot, service_name_snapshot,
            address_snapshot, problem_description, requested_slot_start, requested_slot_end,
            capability_token, capability_token_expires_at
        ) VALUES (
            %s, %s, %s, %s, %s,
            'Adversarial Test Customer', '+919999000001', 'Washing Machine Repair',
            '123 Test Street, Solapur', 'Noise during spin cycle',
            NOW(), NOW() + interval '1 hour',
            %s, NOW() + interval '7 days'
        ) RETURNING id;
    """, (booking_id, biz_id, pub_ref, cust_id, service_id, cap_token))
    booking_id = cur.fetchone()[0]
    
    # Create test job
    job_id = str(uuid.uuid4())
    job_ref = f"JOB-TEST-{uuid.uuid4().hex[:8].upper()}"
    fb_token = f"fb-test-{uuid.uuid4().hex}"
    cur.execute("""
        INSERT INTO job (
            id, business_id, booking_id, job_reference, customer_id,
            planned_start_time, planned_end_time, feedback_capability_token
        ) VALUES (
            %s, %s, %s, %s, %s,
            NOW(), NOW() + interval '1 hour', %s
        ) RETURNING id;
    """, (job_id, biz_id, booking_id, job_ref, cust_id, fb_token))
    job_id = cur.fetchone()[0]
    
    return {
        "biz_id": biz_id,
        "tech_id": tech_id,
        "service_id": service_id,
        "cust_id": cust_id,
        "booking_id": booking_id,
        "job_id": job_id
    }

# ============================================================================
# 1. Rating Boundary Tests
# ============================================================================
def test_rating_boundaries(fixtures):
    print("\n--- Running Section 1: Rating Boundary Constraints ---")
    biz_id = fixtures["biz_id"]
    cust_id = fixtures["cust_id"]
    
    # 1.1 feedback rating boundaries
    # Valid ratings: 1, 2, 3, 4, 5
    for r in [1, 2, 3, 4, 5]:
        conn = get_conn()
        cur = conn.cursor()
        try:
            # Need unique job and booking for feedback due to unique constraint on job_id
            b_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO booking (
                    id, business_id, public_reference, customer_id, service_offering_id,
                    customer_name_snapshot, customer_phone_snapshot, service_name_snapshot,
                    address_snapshot, problem_description, requested_slot_start, requested_slot_end,
                    capability_token, capability_token_expires_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    'Rating Test', '+919999000001', 'Washing Machine',
                    'Address', 'Problem', NOW(), NOW() + interval '1 hour',
                    %s, NOW() + interval '1 day'
                );
            """, (b_id, biz_id, f"BK-R-{uuid.uuid4().hex[:6]}", cust_id, fixtures["service_id"], f"cap-r-{uuid.uuid4().hex}"))
            
            j_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO job (id, business_id, booking_id, job_reference, customer_id, planned_start_time, planned_end_time)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW() + interval '1 hour');
            """, (j_id, biz_id, b_id, f"JOB-R-{uuid.uuid4().hex[:6]}", cust_id))
            
            cur.execute("""
                INSERT INTO feedback (job_id, booking_id, customer_id, rating, comment)
                VALUES (%s, %s, %s, %s, %s);
            """, (j_id, b_id, cust_id, r, f"Valid rating test {r}"))
            conn.commit()
            record_test(f"feedback.rating valid value ({r})", True)
        except Exception as e:
            conn.rollback()
            record_test(f"feedback.rating valid value ({r})", False, str(e))
        finally:
            conn.close()
            
    # Invalid ratings on feedback: 0, 6, -1, 100
    for r in [0, 6, -1, 100]:
        conn = get_conn()
        cur = conn.cursor()
        try:
            b_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO booking (
                    id, business_id, public_reference, customer_id, service_offering_id,
                    customer_name_snapshot, customer_phone_snapshot, service_name_snapshot,
                    address_snapshot, problem_description, requested_slot_start, requested_slot_end,
                    capability_token, capability_token_expires_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    'Rating Test', '+919999000001', 'Washing Machine',
                    'Address', 'Problem', NOW(), NOW() + interval '1 hour',
                    %s, NOW() + interval '1 day'
                );
            """, (b_id, biz_id, f"BK-R-{uuid.uuid4().hex[:6]}", cust_id, fixtures["service_id"], f"cap-r-{uuid.uuid4().hex}"))
            
            j_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO job (id, business_id, booking_id, job_reference, customer_id, planned_start_time, planned_end_time)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW() + interval '1 hour');
            """, (j_id, biz_id, b_id, f"JOB-R-{uuid.uuid4().hex[:6]}", cust_id))
            
            cur.execute("""
                INSERT INTO feedback (job_id, booking_id, customer_id, rating, comment)
                VALUES (%s, %s, %s, %s, %s);
            """, (j_id, b_id, cust_id, r, f"Invalid rating test {r}"))
            conn.commit()
            record_test(f"feedback.rating rejection for invalid value ({r})", False, f"Expected CHECK constraint violation, but rating {r} succeeded")
        except psycopg2.errors.CheckViolation:
            conn.rollback()
            record_test(f"feedback.rating rejection for invalid value ({r})", True, "CheckViolation raised correctly")
        except Exception as e:
            conn.rollback()
            record_test(f"feedback.rating rejection for invalid value ({r})", False, f"Unexpected error type: {type(e).__name__}: {e}")
        finally:
            conn.close()

    # 1.2 testimonial rating boundaries
    for r, should_pass in [(1, True), (5, True), (0, False), (6, False), (-5, False)]:
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO testimonial (business_id, customer_name, rating, review_text, service_type_display)
                VALUES (%s, 'Testimonial Tester', %s, 'Review text', 'AC Repair');
            """, (biz_id, r))
            conn.commit()
            if should_pass:
                record_test(f"testimonial.rating boundary test ({r})", True, "Accepted valid rating")
            else:
                record_test(f"testimonial.rating boundary test ({r})", False, f"Rating {r} should have failed CHECK constraint")
        except psycopg2.errors.CheckViolation:
            conn.rollback()
            if not should_pass:
                record_test(f"testimonial.rating boundary test ({r})", True, "CheckViolation raised correctly")
            else:
                record_test(f"testimonial.rating boundary test ({r})", False, "Valid rating was incorrectly rejected")
        except Exception as e:
            conn.rollback()
            record_test(f"testimonial.rating boundary test ({r})", False, str(e))
        finally:
            conn.close()

    # 1.3 review_sync_record rating boundaries
    for r, should_pass in [(1, True), (5, True), (0, False), (6, False)]:
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO review_sync_record (
                    business_id, provider, external_review_id, author_name, rating,
                    review_timestamp, content_hash
                ) VALUES (
                    %s, 'GOOGLE_REVIEWS', %s, 'Google Reviewer', %s,
                    NOW(), md5(%s)
                );
            """, (biz_id, f"ext-{uuid.uuid4().hex[:8]}", r, f"hash-{uuid.uuid4().hex}"))
            conn.commit()
            if should_pass:
                record_test(f"review_sync_record.rating boundary test ({r})", True, "Accepted valid rating")
            else:
                record_test(f"review_sync_record.rating boundary test ({r})", False, f"Rating {r} should have failed")
        except psycopg2.errors.CheckViolation:
            conn.rollback()
            if not should_pass:
                record_test(f"review_sync_record.rating boundary test ({r})", True, "CheckViolation raised correctly")
            else:
                record_test(f"review_sync_record.rating boundary test ({r})", False, "Valid rating was rejected")
        except Exception as e:
            conn.rollback()
            record_test(f"review_sync_record.rating boundary test ({r})", False, str(e))
        finally:
            conn.close()

# ============================================================================
# 2. Time Range & GiST Overlap Exclusion Constraint Tests
# ============================================================================
def test_time_range_and_gist(fixtures):
    print("\n--- Running Section 2: Time Range & GiST Exclusion Constraints ---")
    biz_id = fixtures["biz_id"]
    tech_id = fixtures["tech_id"]
    
    # 2.1 schedule_entry_interval_check: end_time > start_time
    # Case A: end_time < start_time (Fail)
    conn = get_conn()
    cur = conn.cursor()
    try:
        t_start = datetime.datetime.now(datetime.timezone.utc)
        t_end = t_start - datetime.timedelta(minutes=30)
        cur.execute("""
            INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type)
            VALUES (%s, %s, %s, %s, 'HOME_VISIT');
        """, (biz_id, tech_id, t_start, t_end))
        conn.commit()
        record_test("schedule_entry end_time < start_time rejection", False, "Expected CHECK violation but succeeded")
    except (psycopg2.errors.CheckViolation, psycopg2.errors.DataError) as e:
        conn.rollback()
        record_test("schedule_entry end_time < start_time rejection", True, f"Rejected invalid interval by {type(e).__name__}: {e.args[0].strip()}")
    except Exception as e:
        conn.rollback()
        record_test("schedule_entry end_time < start_time rejection", False, str(e))
    finally:
        conn.close()

    # Case B: end_time == start_time (Fail)
    conn = get_conn()
    cur = conn.cursor()
    try:
        t_start = datetime.datetime.now(datetime.timezone.utc)
        cur.execute("""
            INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type)
            VALUES (%s, %s, %s, %s, 'HOME_VISIT');
        """, (biz_id, tech_id, t_start, t_start))
        conn.commit()
        record_test("schedule_entry end_time == start_time rejection", False, "Expected CHECK violation for zero-duration slot")
    except psycopg2.errors.CheckViolation:
        conn.rollback()
        record_test("schedule_entry end_time == start_time rejection", True, "Zero duration rejected by end_time > start_time")
    except Exception as e:
        conn.rollback()
        record_test("schedule_entry end_time == start_time rejection", False, str(e))
    finally:
        conn.close()

    # Case C: sub-second duration end_time = start_time + 1 millisecond (Pass interval check)
    conn = get_conn()
    cur = conn.cursor()
    try:
        t_start = datetime.datetime(2027, 1, 1, 10, 0, 0, tzinfo=datetime.timezone.utc)
        t_end = t_start + datetime.timedelta(milliseconds=1)
        cur.execute("""
            INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type)
            VALUES (%s, %s, %s, %s, 'HOME_VISIT')
            RETURNING id, active_interval, schedule_date;
        """, (biz_id, tech_id, t_start, t_end))
        row = cur.fetchone()
        conn.commit()
        record_test("schedule_entry sub-second end_time > start_time accepted", True, f"Created entry {row[0]}")
    except Exception as e:
        conn.rollback()
        record_test("schedule_entry sub-second end_time > start_time accepted", False, str(e))
    finally:
        conn.close()

    # 2.2 Trigger verification: active_interval and schedule_date generation
    conn = get_conn()
    cur = conn.cursor()
    try:
        # UTC 18:30 on 2027-05-10 is 00:00 on 2027-05-11 in Asia/Kolkata (+05:30)
        t_start = datetime.datetime(2027, 5, 10, 18, 30, 0, tzinfo=datetime.timezone.utc)
        t_end = datetime.datetime(2027, 5, 10, 19, 30, 0, tzinfo=datetime.timezone.utc)
        cur.execute("""
            INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type)
            VALUES (%s, %s, %s, %s, 'HOME_VISIT')
            RETURNING active_interval, schedule_date;
        """, (biz_id, tech_id, t_start, t_end))
        row = cur.fetchone()
        conn.commit()
        act_interval, sched_date = row[0], row[1]
        
        # Verify schedule_date is 2027-05-11
        if str(sched_date) == "2027-05-11":
            record_test("Trigger trg_sync_schedule_entry_interval sets Asia/Kolkata date correctly", True, f"Date: {sched_date}")
        else:
            record_test("Trigger trg_sync_schedule_entry_interval sets Asia/Kolkata date correctly", False, f"Expected 2027-05-11, got {sched_date}")
            
        # Verify active_interval is half-open '[)'
        cur.execute("SELECT lower_inc(%s), upper_inc(%s);", (act_interval, act_interval))
        inc_res = cur.fetchone()
        if inc_res[0] is True and inc_res[1] is False:
            record_test("Trigger trg_sync_schedule_entry_interval formats half-open range '[)'", True, f"Range: {act_interval}")
        else:
            record_test("Trigger trg_sync_schedule_entry_interval formats half-open range '[)'", False, f"Expected [), got {inc_res}")
    except Exception as e:
        conn.rollback()
        record_test("Trigger trg_sync_schedule_entry_interval verification", False, str(e))
    finally:
        conn.close()

    # 2.3 GiST Overlap Exclusion Invariants
    # Base Slot: 2027-06-01 10:00 to 11:00 UTC
    t_base_start = datetime.datetime(2027, 6, 1, 10, 0, 0, tzinfo=datetime.timezone.utc)
    t_base_end = datetime.datetime(2027, 6, 1, 11, 0, 0, tzinfo=datetime.timezone.utc)
    
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type, status)
        VALUES (%s, %s, %s, %s, 'HOME_VISIT', 'ACTIVE')
        RETURNING id;
    """, (biz_id, tech_id, t_base_start, t_base_end))
    base_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    
    # Test A: Direct overlap (10:30 to 11:30) for same technician -> Must Fail Exclusion
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type, status)
            VALUES (%s, %s, %s, %s, 'HOME_VISIT', 'ACTIVE');
        """, (biz_id, tech_id, t_base_start + datetime.timedelta(minutes=30), t_base_end + datetime.timedelta(minutes=30)))
        conn.commit()
        record_test("GiST exclusion: overlapping active slot rejected", False, "Overlapping slot was permitted!")
    except psycopg2.errors.ExclusionViolation:
        conn.rollback()
        record_test("GiST exclusion: overlapping active slot rejected", True, "ExclusionViolation raised as expected")
    except Exception as e:
        conn.rollback()
        record_test("GiST exclusion: overlapping active slot rejected", False, str(e))
    finally:
        conn.close()

    # Test B: Exact duplicate slot (10:00 to 11:00) for same technician -> Must Fail Exclusion
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type, status)
            VALUES (%s, %s, %s, %s, 'HOME_VISIT', 'ACTIVE');
        """, (biz_id, tech_id, t_base_start, t_base_end))
        conn.commit()
        record_test("GiST exclusion: identical active slot rejected", False, "Duplicate slot was permitted!")
    except psycopg2.errors.ExclusionViolation:
        conn.rollback()
        record_test("GiST exclusion: identical active slot rejected", True, "ExclusionViolation raised as expected")
    except Exception as e:
        conn.rollback()
        record_test("GiST exclusion: identical active slot rejected", False, str(e))
    finally:
        conn.close()

    # Test C: Adjacent slot (11:00 to 12:00) for same technician -> Must SUCCEED (half-open [))
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type, status)
            VALUES (%s, %s, %s, %s, 'HOME_VISIT', 'ACTIVE')
            RETURNING id;
        """, (biz_id, tech_id, t_base_end, t_base_end + datetime.timedelta(hours=1)))
        conn.commit()
        record_test("GiST exclusion: succeeding adjacent slot [T2, T3) accepted", True, "Adjacent slot succeeded")
    except Exception as e:
        conn.rollback()
        record_test("GiST exclusion: succeeding adjacent slot [T2, T3) accepted", False, str(e))
    finally:
        conn.close()

    # Test D: Preceding adjacent slot (09:00 to 10:00) for same technician -> Must SUCCEED
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type, status)
            VALUES (%s, %s, %s, %s, 'HOME_VISIT', 'ACTIVE')
            RETURNING id;
        """, (biz_id, tech_id, t_base_start - datetime.timedelta(hours=1), t_base_start))
        conn.commit()
        record_test("GiST exclusion: preceding adjacent slot [T0, T1) accepted", True, "Preceding slot succeeded")
    except Exception as e:
        conn.rollback()
        record_test("GiST exclusion: preceding adjacent slot [T0, T1) accepted", False, str(e))
    finally:
        conn.close()

    # Test E: Overlapping slot (10:15 to 10:45) with status 'RELEASED' -> Must SUCCEED (Partial exclusion WHERE status = 'ACTIVE')
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type, status)
            VALUES (%s, %s, %s, %s, 'HOME_VISIT', 'RELEASED')
            RETURNING id;
        """, (biz_id, tech_id, t_base_start + datetime.timedelta(minutes=15), t_base_start + datetime.timedelta(minutes=45)))
        rel_id = cur.fetchone()[0]
        conn.commit()
        record_test("GiST partial index: overlapping RELEASED entry accepted", True, f"Released entry id: {rel_id}")
    except Exception as e:
        conn.rollback()
        record_test("GiST partial index: overlapping RELEASED entry accepted", False, str(e))
    finally:
        conn.close()

    # Test F: Reactivating a RELEASED entry (UPDATE status to 'ACTIVE') when it overlaps -> Must FAIL Exclusion!
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE schedule_entry SET status = 'ACTIVE' WHERE id = %s;
        """, (rel_id,))
        conn.commit()
        record_test("GiST exclusion: reactivating overlapping slot fails", False, "Update to ACTIVE on overlapping slot succeeded!")
    except psycopg2.errors.ExclusionViolation:
        conn.rollback()
        record_test("GiST exclusion: reactivating overlapping slot fails", True, "ExclusionViolation raised on reactivation UPDATE")
    except Exception as e:
        conn.rollback()
        record_test("GiST exclusion: reactivating overlapping slot fails", False, str(e))
    finally:
        conn.close()

    # Test G: Overlapping slot for a DIFFERENT technician -> Must SUCCEED
    # Create tech 2
    conn = get_conn()
    cur = conn.cursor()
    try:
        user2_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO application_user (id, business_id, email, phone, full_name, role)
            VALUES (%s, %s, %s, %s, %s, 'TECHNICIAN') RETURNING id;
        """, (user2_id, biz_id, f"tech2_{uuid.uuid4().hex[:6]}@repairreach.in", '+919876543999', 'Second Tech'))
        
        tech2_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO technician (id, business_id, user_id, full_name, phone)
            VALUES (%s, %s, %s, %s, %s) RETURNING id;
        """, (tech2_id, biz_id, user2_id, 'Second Tech', '+919876543999'))
        
        cur.execute("""
            INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type, status)
            VALUES (%s, %s, %s, %s, 'HOME_VISIT', 'ACTIVE')
            RETURNING id;
        """, (biz_id, tech2_id, t_base_start, t_base_end))
        conn.commit()
        record_test("GiST exclusion: overlapping slot for DIFFERENT technician accepted", True, "Different technician allowed")
    except Exception as e:
        conn.rollback()
        record_test("GiST exclusion: overlapping slot for DIFFERENT technician accepted", False, str(e))
    finally:
        conn.close()

# ============================================================================
# 3. Sunday Hours, Breaks, and Operating Windows in Seed Data
# ============================================================================
def test_operating_windows_and_seed_data(fixtures):
    print("\n--- Running Section 3: Sunday Hours, Afternoon Breaks, and Seed Data ---")
    biz_id = fixtures["biz_id"]
    tech_id = fixtures["tech_id"]
    
    conn = get_conn()
    cur = conn.cursor()
    try:
        # 3.1 Verify business_settings values
        cur.execute("""
            SELECT weekday_open_time, weekday_close_time, sunday_open_time, sunday_close_time,
                   afternoon_break_start, afternoon_break_end, visiting_charge_amount,
                   default_slot_duration_minutes, default_travel_buffer_minutes, max_advance_booking_days
            FROM business_settings WHERE business_id = %s;
        """, (biz_id,))
        bs = cur.fetchone()
        
        expected_settings = (
            datetime.time(9, 0),
            datetime.time(19, 0),
            datetime.time(9, 0),
            datetime.time(14, 0),
            datetime.time(14, 0),
            datetime.time(16, 0),
            299.00,
            60,
            30,
            14
        )
        
        actual_settings = (
            bs[0], bs[1], bs[2], bs[3], bs[4], bs[5],
            float(bs[6]), bs[7], bs[8], bs[9]
        )
        
        if actual_settings == expected_settings:
            record_test("business_settings seed values match specification", True, f"Settings: {actual_settings}")
        else:
            record_test("business_settings seed values match specification", False, f"Expected {expected_settings}, got {actual_settings}")

        # 3.2 Verify availability_rule Mon-Sat (1..6) working windows (09:00 - 19:00)
        cur.execute("""
            SELECT count(*) FROM availability_rule
            WHERE business_id = %s AND technician_id IS NULL AND day_of_week BETWEEN 1 AND 6
              AND is_break = false AND start_time = '09:00:00' AND end_time = '19:00:00' AND is_active = true;
        """, (biz_id,))
        count_weekday_work = cur.fetchone()[0]
        if count_weekday_work == 6:
            record_test("availability_rule business Mon-Sat working windows (09:00-19:00) present", True, "6 days configured")
        else:
            record_test("availability_rule business Mon-Sat working windows (09:00-19:00) present", False, f"Expected 6, got {count_weekday_work}")

        # 3.3 Verify availability_rule Mon-Sat (1..6) afternoon breaks (14:00 - 16:00)
        cur.execute("""
            SELECT count(*) FROM availability_rule
            WHERE business_id = %s AND technician_id IS NULL AND day_of_week BETWEEN 1 AND 6
              AND is_break = true AND start_time = '14:00:00' AND end_time = '16:00:00' AND is_active = true;
        """, (biz_id,))
        count_weekday_breaks = cur.fetchone()[0]
        if count_weekday_breaks == 6:
            record_test("availability_rule business Mon-Sat afternoon breaks (14:00-16:00) present", True, "6 break rules configured")
        else:
            record_test("availability_rule business Mon-Sat afternoon breaks (14:00-16:00) present", False, f"Expected 6, got {count_weekday_breaks}")

        # 3.4 Verify availability_rule Sunday (7) working window (09:00 - 14:00) and NO afternoon break
        cur.execute("""
            SELECT count(*) FROM availability_rule
            WHERE business_id = %s AND technician_id IS NULL AND day_of_week = 7
              AND is_break = false AND start_time = '09:00:00' AND end_time = '14:00:00' AND is_active = true;
        """, (biz_id,))
        count_sunday_work = cur.fetchone()[0]
        
        cur.execute("""
            SELECT count(*) FROM availability_rule
            WHERE business_id = %s AND technician_id IS NULL AND day_of_week = 7
              AND is_break = true;
        """, (biz_id,))
        count_sunday_breaks = cur.fetchone()[0]
        
        if count_sunday_work == 1 and count_sunday_breaks == 0:
            record_test("availability_rule Sunday configuration (09:00-14:00, no afternoon break) verified", True, "Sunday window verified")
        else:
            record_test("availability_rule Sunday configuration verified", False, f"Sunday work: {count_sunday_work}, breaks: {count_sunday_breaks}")

        # 3.5 Verify primary technician availability rules mirror business rules (13 rules)
        cur.execute("""
            SELECT count(*) FROM availability_rule
            WHERE business_id = %s AND technician_id = %s AND is_active = true;
        """, (biz_id, tech_id))
        count_tech_rules = cur.fetchone()[0]
        if count_tech_rules == 13:
            record_test("Primary technician availability rules count == 13", True, f"Found {count_tech_rules} rules")
        else:
            record_test("Primary technician availability rules count == 13", False, f"Expected 13, got {count_tech_rules}")

        # 3.6 Check day_of_week constraint: day_of_week BETWEEN 1 AND 7
        for dow, should_pass in [(0, False), (1, True), (7, True), (8, False), (-1, False)]:
            c = get_conn()
            cur_dow = c.cursor()
            try:
                cur_dow.execute("""
                    INSERT INTO availability_rule (business_id, day_of_week, start_time, end_time)
                    VALUES (%s, %s, '09:00:00', '18:00:00');
                """, (biz_id, dow))
                c.commit()
                if should_pass:
                    record_test(f"availability_rule day_of_week boundary ({dow})", True, "Accepted valid day")
                else:
                    record_test(f"availability_rule day_of_week boundary ({dow})", False, "Invalid day succeeded")
            except psycopg2.errors.CheckViolation:
                c.rollback()
                if not should_pass:
                    record_test(f"availability_rule day_of_week boundary ({dow})", True, "Rejected invalid day")
                else:
                    record_test(f"availability_rule day_of_week boundary ({dow})", False, "Valid day rejected")
            except Exception as e:
                c.rollback()
                record_test(f"availability_rule day_of_week boundary ({dow})", False, str(e))
            finally:
                c.close()

    except Exception as e:
        record_test("Operating windows and seed data verification", False, str(e))
    finally:
        conn.close()

# ============================================================================
# 4. Partial Index and Query Index Presence
# ============================================================================
def test_indexes():
    print("\n--- Running Section 4: Partial Indexes & Query Indexes ---")
    conn = get_conn()
    cur = conn.cursor()
    try:
        # 4.1 Verify partial index idx_outbox_event_polling
        cur.execute("""
            SELECT indexname, indexdef FROM pg_indexes
            WHERE tablename = 'outbox_event' AND indexname = 'idx_outbox_event_polling';
        """)
        row = cur.fetchone()
        if row and "WHERE (status = ANY (ARRAY['PENDING'::outbox_status_enum, 'PROCESSING'::outbox_status_enum]))" in row[1] or (row and "WHERE" in row[1] and "PENDING" in row[1]):
            record_test("Partial index idx_outbox_event_polling definition verified", True, row[1])
        else:
            record_test("Partial index idx_outbox_event_polling definition verified", False, f"Got {row}")

        # Check EXPLAIN uses index on pending outbox polling
        cur.execute("""
            EXPLAIN SELECT * FROM outbox_event
            WHERE status = 'PENDING' AND next_attempt_at <= NOW();
        """)
        plan = "\n".join([r[0] for r in cur.fetchall()])
        # Note: on small / empty tables Postgres might use Seq Scan, so we can test with SET enable_seqscan = off;
        cur.execute("SET enable_seqscan = off;")
        cur.execute("""
            EXPLAIN SELECT * FROM outbox_event
            WHERE status = 'PENDING' AND next_attempt_at <= NOW();
        """)
        forced_plan = "\n".join([r[0] for r in cur.fetchall()])
        cur.execute("SET enable_seqscan = on;")
        
        if "idx_outbox_event_polling" in forced_plan:
            record_test("Query planner uses idx_outbox_event_polling for outbox polling query", True, "Index Scan verified")
        else:
            record_test("Query planner uses idx_outbox_event_polling for outbox polling query", False, f"Plan: {forced_plan}")

        # 4.2 Verify presence of mandatory query and FK indexes
        mandatory_indexes = [
            ("business_location", "idx_business_location_business"),
            ("application_user", "idx_application_user_business"),
            ("technician", "idx_technician_user"),
            ("technician", "idx_technician_active"),
            ("technician_capability", "idx_technician_capability_lookup"),
            ("service_offering", "idx_service_offering_lookup"),
            ("service_offering", "idx_service_offering_display"),
            ("customer", "idx_customer_phone"),
            ("customer_address", "idx_customer_address_cust"),
            ("customer_device", "idx_customer_device_cust"),
            ("availability_rule", "idx_availability_rule_query"),
            ("availability_exception", "idx_availability_exception_query"),
            ("booking", "idx_booking_customer"),
            ("booking", "idx_booking_public_ref"),
            ("booking", "idx_booking_capability_token"),
            ("booking", "idx_booking_state_date"),
            ("job", "idx_job_booking"),
            ("job", "idx_job_customer"),
            ("job", "idx_job_reference"),
            ("job", "idx_job_state_planned"),
            ("job", "idx_job_feedback_token"),
            ("job_event", "idx_job_event_job"),
            ("assignment", "idx_assignment_job_current"),
            ("assignment", "idx_assignment_technician_status"),
            ("schedule_entry", "idx_schedule_entry_query"),
            ("schedule_entry", "idx_schedule_entry_job"),
            ("schedule_entry", "idx_schedule_entry_booking"),
            ("schedule_revision", "idx_schedule_revision_entry"),
            ("feedback", "idx_feedback_job"),
            ("feedback", "idx_feedback_booking"),
            ("feedback", "idx_feedback_customer"),
            ("feedback_analysis", "idx_feedback_analysis_status"),
            ("escalation", "idx_escalation_status"),
            ("testimonial", "idx_testimonial_published"),
            ("review_sync_record", "idx_review_sync_lookup"),
            ("notification_attempt", "idx_notification_attempt_outbox"),
            ("audit_event", "idx_audit_event_aggregate"),
            ("audit_event", "idx_audit_event_actor"),
            ("idempotency_record", "idx_idempotency_lookup")
        ]
        
        cur.execute("SELECT indexname FROM pg_indexes WHERE schemaname = 'public';")
        existing_indexes = set([r[0] for r in cur.fetchall()])
        
        missing_indexes = []
        for tbl, idx in mandatory_indexes:
            if idx not in existing_indexes:
                missing_indexes.append((tbl, idx))
                
        if not missing_indexes:
            record_test(f"All {len(mandatory_indexes)} mandatory query and FK indexes are present", True)
        else:
            record_test(f"All {len(mandatory_indexes)} mandatory query and FK indexes are present", False, f"Missing: {missing_indexes}")

    except Exception as e:
        record_test("Index presence verification", False, str(e))
    finally:
        conn.close()

# ============================================================================
# 5. Idempotency Record Uniqueness on (scope, idempotency_key)
# ============================================================================
def test_idempotency_uniqueness():
    print("\n--- Running Section 5: Idempotency Record Uniqueness ---")
    conn = get_conn()
    cur = conn.cursor()
    try:
        scope1 = "BOOKING_CREATION"
        scope2 = "FEEDBACK_SUBMISSION"
        ikey1 = str(uuid.uuid4())
        ikey2 = str(uuid.uuid4())
        
        # Insert 1: scope1 + ikey1 -> SUCCEED
        cur.execute("""
            INSERT INTO idempotency_record (scope, idempotency_key, request_hash, response_status, response_body, expires_at)
            VALUES (%s, %s, 'hash1', 201, '{"status":"OK"}'::jsonb, NOW() + interval '1 day')
            RETURNING id;
        """, (scope1, ikey1))
        conn.commit()
        record_test("idempotency_record initial insert (scope1, key1) accepted", True)
        
        # Insert 2: scope1 + ikey1 (duplicate) -> MUST FAIL uk_idempotency_scope_key
        try:
            cur.execute("""
                INSERT INTO idempotency_record (scope, idempotency_key, request_hash, response_status, response_body, expires_at)
                VALUES (%s, %s, 'hash2', 201, '{"status":"OK"}'::jsonb, NOW() + interval '1 day');
            """, (scope1, ikey1))
            conn.commit()
            record_test("idempotency_record duplicate (scope1, key1) rejected", False, "Duplicate key insert succeeded!")
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            record_test("idempotency_record duplicate (scope1, key1) rejected", True, "UniqueViolation raised on duplicate key within same scope")
            
        # Insert 3: scope2 + ikey1 (same key, different scope) -> MUST SUCCEED (Scope Isolation)
        cur.execute("""
            INSERT INTO idempotency_record (scope, idempotency_key, request_hash, response_status, response_body, expires_at)
            VALUES (%s, %s, 'hash3', 200, '{"status":"OK"}'::jsonb, NOW() + interval '1 day')
            RETURNING id;
        """, (scope2, ikey1))
        conn.commit()
        record_test("idempotency_record same key with different scope (scope2, key1) accepted", True, "Scope isolation verified")
        
        # Insert 4: scope1 + ikey2 (different key, same scope) -> MUST SUCCEED
        cur.execute("""
            INSERT INTO idempotency_record (scope, idempotency_key, request_hash, response_status, response_body, expires_at)
            VALUES (%s, %s, 'hash4', 201, '{"status":"OK"}'::jsonb, NOW() + interval '1 day')
            RETURNING id;
        """, (scope1, ikey2))
        conn.commit()
        record_test("idempotency_record different key in same scope (scope1, key2) accepted", True)

    except Exception as e:
        conn.rollback()
        record_test("idempotency_record uniqueness testing", False, str(e))
    finally:
        conn.close()

# ============================================================================
# 6. Multi-Tenant Foreign Key Cascades vs Restrict Policies
# ============================================================================
def test_fk_cascades_and_restricts(fixtures):
    print("\n--- Running Section 6: Foreign Key Cascades vs Restrict Policies ---")
    biz_id = fixtures["biz_id"]
    cust_id = fixtures["cust_id"]
    booking_id = fixtures["booking_id"]
    job_id = fixtures["job_id"]
    
    # 6.1 Business Deletion RESTRICT Protection
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM business WHERE id = %s;", (biz_id,))
        conn.commit()
        record_test("business deletion blocked by ON DELETE RESTRICT on child tables", False, "Catastrophic business deletion succeeded!")
    except (psycopg2.errors.ForeignKeyViolation, psycopg2.errors.RestrictViolation):
        conn.rollback()
        record_test("business deletion blocked by ON DELETE RESTRICT on child tables", True, "ForeignKeyViolation / RestrictViolation raised")
    except Exception as e:
        conn.rollback()
        record_test("business deletion blocked by ON DELETE RESTRICT on child tables", False, str(e))
    finally:
        conn.close()

    # 6.2 Customer Deletion Cascade to Address and Device, but RESTRICT on Booking
    # Case A: Attempt deleting customer when booking exists -> RESTRICT
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM customer WHERE id = %s;", (cust_id,))
        conn.commit()
        record_test("customer deletion blocked when active booking exists (ON DELETE RESTRICT)", False, "Customer with active booking was deleted!")
    except (psycopg2.errors.ForeignKeyViolation, psycopg2.errors.RestrictViolation):
        conn.rollback()
        record_test("customer deletion blocked when active booking exists (ON DELETE RESTRICT)", True, "ForeignKeyViolation on booking.customer_id")
    except Exception as e:
        conn.rollback()
        record_test("customer deletion blocked when active booking exists", False, str(e))
    finally:
        conn.close()

    # Case B: Create standalone customer with address and device, then delete -> Should CASCADE address and device
    conn = get_conn()
    cur = conn.cursor()
    try:
        c_temp_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO customer (id, business_id, normalized_phone, full_name)
            VALUES (%s, %s, %s, 'Cascade Test Customer') RETURNING id;
        """, (c_temp_id, biz_id, f"+9198{uuid.uuid4().hex[:8]}"))
        
        addr_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO customer_address (id, customer_id, address_line, city)
            VALUES (%s, %s, 'Cascade Lane', 'Solapur') RETURNING id;
        """, (addr_id, c_temp_id))
        
        dev_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO customer_device (id, customer_id, appliance_type, brand)
            VALUES (%s, %s, 'AC', 'LG') RETURNING id;
        """, (dev_id, c_temp_id))
        
        conn.commit()
        
        # Now delete customer
        cur.execute("DELETE FROM customer WHERE id = %s;", (c_temp_id,))
        conn.commit()
        
        # Verify address and device were cascaded
        cur.execute("SELECT count(*) FROM customer_address WHERE id = %s;", (addr_id,))
        addr_cnt = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM customer_device WHERE id = %s;", (dev_id,))
        dev_cnt = cur.fetchone()[0]
        
        if addr_cnt == 0 and dev_cnt == 0:
            record_test("customer deletion cascades to customer_address and customer_device", True, "Cascade verified")
        else:
            record_test("customer deletion cascades to customer_address and customer_device", False, f"Address: {addr_cnt}, Device: {dev_cnt}")
    except Exception as e:
        conn.rollback()
        record_test("customer cascade deletion test", False, str(e))
    finally:
        conn.close()

    # 6.3 Job Cascade to Job Events and Assignments
    conn = get_conn()
    cur = conn.cursor()
    try:
        # Create temporary booking & job
        b_temp_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO booking (
                id, business_id, public_reference, customer_id, service_offering_id,
                customer_name_snapshot, customer_phone_snapshot, service_name_snapshot,
                address_snapshot, problem_description, requested_slot_start, requested_slot_end,
                capability_token, capability_token_expires_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                'Temp', '+919999000001', 'AC', 'Addr', 'Desc', NOW(), NOW()+interval '1h',
                %s, NOW()+interval '1d'
            );
        """, (b_temp_id, biz_id, f"BK-C-{uuid.uuid4().hex[:6]}", cust_id, fixtures["service_id"], f"cap-c-{uuid.uuid4().hex}"))
        
        j_temp_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO job (id, business_id, booking_id, job_reference, customer_id, planned_start_time, planned_end_time)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW()+interval '1h');
        """, (j_temp_id, biz_id, b_temp_id, f"JOB-C-{uuid.uuid4().hex[:6]}", cust_id))
        
        evt_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO job_event (id, job_id, to_state)
            VALUES (%s, %s, 'ASSIGNMENT_PENDING');
        """, (evt_id, j_temp_id))
        
        asgn_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO assignment (id, job_id, technician_id)
            VALUES (%s, %s, %s);
        """, (asgn_id, j_temp_id, fixtures["tech_id"]))
        
        conn.commit()
        
        # Delete job
        cur.execute("DELETE FROM job WHERE id = %s;", (j_temp_id,))
        conn.commit()
        
        cur.execute("SELECT count(*) FROM job_event WHERE id = %s;", (evt_id,))
        evt_cnt = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM assignment WHERE id = %s;", (asgn_id,))
        asgn_cnt = cur.fetchone()[0]
        
        if evt_cnt == 0 and asgn_cnt == 0:
            record_test("job deletion cascades to job_event and assignment", True, "Cascade verified")
        else:
            record_test("job deletion cascades to job_event and assignment", False, f"Event: {evt_cnt}, Assignment: {asgn_cnt}")
    except Exception as e:
        conn.rollback()
        record_test("job cascade test", False, str(e))
    finally:
        conn.close()

    # 6.4 Cross-Tenant Isolation: Same location code and same customer phone across different businesses
    conn = get_conn()
    cur = conn.cursor()
    try:
        biz2_id = str(uuid.uuid4())
        biz2_code = f"BIZ2_{uuid.uuid4().hex[:6].upper()}"
        cur.execute("""
            INSERT INTO business (id, code, name, phone, city)
            VALUES (%s, %s, 'RepairReach Branch 2', '+919876540000', 'Pune')
            RETURNING id;
        """, (biz2_id, biz2_code))
        
        # Insert same location code 'SOLAPUR_CENTRAL' for biz2 -> MUST SUCCEED (Scoped UNIQUE(business_id, code))
        cur.execute("""
            INSERT INTO business_location (business_id, name, code, address, city)
            VALUES (%s, 'Pune Central Office', 'SOLAPUR_CENTRAL', 'FC Road, Pune', 'Pune')
            RETURNING id;
        """, (biz2_id,))
        
        # Insert same customer phone '+919876543210' for biz2 -> MUST SUCCEED (Scoped UNIQUE(business_id, normalized_phone))
        cur.execute("""
            INSERT INTO customer (business_id, normalized_phone, full_name)
            VALUES (%s, '+919876543210', 'Pune Customer')
            RETURNING id;
        """, (biz2_id,))
        
        conn.commit()
        record_test("Cross-tenant isolation: identical child keys (code, phone) permitted across different businesses", True, "Multi-tenant isolation verified")
    except Exception as e:
        conn.rollback()
        record_test("Cross-tenant isolation: identical child keys permitted across different businesses", False, str(e))
    finally:
        conn.close()

# ============================================================================
# 7. Concurrent Race Condition Stress Test (GiST Exclusion Arbiter)
# ============================================================================
def test_concurrent_slot_race(fixtures):
    print("\n--- Running Section 7: Concurrent Race Condition Stress Test (GiST Exclusion) ---")
    import concurrent.futures
    biz_id = fixtures["biz_id"]
    tech_id = fixtures["tech_id"]
    
    # 20 concurrent threads trying to book the exact same slot [2027-07-01 10:00:00, 2027-07-01 11:00:00 UTC)
    t_race_start = datetime.datetime(2027, 7, 1, 10, 0, 0, tzinfo=datetime.timezone.utc)
    t_race_end = datetime.datetime(2027, 7, 1, 11, 0, 0, tzinfo=datetime.timezone.utc)
    
    num_threads = 20
    success_count = 0
    exclusion_count = 0
    other_errors = []
    
    def attempt_booking(thread_idx):
        nonlocal success_count, exclusion_count
        c = get_conn()
        cur_t = c.cursor()
        try:
            cur_t.execute("""
                INSERT INTO schedule_entry (business_id, technician_id, start_time, end_time, activity_type, status)
                VALUES (%s, %s, %s, %s, 'HOME_VISIT', 'ACTIVE')
                RETURNING id;
            """, (biz_id, tech_id, t_race_start, t_race_end))
            c.commit()
            return ("SUCCESS", cur_t.fetchone()[0])
        except psycopg2.errors.ExclusionViolation:
            c.rollback()
            return ("EXCLUSION_VIOLATION", None)
        except Exception as e:
            c.rollback()
            return ("OTHER_ERROR", str(e))
        finally:
            c.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(attempt_booking, i) for i in range(num_threads)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
    for res_type, val in results:
        if res_type == "SUCCESS":
            success_count += 1
        elif res_type == "EXCLUSION_VIOLATION":
            exclusion_count += 1
        else:
            other_errors.append(val)
            
    if success_count == 1 and exclusion_count == (num_threads - 1) and len(other_errors) == 0:
        record_test(f"Concurrent GiST Race: Exactly 1 of {num_threads} concurrent attempts confirmed, {exclusion_count} rejected", True, "PostgreSQL GiST exclusion is 100% authoritative under concurrency")
    else:
        record_test(f"Concurrent GiST Race: Exactly 1 of {num_threads} confirmed", False, f"Success: {success_count}, Exclusion: {exclusion_count}, Errors: {other_errors}")

# ============================================================================
# 8. Enum Domain Type Invariant Verification
# ============================================================================
def test_enum_invariants(fixtures):
    print("\n--- Running Section 8: Enum Domain Type Invariants ---")
    biz_id = fixtures["biz_id"]
    cust_id = fixtures["cust_id"]
    
    # 8.1 Invalid booking_state_enum
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO booking (
                business_id, public_reference, customer_id, service_offering_id,
                customer_name_snapshot, customer_phone_snapshot, service_name_snapshot,
                address_snapshot, problem_description, state, requested_slot_start, requested_slot_end,
                capability_token, capability_token_expires_at
            ) VALUES (
                %s, %s, %s, %s,
                'Enum Test', '+919999000001', 'AC',
                'Addr', 'Problem', 'INVALID_STATE'::booking_state_enum,
                NOW(), NOW()+interval '1 hour',
                %s, NOW()+interval '1 day'
            );
        """, (biz_id, f"BK-ENUM-{uuid.uuid4().hex[:6]}", cust_id, fixtures["service_id"], f"cap-enum-{uuid.uuid4().hex}"))
        conn.commit()
        record_test("Invalid booking_state_enum rejection", False, "Invalid enum value accepted!")
    except psycopg2.errors.InvalidTextRepresentation:
        conn.rollback()
        record_test("Invalid booking_state_enum rejection", True, "InvalidTextRepresentation raised as expected")
    except Exception as e:
        conn.rollback()
        record_test("Invalid booking_state_enum rejection", False, str(e))
    finally:
        conn.close()

    # 8.2 Valid enum transitions
    conn = get_conn()
    cur = conn.cursor()
    try:
        valid_states = ['REQUESTED', 'SLOT_SELECTION_REQUIRED', 'CONFIRMED', 'CANCELLED', 'CLOSED']
        for st in valid_states:
            cur.execute("""
                INSERT INTO booking (
                    business_id, public_reference, customer_id, service_offering_id,
                    customer_name_snapshot, customer_phone_snapshot, service_name_snapshot,
                    address_snapshot, problem_description, state, requested_slot_start, requested_slot_end,
                    capability_token, capability_token_expires_at
                ) VALUES (
                    %s, %s, %s, %s,
                    'Enum Test', '+919999000001', 'AC',
                    'Addr', 'Problem', %s,
                    NOW(), NOW()+interval '1 hour',
                    %s, NOW()+interval '1 day'
                );
            """, (biz_id, f"BK-E-{uuid.uuid4().hex[:6]}", cust_id, fixtures["service_id"], st, f"cap-e-{uuid.uuid4().hex}"))
        conn.commit()
        record_test("All 5 valid booking_state_enum values accepted", True, f"States: {valid_states}")
    except Exception as e:
        conn.rollback()
        record_test("All 5 valid booking_state_enum values accepted", False, str(e))
    finally:
        conn.close()

# ============================================================================
# 9. Trigger trg_set_updated_at Invariant Verification
# ============================================================================
def test_updated_at_triggers(fixtures):
    print("\n--- Running Section 9: updated_at Trigger Invariants ---")
    biz_id = fixtures["biz_id"]
    conn = get_conn()
    cur = conn.cursor()
    try:
        # Fetch initial updated_at
        cur.execute("SELECT updated_at FROM business WHERE id = %s;", (biz_id,))
        initial_ts = cur.fetchone()[0]
        
        # Sleep 50ms and update
        import time
        time.sleep(0.05)
        cur.execute("UPDATE business SET name = 'RepairReach Solapur Main' WHERE id = %s RETURNING updated_at;", (biz_id,))
        new_ts = cur.fetchone()[0]
        conn.commit()
        
        if new_ts > initial_ts:
            record_test("trg_set_updated_at automatically advances updated_at timestamp on UPDATE", True, f"{initial_ts} -> {new_ts}")
        else:
            record_test("trg_set_updated_at advances updated_at timestamp", False, f"Old: {initial_ts}, New: {new_ts}")
    except Exception as e:
        conn.rollback()
        record_test("trg_set_updated_at test", False, str(e))
    finally:
        conn.close()

# ============================================================================
# 10. Mobile Phone Repair Strict Exclusion Verification
# ============================================================================
def test_mobile_exclusion():
    print("\n--- Running Section 10: Mobile Phone Repair Strict Exclusion ---")
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT count(*) FROM service_offering
            WHERE code ILIKE '%MOBILE%' OR name ILIKE '%MOBILE%' OR code ILIKE '%PHONE%' OR name ILIKE '%PHONE%';
        """)
        mobile_count = cur.fetchone()[0]
        if mobile_count == 0:
            record_test("Service catalog strictly excludes mobile phone repairs (count == 0)", True, "0 mobile repair offerings")
        else:
            record_test("Service catalog strictly excludes mobile phone repairs", False, f"Found {mobile_count} mobile offerings!")
    except Exception as e:
        record_test("Mobile repair exclusion test", False, str(e))
    finally:
        conn.close()

# ============================================================================
# Main Execution Runner
# ============================================================================
def main():
    print("=================================================================")
    print("RepairReach Tier 5 Adversarial Database Verification Harness")
    print(f"Target DB: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    print("=================================================================")
    
    conn = get_conn()
    cur = conn.cursor()
    fixtures = setup_test_fixtures(cur)
    conn.commit()
    conn.close()
    
    test_rating_boundaries(fixtures)
    test_time_range_and_gist(fixtures)
    test_operating_windows_and_seed_data(fixtures)
    test_indexes()
    test_idempotency_uniqueness()
    test_fk_cascades_and_restricts(fixtures)
    test_concurrent_slot_race(fixtures)
    test_enum_invariants(fixtures)
    test_updated_at_triggers(fixtures)
    test_mobile_exclusion()
    
    print("\n=================================================================")
    print(f"Adversarial Verification Summary: {passed_tests} PASSED, {failed_tests} FAILED")
    print("=================================================================")
    
    if failed_tests > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()

