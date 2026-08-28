#!/usr/bin/env python3
"""
Milestone 1 Core Database & Migrations Empirical & Adversarial Test Harness
==========================================================================
Connects to PostgreSQL test instance and executes deep empirical validations
and adversarial stress-tests against V1 (DDL) and V2 (DML seed) migrations.
"""

import os
import sys
import json
import subprocess

DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
DB_PORT = os.environ.get("DB_PORT", "54329")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASS = os.environ.get("DB_PASS", "postgres")
DB_NAME = os.environ.get("DB_NAME", "repairreach_test")

class TestSuite:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []

    def run_query(self, sql_query):
        """Runs a SQL query and returns (success: bool, stdout: str, stderr: str)."""
        env = os.environ.copy()
        env["PGPASSWORD"] = DB_PASS
        cmd = [
            "psql",
            "-h", DB_HOST,
            "-p", DB_PORT,
            "-U", DB_USER,
            "-d", DB_NAME,
            "-v", "ON_ERROR_STOP=1",
            "-t", "-A", "-c", sql_query
        ]
        proc = subprocess.run(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return (proc.returncode == 0, proc.stdout.strip(), proc.stderr.strip())

    def run_query_json(self, select_query):
        """Wraps SELECT query in json_agg and returns (success: bool, parsed_json_or_err)."""
        clean = select_query.strip().rstrip(';')
        wrapped = f"SELECT coalesce(json_agg(t), '[]'::json) FROM ({clean}) t;"
        success, out, err = self.run_query(wrapped)
        if not success:
            return False, err
        if not out:
            return True, []
        try:
            return True, json.loads(out)
        except Exception as e:
            return False, f"JSON parse error: {e}, raw: {out}"

    def assert_true(self, condition, test_name, detail=""):
        if condition:
            self.passed += 1
            self.results.append({"status": "PASS", "test": test_name, "detail": detail})
            print(f"  [PASS] {test_name}")
        else:
            self.failed += 1
            self.results.append({"status": "FAIL", "test": test_name, "detail": detail})
            print(f"  [FAIL] {test_name}: {detail}")

    def run(self):
        print("=" * 80)
        print("REPAIRREACH MILESTONE 1 EMPIRICAL & ADVERSARIAL TEST SUITE")
        print(f"Target: PostgreSQL at {DB_HOST}:{DB_PORT}/{DB_NAME}")
        print("=" * 80)

        # ---------------------------------------------------------------------
        # 1. Extensions Verification
        # ---------------------------------------------------------------------
        print("\n--- 1. Extensions Verification ---")
        ok, res = self.run_query_json(
            "SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'btree_gist')"
        )
        ext_names = {r["extname"] for r in (res or [])} if ok else set()
        for req_ext in ['uuid-ossp', 'pgcrypto', 'btree_gist']:
            self.assert_true(req_ext in ext_names, f"Extension '{req_ext}' installed", f"Found: {ext_names}")

        # ---------------------------------------------------------------------
        # 2. Enums Verification (All 17 enums)
        # ---------------------------------------------------------------------
        print("\n--- 2. Custom Enums Verification (17 Enums) ---")
        expected_enums = {
            'user_role_enum': {'TECHNICIAN', 'OWNER', 'OPERATOR', 'ADMIN'},
            'identity_provider_enum': {'FIREBASE', 'SUPABASE', 'LOCAL'},
            'service_category_enum': {'HOME_APPLIANCE', 'ELECTRONICS', 'COMMERCIAL_APPLIANCE'},
            'booking_state_enum': {'REQUESTED', 'SLOT_SELECTION_REQUIRED', 'CONFIRMED', 'CANCELLED', 'CLOSED'},
            'job_state_enum': {'ASSIGNMENT_PENDING', 'ASSIGNED', 'SCHEDULED', 'EN_ROUTE', 'ARRIVED', 'DIAGNOSING', 'DEVICE_TRANSFERRED', 'WORKSHOP_REPAIR', 'COMPLETED', 'UNABLE_TO_SERVE'},
            'assignment_status_enum': {'PENDING', 'ACCEPTED', 'REJECTED', 'SUPERSEDED', 'FULFILLED'},
            'schedule_activity_type_enum': {'HOME_VISIT', 'WORKSHOP_REPAIR', 'TRAVEL_BUFFER', 'BREAK', 'EXCEPTION_BLOCK'},
            'schedule_entry_status_enum': {'ACTIVE', 'RELEASED', 'MOVED'},
            'cancellation_charge_type_enum': {'NONE', 'PRE_ARRIVAL_NO_VISIT_CHARGE', 'POST_ARRIVAL_VISIT_CHARGE_APPLICABLE'},
            'feedback_analysis_status_enum': {'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'},
            'sentiment_enum': {'POSITIVE', 'NEUTRAL', 'NEGATIVE'},
            'escalation_status_enum': {'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'},
            'escalation_priority_enum': {'LOW', 'MEDIUM', 'HIGH', 'URGENT'},
            'testimonial_provenance_enum': {'MANUAL_CURATED', 'VERIFIED_CUSTOMER', 'IMPORTED_EXTERNAL'},
            'review_sync_status_enum': {'SYNCED', 'PENDING_CURATION', 'EXCLUDED'},
            'outbox_status_enum': {'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER'},
            'notification_channel_enum': {'SMS', 'WHATSAPP', 'EMAIL', 'PUSH'}
        }

        ok, res = self.run_query_json(
            """
            SELECT t.typname, e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname LIKE '%_enum'
            ORDER BY t.typname, e.enumsortorder
            """
        )
        actual_enums = {}
        if ok and res:
            for r in res:
                typ = r["typname"]
                val = r["enumlabel"]
                actual_enums.setdefault(typ, set()).add(val)

        self.assert_true(len(actual_enums) == 17, "All 17 enum types exist", f"Found {len(actual_enums)} enums: {set(actual_enums.keys())}")
        for enum_name, expected_vals in expected_enums.items():
            actual_vals = actual_enums.get(enum_name, set())
            self.assert_true(actual_vals == expected_vals, f"Enum '{enum_name}' labels match exactly", f"Expected: {expected_vals}, Got: {actual_vals}")

        # ---------------------------------------------------------------------
        # 3. Tables Verification (All 29 Tables)
        # ---------------------------------------------------------------------
        print("\n--- 3. Relational Tables Verification (29 Tables) ---")
        expected_tables = [
            'business',
            'business_settings',
            'business_location',
            'application_user',
            'external_identity',
            'technician',
            'technician_capability',
            'service_offering',
            'service_requirement',
            'customer',
            'customer_address',
            'customer_device',
            'availability_rule',
            'availability_exception',
            'booking',
            'job',
            'job_event',
            'assignment',
            'schedule_entry',
            'schedule_revision',
            'feedback',
            'feedback_analysis',
            'escalation',
            'testimonial',
            'review_sync_record',
            'outbox_event',
            'notification_attempt',
            'audit_event',
            'idempotency_record'
        ]
        ok, res = self.run_query_json(
            """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            """
        )
        found_tables = {r["table_name"] for r in (res or [])} if ok else set()
        self.assert_true(len(found_tables) == 29, f"All 29 relational tables present", f"Found {len(found_tables)}: {found_tables}")
        for t in expected_tables:
            self.assert_true(t in found_tables, f"Table '{t}' exists", f"Missing from schema: {t}")

        # ---------------------------------------------------------------------
        # 4. Seed Data Verification
        # ---------------------------------------------------------------------
        print("\n--- 4. Seed Data Invariant Verification ---")
        
        # 4.1 Business record
        ok, res = self.run_query_json("SELECT * FROM business WHERE code = 'SOLAPUR_MAIN'")
        self.assert_true(ok and len(res) == 1 and res[0]["city"] == "Solapur" and res[0]["timezone"] == "Asia/Kolkata" and res[0]["postal_code"] == "413001",
                         "Solapur Main Business record correctly configured", f"Result: {res}")

        # 4.2 Business settings
        ok, res = self.run_query_json("SELECT * FROM business_settings WHERE business_id = '00000000-0000-0000-0001-000000000001'")
        bs = res[0] if (ok and res) else {}
        self.assert_true(
            float(bs.get("visiting_charge_amount", 0)) == 299.00 and
            bs.get("weekday_open_time") == "09:00:00" and
            bs.get("weekday_close_time") == "19:00:00" and
            bs.get("sunday_open_time") == "09:00:00" and
            bs.get("sunday_close_time") == "14:00:00" and
            bs.get("afternoon_break_start") == "14:00:00" and
            bs.get("afternoon_break_end") == "16:00:00" and
            bs.get("default_slot_duration_minutes") == 60 and
            bs.get("default_travel_buffer_minutes") == 30 and
            bs.get("currency") == "INR",
            "Business Settings configured per Solapur specification",
            f"Result: {bs}"
        )

        # 4.3 Business location
        ok, res = self.run_query_json("SELECT * FROM business_location WHERE code = 'SOLAPUR_CENTRAL'")
        self.assert_true(ok and len(res) == 1 and res[0]["is_primary"] is True and res[0]["city"] == "Solapur",
                         "Primary Business Location (Solapur Central) seeded", f"Result: {res}")

        # 4.4 Users & Technician Profile
        ok, res = self.run_query_json("SELECT count(*) as cnt FROM application_user")
        self.assert_true(ok and res[0]["cnt"] >= 2, "Application users seeded (Owner + Primary Tech)", f"Count: {res[0]['cnt'] if ok else res}")
        
        ok, res = self.run_query_json("SELECT count(*) as cnt FROM technician")
        self.assert_true(ok and res[0]["cnt"] >= 1, "Primary technician seeded", f"Count: {res[0]['cnt'] if ok else res}")

        # 4.5 Technician Capabilities
        ok, res = self.run_query_json("SELECT capability_key FROM technician_capability WHERE is_active = true")
        caps = {r["capability_key"] for r in (res or [])} if ok else set()
        expected_caps = {'WASHING_MACHINE', 'REFRIGERATOR', 'MICROWAVE', 'AC', 'TV'}
        self.assert_true(caps == expected_caps, "Technician capabilities match appliance catalog", f"Found: {caps}")

        # 4.6 Service Offerings (Mobile Phone repair strictly ABSENT)
        ok, res = self.run_query_json("SELECT code, name, category, is_published FROM service_offering ORDER BY display_order")
        service_codes = [r["code"] for r in (res or [])] if ok else []
        expected_services = ['WASHING_MACHINE_REPAIR', 'REFRIGERATOR_REPAIR', 'MICROWAVE_REPAIR', 'AC_REPAIR', 'TV_REPAIR']
        self.assert_true(service_codes == expected_services, "5 Core appliance service offerings seeded in correct order", f"Found: {service_codes}")

        # 4.7 Negative check: NO mobile phone repairs in service_offering or any table
        ok, res = self.run_query_json(
            """
            SELECT count(*) as cnt 
            FROM service_offering 
            WHERE code ILIKE '%phone%' OR code ILIKE '%mobile%' 
               OR name ILIKE '%phone%' OR name ILIKE '%mobile%' 
               OR description ILIKE '%phone%' OR description ILIKE '%mobile%'
            """
        )
        self.assert_true(ok and res[0]["cnt"] == 0, "Mobile phone repair is strictly absent from service_offering", f"Count: {res[0]['cnt'] if ok else res}")

        # 4.8 Service Requirements
        ok, res = self.run_query_json("SELECT count(*) as cnt FROM service_requirement WHERE is_mandatory = true")
        self.assert_true(ok and res[0]["cnt"] == 5, "5 Mandatory service requirements mapped", f"Count: {res[0]['cnt'] if ok else res}")

        # 4.9 Availability Rules
        ok, res = self.run_query_json("SELECT count(*) as cnt FROM availability_rule WHERE is_active = true")
        self.assert_true(ok and res[0]["cnt"] == 26, "26 Availability rules seeded (13 business + 13 technician)", f"Count: {res[0]['cnt'] if ok else res}")

        # 4.10 Testimonials
        ok, res = self.run_query_json("SELECT customer_name, service_type_display, location_display FROM testimonial WHERE is_published = true ORDER BY display_order")
        self.assert_true(ok and len(res) == 5, "5 Curated testimonials for Solapur seeded", f"Found: {len(res) if ok else res}")

        # ---------------------------------------------------------------------
        # 5. Adversarial Testing of GiST Exclusion Constraint (`schedule_entry_no_overlap`)
        # ---------------------------------------------------------------------
        print("\n--- 5. Adversarial GiST Exclusion Constraint Testing ---")

        tech_id = "00000000-0000-0000-0003-000000000001"
        biz_id = "00000000-0000-0000-0001-000000000001"
        
        # Clean test entries
        self.run_query(f"DELETE FROM schedule_entry WHERE business_id = '{biz_id}';")

        # Test 5.1: Insert baseline active slot: 09:00 to 10:00 IST
        q1 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000001'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-01 09:00:00+05:30',
            '2026-09-01 10:00:00+05:30',
            'ACTIVE'
        );
        """
        ok, out, err = self.run_query(q1)
        self.assert_true(ok, "GiST-T1: Baseline active slot [09:00, 10:00) inserted successfully", err)

        # Test 5.2: Insert exact duplicate interval for SAME technician (MUST FAIL with exclusion violation)
        q2 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000002'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-01 09:00:00+05:30',
            '2026-09-01 10:00:00+05:30',
            'ACTIVE'
        );
        """
        ok, out, err = self.run_query(q2)
        self.assert_true((not ok) and "schedule_entry_no_overlap" in err.lower(),
                         "GiST-T2: Exact overlapping active slot blocked by exclusion constraint", f"err: {err}")

        # Test 5.3: Partial Overlap - Head ([08:30, 09:30)) (MUST FAIL)
        q3 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000003'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-01 08:30:00+05:30',
            '2026-09-01 09:30:00+05:30',
            'ACTIVE'
        );
        """
        ok, out, err = self.run_query(q3)
        self.assert_true((not ok) and "schedule_entry_no_overlap" in err.lower(),
                         "GiST-T3: Partial overlap (head [08:30, 09:30)) blocked", f"err: {err}")

        # Test 5.4: Partial Overlap - Tail ([09:30, 10:30)) (MUST FAIL)
        q4 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000004'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-01 09:30:00+05:30',
            '2026-09-01 10:30:00+05:30',
            'ACTIVE'
        );
        """
        ok, out, err = self.run_query(q4)
        self.assert_true((not ok) and "schedule_entry_no_overlap" in err.lower(),
                         "GiST-T4: Partial overlap (tail [09:30, 10:30)) blocked", f"err: {err}")

        # Test 5.5: Full Enclosure ([08:00, 11:00)) (MUST FAIL)
        q5 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000005'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-01 08:00:00+05:30',
            '2026-09-01 11:00:00+05:30',
            'ACTIVE'
        );
        """
        ok, out, err = self.run_query(q5)
        self.assert_true((not ok) and "schedule_entry_no_overlap" in err.lower(),
                         "GiST-T5: Full enclosing interval [08:00, 11:00) blocked", f"err: {err}")

        # Test 5.6: Internal Sub-interval ([09:15, 09:45)) (MUST FAIL)
        q6 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000006'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-01 09:15:00+05:30',
            '2026-09-01 09:45:00+05:30',
            'ACTIVE'
        );
        """
        ok, out, err = self.run_query(q6)
        self.assert_true((not ok) and "schedule_entry_no_overlap" in err.lower(),
                         "GiST-T6: Internal sub-interval [09:15, 09:45) blocked", f"err: {err}")

        # Test 5.7: Adjacent Back-to-Back BEFORE ([08:00, 09:00)) (MUST SUCCEED)
        q7 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000007'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-01 08:00:00+05:30',
            '2026-09-01 09:00:00+05:30',
            'ACTIVE'
        );
        """
        ok, out, err = self.run_query(q7)
        self.assert_true(ok, "GiST-T7: Back-to-back adjacent slot before [08:00, 09:00) permitted", err)

        # Test 5.8: Adjacent Back-to-Back AFTER ([10:00, 11:00)) (MUST SUCCEED)
        q8 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000008'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-01 10:00:00+05:30',
            '2026-09-01 11:00:00+05:30',
            'ACTIVE'
        );
        """
        ok, out, err = self.run_query(q8)
        self.assert_true(ok, "GiST-T8: Back-to-back adjacent slot after [10:00, 11:00) permitted", err)

        # Test 5.9: Overlapping slot for a DIFFERENT technician (MUST SUCCEED)
        # Create Technician 2 first
        self.run_query(f"""
        INSERT INTO application_user (id, business_id, phone, full_name, role)
        VALUES ('00000000-0000-0000-0002-000000000003'::uuid, '{biz_id}'::uuid, '+919876543299', 'Vikram Shinde', 'TECHNICIAN')
        ON CONFLICT (id) DO NOTHING;
        
        INSERT INTO technician (id, business_id, user_id, full_name, phone)
        VALUES ('00000000-0000-0000-0003-000000000002'::uuid, '{biz_id}'::uuid, '00000000-0000-0000-0002-000000000003'::uuid, 'Vikram Shinde', '+919876543299')
        ON CONFLICT (user_id) DO NOTHING;
        """)

        tech_id_2 = "00000000-0000-0000-0003-000000000002"
        q9 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000009'::uuid,
            '{biz_id}'::uuid,
            '{tech_id_2}'::uuid,
            'HOME_VISIT',
            '2026-09-01 09:00:00+05:30',
            '2026-09-01 10:00:00+05:30',
            'ACTIVE'
        );
        """
        ok, out, err = self.run_query(q9)
        self.assert_true(ok, "GiST-T9: Same time [09:00, 10:00) for different technician permitted", err)

        # Test 5.10: Overlap permitted when status is 'RELEASED'
        q10 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000010'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-01 09:00:00+05:30',
            '2026-09-01 10:00:00+05:30',
            'RELEASED'
        );
        """
        ok, out, err = self.run_query(q10)
        self.assert_true(ok, "GiST-T10: Overlapping slot with status='RELEASED' permitted", err)

        # Test 5.11: Overlap permitted when status is 'MOVED'
        q11 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000011'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-01 09:00:00+05:30',
            '2026-09-01 10:00:00+05:30',
            'MOVED'
        );
        """
        ok, out, err = self.run_query(q11)
        self.assert_true(ok, "GiST-T11: Overlapping slot with status='MOVED' permitted", err)

        # Test 5.12: CHECK constraint end_time > start_time
        q12 = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000012'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-01 10:00:00+05:30',
            '2026-09-01 09:00:00+05:30',
            'ACTIVE'
        );
        """
        ok, out, err = self.run_query(q12)
        self.assert_true((not ok) and ("schedule_entry_interval_check" in err.lower() or "lower bound must be less than" in err.lower()),
                         "GiST-T12: Inverted interval (end_time <= start_time) blocked", f"err: {err}")

        # ---------------------------------------------------------------------
        # 6. Trigger Synchronization Verification
        # ---------------------------------------------------------------------
        print("\n--- 6. Trigger Synchronization Testing ---")

        # Test 6.1: trg_sync_schedule_entry_interval auto-populates active_interval & schedule_date
        q_trig = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000020'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-05 14:00:00+05:30',
            '2026-09-05 15:30:00+05:30',
            'ACTIVE'
        );
        """
        self.run_query(q_trig)
        ok, res = self.run_query_json("SELECT active_interval::text, schedule_date::text FROM schedule_entry WHERE id = '10000000-0000-0000-0000-000000000020'::uuid")
        r = res[0] if (ok and res) else {}
        self.assert_true(
            r.get("schedule_date") == "2026-09-05" and "2026-09-05 08:30:00+00" in r.get("active_interval", ""),
            "Trigger trg_sync_schedule_entry_interval automatically calculates active_interval and Solapur schedule_date",
            f"Result: {r}"
        )

        # Test 6.2: Timezone boundary test (UTC 19:00 on Sept 5 = Sept 6 00:30 IST)
        q_tz = f"""
        INSERT INTO schedule_entry (
            id, business_id, technician_id, activity_type,
            start_time, end_time, status
        ) VALUES (
            '10000000-0000-0000-0000-000000000021'::uuid,
            '{biz_id}'::uuid,
            '{tech_id}'::uuid,
            'HOME_VISIT',
            '2026-09-05 19:00:00+00:00',
            '2026-09-05 20:00:00+00:00',
            'ACTIVE'
        );
        """
        self.run_query(q_tz)
        ok, res = self.run_query_json("SELECT schedule_date::text FROM schedule_entry WHERE id = '10000000-0000-0000-0000-000000000021'::uuid")
        r = res[0] if (ok and res) else {}
        self.assert_true(
            r.get("schedule_date") == "2026-09-06",
            "Trigger converts UTC timestamp to Asia/Kolkata date boundary (2026-09-06)",
            f"Result: {r}"
        )

        # Test 6.3: trg_set_updated_at trigger across mutable tables
        self.run_query("UPDATE service_offering SET name = 'Washing Machine Repair & Comprehensive Service' WHERE code = 'WASHING_MACHINE_REPAIR';")
        ok, res = self.run_query_json("SELECT (updated_at >= created_at) as valid_update FROM service_offering WHERE code = 'WASHING_MACHINE_REPAIR'")
        self.assert_true(ok and res[0]["valid_update"] is True, "Trigger trg_set_updated_at updates timestamp on row modification", f"Result: {res}")

        # ---------------------------------------------------------------------
        # 7. Referential Integrity & Constraints Stress-Testing
        # ---------------------------------------------------------------------
        print("\n--- 7. Referential Integrity & Constraints Testing ---")

        # Test 7.1: Idempotency unique constraint (scope, idempotency_key)
        self.run_query("DELETE FROM idempotency_record WHERE scope = 'BOOKING' AND idempotency_key = 'idem-key-12345';")
        q_idem = f"""
        INSERT INTO idempotency_record (scope, idempotency_key, request_hash, response_status, response_body, expires_at)
        VALUES ('BOOKING', 'idem-key-12345', 'hash1', 201, '{{"status": "ok"}}'::jsonb, CURRENT_TIMESTAMP + INTERVAL '1 day');
        """
        ok, out, err = self.run_query(q_idem)
        self.assert_true(ok, "Idempotency record inserted", err)

        q_idem_dup = f"""
        INSERT INTO idempotency_record (scope, idempotency_key, request_hash, response_status, response_body, expires_at)
        VALUES ('BOOKING', 'idem-key-12345', 'hash2', 201, '{{"status": "ok"}}'::jsonb, CURRENT_TIMESTAMP + INTERVAL '1 day');
        """
        ok, out, err = self.run_query(q_idem_dup)
        self.assert_true((not ok) and "uk_idempotency_scope_key" in err.lower(),
                         "Duplicate idempotency key in same scope blocked by unique constraint", f"err: {err}")

        # Test 7.2: Customer unique normalized phone constraint
        self.run_query(f"DELETE FROM customer WHERE business_id = '{biz_id}' AND normalized_phone = '+919988776655';")
        q_cust = f"""
        INSERT INTO customer (id, business_id, normalized_phone, full_name)
        VALUES ('20000000-0000-0000-0000-000000000001'::uuid, '{biz_id}'::uuid, '+919988776655', 'Amit Kulkarni');
        """
        ok, out, err = self.run_query(q_cust)
        self.assert_true(ok, "Customer inserted", err)

        q_cust_dup = f"""
        INSERT INTO customer (id, business_id, normalized_phone, full_name)
        VALUES ('20000000-0000-0000-0000-000000000002'::uuid, '{biz_id}'::uuid, '+919988776655', 'Amit Kulkarni Dup');
        """
        ok, out, err = self.run_query(q_cust_dup)
        self.assert_true((not ok) and "uk_customer_business_phone" in err.lower(),
                         "Duplicate customer normalized phone blocked per business", f"err: {err}")

        # Test 7.3: Check ratings constraint in feedback & testimonial (must be 1-5)
        q_feed_invalid = f"""
        INSERT INTO feedback (job_id, booking_id, customer_id, rating)
        VALUES ('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 6);
        """
        ok, out, err = self.run_query(q_feed_invalid)
        self.assert_true((not ok) and ("rating" in err.lower() or "check constraint" in err.lower()),
                         "Feedback rating > 5 rejected by CHECK constraint", f"err: {err}")

        # Test 7.4: Foreign Key RESTRICT on deleting customer referenced by booking
        # Create a booking for Amit Kulkarni
        q_book = f"""
        INSERT INTO booking (
            id, business_id, public_reference, customer_id, service_offering_id,
            customer_name_snapshot, customer_phone_snapshot, service_name_snapshot,
            address_snapshot, problem_description, requested_slot_start, requested_slot_end,
            capability_token, capability_token_expires_at
        ) VALUES (
            '30000000-0000-0000-0000-000000000001'::uuid,
            '{biz_id}'::uuid,
            'RR-TEST-001',
            '20000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0005-000000000001'::uuid,
            'Amit Kulkarni',
            '+919988776655',
            'Washing Machine Repair',
            'Solapur',
            'Drum not spinning',
            '2026-09-01 10:00:00+05:30',
            '2026-09-01 11:00:00+05:30',
            'cap-token-test-001',
            '2026-09-02 10:00:00+05:30'
        );
        """
        ok, out, err = self.run_query(q_book)
        self.assert_true(ok, "Test booking inserted for FK testing", err)

        # Attempt to delete customer with active booking (MUST FAIL due to ON DELETE RESTRICT)
        ok, out, err = self.run_query("DELETE FROM customer WHERE id = '20000000-0000-0000-0000-000000000001'::uuid;")
        self.assert_true((not ok) and "violates foreign key constraint" in err.lower(),
                         "Customer delete blocked by RESTRICT foreign key constraint on booking", f"err: {err}")

        # Test 7.5: Foreign Key CASCADE on schedule_revision when schedule_entry is deleted
        q_rev = f"""
        INSERT INTO schedule_revision (
            id, schedule_entry_id, command_name, old_start_time, old_end_time,
            new_start_time, new_end_time, actor_type
        ) VALUES (
            '40000000-0000-0000-0000-000000000001'::uuid,
            '10000000-0000-0000-0000-000000000001'::uuid,
            'RESCHEDULE_SLOT',
            '2026-09-01 09:00:00+05:30',
            '2026-09-01 10:00:00+05:30',
            '2026-09-01 11:00:00+05:30',
            '2026-09-01 12:00:00+05:30',
            'OPERATOR'
        );
        """
        ok, out, err = self.run_query(q_rev)
        self.assert_true(ok, "Schedule revision inserted", err)

        # Delete the schedule entry -> schedule_revision must cascade delete
        self.run_query("DELETE FROM schedule_entry WHERE id = '10000000-0000-0000-0000-000000000001'::uuid;")
        ok, res = self.run_query_json("SELECT count(*) as cnt FROM schedule_revision WHERE id = '40000000-0000-0000-0000-000000000001'::uuid")
        self.assert_true(ok and res[0]["cnt"] == 0, "Schedule revision cascade deleted with schedule entry", f"Count: {res[0]['cnt'] if ok else res}")

        # Clean up test booking & customer
        self.run_query("DELETE FROM booking WHERE id = '30000000-0000-0000-0000-000000000001'::uuid;")
        self.run_query("DELETE FROM customer WHERE id = '20000000-0000-0000-0000-000000000001'::uuid;")

        # ---------------------------------------------------------------------
        # Final Summary
        # ---------------------------------------------------------------------
        print("\n" + "=" * 80)
        print(f"VERIFICATION COMPLETE: {self.passed} PASSED, {self.failed} FAILED")
        print("=" * 80)
        
        return self.failed == 0

if __name__ == "__main__":
    suite = TestSuite()
    success = suite.run()
    sys.exit(0 if success else 1)
