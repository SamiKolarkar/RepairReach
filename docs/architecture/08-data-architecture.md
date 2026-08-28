# Data Architecture

> Classification: DECISION baseline. Table names are conceptual ownership guidance, not migrations or implementation code.

## Relational ownership model

Supabase PostgreSQL is the only transactional system of record. IDs are opaque application identifiers. Timestamps are stored with timezone semantics and displayed in the business/customer locale. Mutable records carry version/updated-at fields for stale mobile command detection.

| Structure | Owner | Key data and constraints | Important indexes |
|---|---|---|---|
| `business`, `business_location`, `business_settings` | Business | Business timezone; one or more service locations; configured policy values | business/location active lookup |
| `application_user`, `external_identity`, `permission` | Identity | External provider subject unique within provider; user disabled state | provider+subject unique |
| `technician`, `technician_capability` | Technician | Technician linked to application user; capability and active periods | active technician; technician+capability |
| `customer`, `customer_address` | Customer | Minimized contact data; address ownership; normalized lookup where permitted | normalized phone/contact; customer address |
| `customer_device` | Customer/history | Optional appliance/device identity and service notes supported by workflow | customer and category |
| `service_offering`, `service_requirement` | Catalog | Published state, supported location modes, planning duration, buffers, capability requirements | active catalog; category/location |
| `availability_rule` | Scheduling | Weekly recurrence, resource scope, local time interval, active period | scope + weekday + active period |
| `availability_exception` | Scheduling | Date/range exception, open/closed/override, reason | technician/business + date range |
| `booking` | Booking | Customer, service, address snapshot/reference, problem, public reference, lifecycle | public reference unique; customer+created |
| `job`, `job_event` | Job | One service lifecycle, event timeline, actual timestamps, arrival boundary | booking unique; status + planned date |
| `assignment` | Assignment | Current and historical technician responsibility, policy reason, rejection/reassignment | job current assignment; technician+status |
| `schedule_entry`, `schedule_revision` | Scheduling | Active interval/range, resource, job/activity, version, reason history | technician + range GiST; date/status |
| `feedback`, `feedback_analysis`, `escalation` | Feedback/AI | Immutable source; versioned analysis; owner follow-up state | job feedback; analysis status; escalation state |
| `testimonial` | Reviews | Curated content, provenance, publication state | published order/state |
| `review_sync_record` | Reviews | External source/id, content snapshot, rating, fetched/updated times, read-only provenance | provider+external id unique |
| `outbox_event`, `notification_attempt` | Notification/integration | Durable post-commit work and retries | status + next attempt; aggregate reference |
| `audit_event` | Shared/audit | Actor, action, aggregate, before/after summary, correlation/idempotency key | aggregate/time; actor/time |
| `idempotency_record` | Shared/API | Scope, key, request fingerprint, response/status | scope+key unique |

## Overlap prevention

`active` schedule entries use a PostgreSQL time-range representation. A GiST exclusion constraint prevents overlap for the same technician/resource for active reservations. The exact migration must use the PostgreSQL-supported operator class and a partial predicate that excludes released/history rows.

Application locks and row versions improve deterministic behavior and error messages; they do not replace the database constraint.

## Foreign keys and deletion

Use foreign keys for transactional relationships. Prefer status/retirement over deleting business, service, technician, job, feedback, review, and audit records. Customer data deletion/retention policy is an open compliance/business decision; no destructive cascade should erase service history accidentally.

## Snapshots versus references

Booking/job views may snapshot the address and service display name used at commitment so later catalog/address edits do not rewrite history. The canonical customer/service references remain available. Schedule revisions snapshot old/new times and actor because audit must survive later mutation.

## Transactional operations

### Booking creation

One transaction validates service/location, finds a candidate, reserves the schedule entry, creates booking/job/assignment, records idempotency, and writes outbox work.

### Rescheduling

One transaction locks old/new resource conflict keys, validates expected versions and all constraints, writes the new active interval and old revision, updates any affected entries, and writes one schedule-change event.

### Assignment

One transaction validates capability and authorization, reserves the technician interval, writes the current assignment, and records policy/actor. Reassignment reserves the replacement before releasing the old reservation when both can be coordinated safely.

### Reflow

One transaction commits the complete affected set from a validated preview with expected versions. Partial cascades are not allowed.

## Query projections

Technician Today, Schedule, Customer History, and owner escalation views are read queries/projections over normalized data. They may become optimized read models later, but no projection can authorize a mutation or establish schedule truth.
