# RepairReach — System Architecture & Engineering Context

> **Audience**: Engineering agents, LLM context windows, and developers.  
> **Document Purpose**: Authoritative, dense, high-signal technical reference capturing the complete architecture, data models, API surface, security posture, implementation status, and operational runbook of RepairReach.  
> **Last Verified**: 2026-08-25 | **Codebase Root**: `/home/sami/Desktop/RepairReach`

---

## 1. Executive Overview & Domain Scope

RepairReach is a production-grade full-stack web platform purpose-built for doorstep appliance repair in **Solapur, Maharashtra** (`SOLAPUR_MAIN`). It connects residential customers with verified technicians for on-site diagnosis and repair of major household appliances.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       CORE DOMAIN SCOPE                                          │
├────────────────────────────────┬─────────────────────────────────┬───────────────────────────────┤
│ Included Appliance Categories  │ Excluded Domain Services        │ Commercial Policy             │
├────────────────────────────────┼─────────────────────────────────┼───────────────────────────────┤
│ • Washing Machines             │ • Mobile Phones / Smartphones   │ • ₹299 Fixed Visiting Charge  │
│ • Refrigerators                │ • Laptops / Tablets / PCs       │ • Free Pre-Arrival Cancel     │
│ • Microwave Ovens              │ • Small Consumer Gadgets        │ • ₹299 Post-Arrival Charge    │
│ • Air Conditioners (AC)        │ • Commercial / Industrial Plant │ • Immutable Customer Feedback │
│ • Televisions (TV)             │ (Strictly rejected in catalog   │ • Server-Authoritative        │
│ • RO Water Purifiers           │  and booking input validation)  │   Scheduling (ADR-003)        │
└────────────────────────────────┴─────────────────────────────────┴───────────────────────────────┘
```

### Domain Rules & Invariants
- **Operating Hours**: Monday–Saturday: `09:00 - 19:00` (10 hours); Sunday: `09:00 - 14:00` (5 hours).
- **Mandatory Technician Break**: Monday–Saturday: `14:00 - 16:00` (no slots offered or scheduled).
- **Visiting / Diagnostic Charge**: ₹299 fixed fee for on-site inspection (`business_settings.visiting_charge`).
- **Single Business Authority (ADR-003)**: All availability slot generation, pricing rules, state transitions, and concurrency checks reside exclusively in the Spring Boot backend. Clients never compute or mutate availability locally.
- **Double-Booking Defense**: Dual-layer locking via application-level PostgreSQL transactional advisory locks (`pg_advisory_xact_lock`) and database-level GiST exclusion constraints (`schedule_entry_no_overlap`).

---

## 2. Repository & Technology Architecture

### 2.1 Monorepo Structure

```
/home/sami/Desktop/RepairReach/
├── backend/                              # Java 21 / Spring Boot 3.3.3 Modular Monolith
│   ├── Dockerfile                        # Multi-stage Eclipse Temurin 21 Alpine container
│   ├── pom.xml                           # Maven build lifecycle & dependencies
│   ├── railway.toml                      # Railway deployment & /actuator/health config
│   ├── src/main/java/com/repairreach/backend/  # 12 Domain packages
│   └── src/main/resources/
│       ├── application.yml               # Base configuration (HikariCP, Flyway, CORS, Error lockdown)
│       ├── application-prod.yml          # Production profile (Supabase JWKS, memory limits)
│       └── db/migration/                 # Flyway SQL migrations (V1 to V5)
├── frontend/                             # React 18.3.1 / TypeScript 5.5.4 / Vite 5.4.2 SPA
│   ├── Dockerfile                        # Multi-stage Node 20 build + Nginx Alpine static server
│   ├── nginx.conf                        # Production Nginx SPA fallback rewrite configuration
│   ├── package.json                      # Frontend dependencies & test scripts
│   ├── tailwind.config.js                 # MD3 / Stitch design tokens (Deep Teal, 48px touch targets)
│   ├── tsconfig.json                     # Strict TypeScript compiler options
│   ├── vercel.json                       # Vercel SPA routing rewrite rules (/(.*) -> /index.html)
│   ├── src/                              # Application source (api, components, context, hooks, lib, pages)
│   └── tests/                            # Vitest unit, component, and integration suites (14 suites)
├── e2e-tests/                            # Opaque-box E2E Test Suite (5 Tiers, 224+ tests)
│   ├── package.json                      # Vitest 2.1.8, Playwright 1.62.1, TSX 4.19.2
│   └── tests/                            # Tier 1 (features) to Tier 5 (adversarial concurrency)
├── docs/                                 # Architecture specs, requirements, and ADRs (ADR-001 to ADR-012)
├── docker-compose.yml                    # Local multi-container development topology (ports 8080 & 5173)
├── DEPLOYMENT.md                         # Authoritative deployment runbook (Railway + Vercel + Supabase)
├── PROJECT.md                            # Interface contracts & hardening specifications
└── vercel.json                           # Root monorepo Vercel build configuration
```

### 2.2 Technology Stack Inventory

| Component / Layer | Technology | Version | Key Responsibilities & Invariants |
|---|---|---|---|
| **Backend Runtime** | Java (Eclipse Temurin) | `21-LTS` | Modern Java runtime, virtual threads ready, container support |
| **Backend Framework** | Spring Boot | `3.3.3` | REST API, Spring Security, Spring Data JPA, Actuator |
| **Security / Auth** | Spring Security OAuth2 | `6.3.3` | Supabase RS256 JWKS token validation, stateless sessions |
| **Persistence / ORM** | Spring Data JPA / Hibernate | `6.5.2` | PostgreSQL dialect, transactional boundaries, audit logging |
| **PostgreSQL Extensions** | Hypersistence Utils | `3.8.2` | Hibernate JSONB mapping, PostgreSQL native type support |
| **Database Migrations**| Flyway Core | `10.10.0` | Automated versioned SQL migrations (`V1__` through `V5__`) |
| **Connection Pooling** | HikariCP | `5.1.0` | Pool sizing: `min-idle: 2`, `max-pool: 10`, TLS required |
| **Database Cloud** | Supabase PostgreSQL | `16+` | 29 relational tables, `btree_gist`, `uuid-ossp`, session pooler |
| **Frontend Framework** | React | `18.3.1` | Client-side Single Page Application (`react-dom/client`) |
| **Language / Compiler**| TypeScript | `5.5.4` | Strict type checking (`noImplicitAny`, `noUnusedLocals`) |
| **Build Tool / Bundler**| Vite | `5.4.2` | Fast HMR, Rollup production bundler, `@` path alias to `src/` |
| **Routing** | React Router DOM | `6.26.1` | Layout nesting via `<Outlet />`, `<ProtectedRoute />` auth guards |
| **Server State** | TanStack React Query | `5.52.1` | `refetchOnWindowFocus: false`, `retry: 1`, smart polling |
| **HTTP Client** | Axios | `1.7.5` | Centralized instance, bearer auth interceptor, RFC 7807 parser |
| **Form Validation** | Zod | `3.23.8` | Declarative schema validation, safe parsing, typed error maps |
| **CSS / Styling** | Tailwind CSS | `3.4.10` | Material Design 3 tokens, container queries, form reset |
| **Icons** | Lucide React + Material Symbols | `0.436.0` | SVG icons (`lucide-react`) + Material Symbols Outlined font |
| **Frontend Testing** | Vitest + RTL + JSDOM | `2.0.5` / `16.0.0` | Unit/component tests, V8 coverage provider |
| **E2E Testing** | Vitest + Playwright + TSX | `2.1.8` / `1.62.1` | Multi-tier functional, boundary, and concurrency test suites |

---

## 3. Frontend Client Architecture & State

### 3.1 Routing Inventory (`frontend/src/App.tsx`)

All routes render within `<AppLayout />` providing a sticky header (`Navbar`), Solapur business footer (`Footer`), and universal booking lookup dialog (`BookingLookupModal`).

| Route Path | Page Component | Access Level | Purpose & Core Interactions |
|---|---|---|---|
| `/` | `HomePage` | Public | Hero banner, Solapur trust pillars, service grid preview, testimonials preview, booking CTA |
| `/services` | `ServicesPage` | Public | Full service catalog with category filter chips (`ALL`, `HOME_APPLIANCE`, `ELECTRONICS`), ₹299 visit fee note |
| `/contact` | `ContactPage` | Public | Solapur helpline (`tel:`), WhatsApp booking (`wa.me`), workshop address, operating hours table |
| `/testimonials`| `TestimonialsPage`| Public | Verified customer reviews showcase, star rating filters, Google Review CTA prompt |
| `/login` | `Login` | Public | Email/Password auth, real-time password strength checklist, Google OAuth, sanitized error alerts |
| `/book` | `BookPage` | **Protected** (`ProtectedRoute`) | Multi-step booking form: personal details, service picker, date/slot picker, 409 conflict handling |
| `/booking/:ref`| `TrackingPage` | Public | Live booking tracking (`RR-YYYYMMDD-XXXX`), 4-stage timeline, technician card, cancellation modal |
| `/feedback` | `FeedbackPage` | Public | Single-use 1-5 star rating and comment form (reads `?jobReference=...&token=...`), Google Review link |
| `*` | `NotFoundPage` | Public | Catch-all 404 view with direct navigation back to home |

### 3.2 State Management & Data Fetching Topology

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     REACT COMPONENT TREE                                         │
│                      (HomePage, BookPage, TrackingPage, BookingForm, etc.)                       │
└──────────────────┬───────────────────────────────┬───────────────────────────────┬───────────────┘
                   │                               │                               │
                   ▼                               ▼                               ▼
       ┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
       │   AuthProvider.tsx   │        │  TanStack Query v5   │        │ useIdempotencyKey.ts │
       │  - Supabase Session  │        │  - Cache / Stale Time│        │  - RFC 4122 v4 UUID  │
       │  - JWT Bearer Token  │        │  - Smart 15s Polling │        │  - Header Generation │
       └───────────┬──────────┘        └───────────┬──────────┘        └───────────┬──────────┘
                   │                               │                               │
                   └───────────────────────┬───────┴───────────────────────────────┘
                                           │
                                           ▼
                               ┌──────────────────────┐
                               │     api/client.ts    │
                               │  - Axios Interceptor │
                               │  - RFC 7807 Parser   │
                               │  - Safe Fallbacks    │
                               └───────────┬──────────┘
                                           │ HTTPS / JSON
                                           ▼
                               ┌──────────────────────┐
                               │  Spring Boot Backend │
                               └──────────────────────┘
```

#### Custom React Query Hooks Inventory
- **`useBusiness()`**: Fetches business profile, address, operating hours, ₹299 fee. (`staleTime: 15 mins`).
- **`useServices()`**: Fetches published service offerings. (`staleTime: 10 mins`).
- **`useAvailability(serviceId, date)`**: Fetches available 1-hour slot list for selected service/date. (`staleTime: 30s`).
- **`useBookingTracking(publicReference)`**: Fetches live tracking status. **Smart Dynamic Polling**: Polls every `15s` during active states (`SCHEDULED`, `ASSIGNED`, `EN_ROUTE`, `ARRIVED`, `DIAGNOSING`, `WORKSHOP_REPAIR`); terminates polling upon reaching terminal states (`COMPLETED`, `UNABLE_TO_SERVE`, `CANCELLED`). (`staleTime: 5s`).
- **`useTestimonials()`**: Fetches curated Solapur customer reviews. (`staleTime: 15 mins`).
- **`useBooking()`**: Mutation executing `POST /api/v1/customer/bookings` with `Idempotency-Key` header.
- **`useCancelBooking()`**: Mutation executing `POST /api/v1/customer/bookings/{ref}/cancel`; automatically invalidates `['booking-tracking', ref]`.
- **`useFeedback()`**: Mutation executing `POST /api/v1/public/jobs/{jobRef}/feedback` with `X-Feedback-Token`.

### 3.3 UI Design System & Atomic Primitives

Implemented in `frontend/tailwind.config.js` following Material Design 3 / Stitch specifications:
- **Color Tokens**:
  - Primary (Deep Teal): `#005a71` (`primary-container: #0e7490`, `on-primary: #ffffff`)
  - Secondary (Mint Teal): `#006b5f` (`secondary-container: #62fae3`)
  - Surface & Background: `#f8f9ff` (`surface-container-low: #eff4ff`, `surface-container-lowest: #ffffff`)
  - Semantic Error: `#ba1a1a` (`error-container: #ffdad6`, `on-error: #ffffff`)
- **Typography & Touch Targets**: Primary font: **Manrope**. Minimum touch targets strictly enforce `48px` (`h-[56px] min-h-[48px]` for inputs and buttons).
- **11 Atomic UI Primitives (`src/components/ui/`)**:
  `Alert`, `Badge`, `Button`, `Card`, `Input`, `LoadingSpinner`, `Modal`, `Select`, `Skeleton`, `StarRating`, `Textarea`.

### 3.4 Forms, Validation & 409 Conflict Handling
- **Zod Client Schemas (`src/api/schemas.ts`)**:
  - `bookingFormInputSchema`: Full Name (2-100 chars), Phone (10-15 digits, regex), Address (5-500 chars), Problem (10-1000 chars), Date (`YYYY-MM-DD`), Slot ID.
  - `cancelBookingInputSchema`: Cancellation reason (3-500 chars).
  - `feedbackFormInputSchema`: Rating (integer 1-5), optional comment (max 1000 chars).
- **409 Concurrency Conflict Handling (`BookingForm.tsx:150-160`)**:
  When a double-booking race occurs, backend returns `409 Conflict` (`code: "SLOT_UNAVAILABLE"`) containing `alternatives: AlternativeSlot[]`. The frontend preserves all user inputs (Name, Phone, Address, Description), displays an inline conflict banner, and renders clickable alternative slot pills enabling 1-click re-submission.

---

## 4. Backend Architecture & REST API Surface

### 4.1 Modular Monolith Package Structure (`com.repairreach.backend`)

```
com.repairreach.backend
 ├── assignment/         # Technician allocation policies, Assignment entity & repository
 ├── booking/            # Booking aggregate, BookingService, CustomerBookingController, DTOs
 ├── business/           # Business, BusinessSettings, BusinessLocation, PublicBusinessController
 ├── catalog/            # ServiceOffering, ServiceRequirement, PublicCatalogController
 ├── customer/           # Customer, CustomerAddress, CustomerDevice, CustomerOtpService, PublicAuthController
 ├── feedback/           # Feedback, FeedbackAnalysis, Escalation, PublicFeedbackController
 ├── job/                # Job lifecycle entity, JobEvent state transition audit log
 ├── notify/             # OutboxEvent, NotificationAttempt, OutboxService (Transactional Outbox)
 ├── review/             # Testimonial, ReviewSyncRecord, ReviewService, PublicReviewController
 ├── scheduling/         # AvailabilityRule, AvailabilityException, ScheduleEntry, SchedulingEngine
 ├── shared/             # BaseAuditableEntity, GlobalExceptionHandler, SecurityConfig, ProblemDetailsDto
 └── technician/         # ApplicationUser, ExternalIdentity, Technician, TechnicianCapability
```

### 4.2 REST API Surface Inventory

| Method | Endpoint Path | Controller | Auth Required | Description & Contract Invariants |
|---|---|---|---|---|
| `GET` | `/api/v1/public/business` | `PublicBusinessController` | Public | Returns Solapur business info, operating hours, phone, ₹299 visiting charge |
| `GET` | `/api/v1/public/services` | `PublicCatalogController` | Public | Returns published appliance services (mobile repair strictly filtered) |
| `GET` | `/api/v1/public/availability/slots` | `PublicAvailabilityController` | Public | Computes available 1-hour slots for a given service UUID and `YYYY-MM-DD` date |
| `POST`| `/api/v1/public/auth/otp/send` | `PublicAuthController` | Public | Initiates customer phone verification (simulated OTP) |
| `POST`| `/api/v1/public/auth/otp/verify` | `PublicAuthController` | Public | Validates OTP; returns customer session capability token |
| `POST`| `/api/v1/customer/bookings` | `CustomerBookingController` | **Bearer JWT** | Creates & confirms booking atomically with `Idempotency-Key` header |
| `GET` | `/api/v1/customer/bookings/{ref}` | `CustomerBookingController` | **Bearer JWT** | Retrieves live booking tracking, timeline stage, and assigned technician |
| `POST`| `/api/v1/customer/bookings/{ref}/cancel` | `CustomerBookingController` | **Bearer JWT** | Cancels booking (pre-arrival: free; post-departure: ₹299 charge exception) |
| `POST`| `/api/v1/public/jobs/{jobRef}/feedback` | `PublicFeedbackController` | Token Header | Submits immutable 1-5 star rating and comment (`X-Feedback-Token`) |
| `GET` | `/api/v1/public/testimonials` | `PublicReviewController` | Public | Returns curated verified customer testimonials for Solapur |
| `GET` | `/api/v1/public/reviews` | `PublicReviewController` | Public | Returns synced Google Reviews (or empty list if unconfigured) |
| `GET` | `/actuator/health` | Spring Boot Actuator | Public | Liveness/readiness probe (`{"status":"UP"}`) for Docker & Railway |
| `GET` | `/actuator/info` | Spring Boot Actuator | Public | Build and service metadata probe |

### 4.3 Key Domain Lifecycles & Invariants

```
                            ┌────────────────────────────────────────────────────────┐
                            │                    BOOKING LIFECYCLE                   │
                            └───────────────────────────┬────────────────────────────┘
                                                        │
                                                        │ Customer submits booking
                                                        ▼
                                           ┌─────────────────────────┐
                                           │        CONFIRMED        │
                                           └────────────┬────────────┘
                                                        │
                         ┌──────────────────────────────┴──────────────────────────────┐
                         │ Pre-arrival cancel (< ARRIVED)                              │ Post-arrival / En route cancel
                         ▼                                                             ▼
            ┌─────────────────────────┐                                   ┌─────────────────────────┐
            │        CANCELLED        │                                   │ 400 Bad Request         │
            │ (Charge: ₹0 / Free)     │                                   │ (PostArrivalChargeExcep)│
            │ ScheduleEntry: RELEASED │                                   │ ₹299 Charge Mandatory   │
            └─────────────────────────┘                                   └─────────────────────────┘
```

1. **Available-Only Slot Engine (`SchedulingEngine.java:64-155`)**:
   - Queries `business_settings` and `availability_rule` for opening windows: Mon–Sat `09:00-19:00`, Sun `09:00-14:00`.
   - Hard-blocks weekday afternoon break: `14:00-16:00`.
   - Checks technician leaves in `availability_exception` and active bookings in `schedule_entry`.
   - Outputs **exclusively available slots** (`available: true`); booked/blocked slots are omitted.
2. **Atomic Booking Creation & Concurrency Defense (`BookingService.java:101-389`)**:
   - Validates inputs (name ≥ 2 chars, normalized phone `+91XXXXXXXXXX`, address ≥ 5 chars, problem ≥ 10 chars).
   - Acquires PostgreSQL Transactional Advisory Lock:
     ```sql
     SELECT pg_advisory_xact_lock(CAST(:k1 AS integer), CAST(:k2 AS integer))
     ```
   - Checks database GiST exclusion constraint on `schedule_entry`. If occupied, throws `SlotUnavailableException` (`409 Conflict`) returning alternative slot recommendations.
   - Atomically persists `Booking` (`CONFIRMED`), `Job` (`SCHEDULED`), `Assignment` (`ACCEPTED`), `ScheduleEntry` (`ACTIVE`), and `ScheduleRevision`.
   - Publishes `BOOKING_CONFIRMED` event to transactional `outbox_event` table.
3. **Cancellation Rules (`BookingService.java:455-526`)**:
   - If technician has not departed (`job.actualEnRouteAt == null && job.actualArrivedAt == null`):
     - `cancellationChargeApplicable = false`, `cancellationChargeType = PRE_ARRIVAL_NO_VISIT_CHARGE`.
     - Releases `ScheduleEntry` (`status = RELEASED`), immediately freeing the slot for public booking.
   - If technician is en route or on site (`actualEnRouteAt != null || actualArrivedAt != null`):
     - `cancellationChargeApplicable = true`, `cancellationChargeType = POST_ARRIVAL_VISIT_CHARGE_APPLICABLE`.
     - Throws `PostArrivalChargeException` with RFC 7807 Problem Details detailing the ₹299 visit fee.
4. **Immutable Feedback & Automated Escalation (`FeedbackService.java:56-170`)**:
   - Verifies `feedbackCapabilityToken` matching `job.feedbackCapabilityToken` (or via `X-Feedback-Token` header).
   - Enforces write-once immutability: duplicate submission throws `DuplicateFeedbackException` (`409 Conflict`).
   - If `rating <= 2`:
     - Creates `FeedbackAnalysis` record (`sentiment = NEGATIVE`, `unhappyCustomer = true`, `severityScore = 0.85`).
     - Creates `Escalation` record (`status = OPEN`, `priority = HIGH`, `triggerSource = "AI_ANALYSIS"`).
   - Returns curated Solapur Google Review CTA link (`https://g.page/r/repairreach-solapur/review`).

---

## 5. Database Architecture & Data Models

### 5.1 Flyway Migration History

| Version | Migration Script | Lines | Core Structural Changes & Seed Invariants |
|---|---|---|---|
| `V1` | `V1__initial_schema.sql` | 771 | Defines 29 relational tables, 17 custom ENUM types, GiST schedule exclusion constraints, indexes, and triggers (`trg_sync_schedule_entry_interval`). |
| `V2` | `V2__seed_data.sql` | 517 | Seeds `SOLAPUR_MAIN` business settings, operating hours, primary workshop location, application users, technician capabilities, 5 services, and availability rules. |
| `V3` | `V3__widen_token_columns.sql` | 6 | Widens token columns (`booking.capability_token`, `job.feedback_capability_token`) to `VARCHAR(512)` for signed JWTs. |
| `V4` | `V4__reseed_testimonials.sql` | 69 | Idempotently seeds 4 verified customer testimonials from Solapur (Rajesh Sharma, Anjali Deshmukh, Vikram Patil, Sneha Kulkarni). |
| `V5` | `V5__customer_oauth.sql` | 8 | Adds `auth_user_id UUID UNIQUE` to `customer` table for Supabase OAuth integration; drops legacy `booking.capability_token`. |

### 5.2 Core Relational Schema (29 Tables)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      DATABASE RELATIONAL MODEL                                   │
├────────────────────────────────┬────────────────────────────────┬────────────────────────────────┤
│ Multi-Tenant / Business Core   │ Catalog & Staffing Core        │ Customer & Booking Core        │
├────────────────────────────────┼────────────────────────────────┼────────────────────────────────┤
│ • business                     │ • application_user             │ • customer                     │
│ • business_settings            │ • external_identity            │ • customer_address             │
│ • business_location            │ • technician                   │ • customer_device              │
│ • availability_rule            │ • technician_capability        │ • booking                      │
│ • availability_exception       │ • service_offering             │ • job                          │
│                                │ • service_requirement          │ • job_event                    │
├────────────────────────────────┼────────────────────────────────┼────────────────────────────────┤
│ Scheduling & Concurrency Core  │ Quality, Feedback & Reviews    │ Durable Infrastructure Core    │
├────────────────────────────────┼────────────────────────────────┼────────────────────────────────┤
│ • assignment                   │ • feedback                     │ • outbox_event                 │
│ • schedule_entry (GiST index)  │ • feedback_analysis            │ • notification_attempt         │
│ • schedule_revision            │ • escalation                   │ • audit_event                  │
│                                │ • testimonial                  │ • idempotency_record           │
│                                │ • review_sync_record           │                                │
└────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘
```

### 5.3 Key Database Constraints & Triggers

1. **GiST Non-Overlap Schedule Exclusion (`V1__initial_schema.sql:480-484`)**:
   ```sql
   CONSTRAINT schedule_entry_no_overlap EXCLUDE USING gist (
       technician_id WITH =,
       active_interval WITH &&
   ) WHERE (status = 'ACTIVE')
   ```
2. **Interval Auto-Synchronization Trigger (`V1__initial_schema.sql:727-739`)**:
   ```sql
   CREATE FUNCTION trg_sync_schedule_entry_interval() RETURNS TRIGGER AS $$
   BEGIN
       NEW.active_interval := tstzrange(NEW.start_time, NEW.end_time, '[)');
       NEW.schedule_date := (NEW.start_time AT TIME ZONE 'Asia/Kolkata')::DATE;
       NEW.updated_at := CURRENT_TIMESTAMP;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```
3. **Idempotency Scope & Key Uniqueness (`V1__initial_schema.sql:658`)**:
   ```sql
   CONSTRAINT uk_idempotency_scope_key UNIQUE(scope, idempotency_key)
   ```
4. **Phone Uniqueness per Business (`V1__initial_schema.sql:305`)**:
   ```sql
   CONSTRAINT uk_customer_business_phone UNIQUE(business_id, normalized_phone)
   ```

---

## 6. Authentication, Authorization & Security Posture

### 6.1 Authentication Topology

```
                          ┌────────────────────────────────────────────────────────┐
                          │                      React 18 SPA                      │
                          │   - Supabase Client (@supabase/supabase-js)            │
                          │   - AuthProvider Context Hook (useAuth)                │
                          │   - ProtectedRoute Guard on /book                      │
                          └───────────────────────────┬────────────────────────────┘
                                                      │
                                                      │ Bearer JWT (Supabase Access Token)
                                                      ▼
                          ┌────────────────────────────────────────────────────────┐
                          │             Spring Boot OAuth2 Resource Server         │
                          │   - NimbusJwtDecoder / SecurityFilterChain             │
                          │   - Remote JWKS Verification (No shared secrets)       │
                          └───────────────────────────┬────────────────────────────┘
                                                      │
                                                      │ HTTPS GET JWKS Public Keys
                                                      ▼
                          ┌────────────────────────────────────────────────────────┐
                          │                     Supabase Auth                      │
                          │   https://${PROJECT_REF}.supabase.co/auth/v1/.well-known │
                          └────────────────────────────────────────────────────────┘
```

- **Customer Auth**: Supabase Auth (Email/Password & Google OAuth).
- **Backend Token Validation**: Spring Security OAuth2 Resource Server validates incoming Bearer JWTs against Supabase JWKS endpoint.
- **Capability Tokens**: HMAC-SHA256 tokens (`JwtCapabilityTokenService.java`) for tokenized customer interactions (feedback links, anonymous booking session capabilities).

### 6.2 Security Hardening & Defense-in-Depth

| Security Guard | Source Location | Hardened Behavior |
|---|---|---|
| **RFC 7807 Error Sanitization** | `GlobalExceptionHandler.java:50-354` | All exceptions mapped to `application/problem+json` with standard problem URIs (`https://api.repairreach.shop/problems/*`). Strips Java stack traces, Jackson JSON deserialization errors, and Hibernate SQL internals. |
| **Spring Error Endpoint Lockdown** | `application.yml:4-7`, `application-prod.yml:4-7` | Enforces `server.error.include-stacktrace: never`, `include-message: never`, `include-binding-errors: never`. |
| **Frontend Auth Error Sanitization** | `frontend/src/lib/authErrorTranslator.ts` | Translates Supabase error codes into user-friendly copy. Defense-in-depth loop blocks forbidden keywords (`Supabase`, `AuthApiError`, `rate limit`, `User already registered`, `Invalid login credentials`, `Brevo`, `SMTP`). |
| **Production DevTools Logging Guard** | `frontend/src/lib/logger.ts` | Gated on `import.meta.env.DEV`. All console logging (`debug`, `info`, `warn`, `error`) is a complete no-op in production builds (`import.meta.env.PROD === true`). |
| **Traceability / Correlation ID** | `CorrelationIdFilter.java` | Injects `X-Correlation-ID` into every request/response cycle and attaches it to RFC 7807 problem payloads. |
| **CORS Whitelist & Preflight** | `SecurityConfig.java:58-84`, `WebConfig.java:17-30` | Configures allowed origins (`https://repairreach.shop`, `https://repairreach.vercel.app`, `http://localhost:5173`), exposed headers (`Idempotency-Key`, `X-Correlation-ID`, `X-Feedback-Token`), `allowCredentials: true`. |
| **Stateless Sessions & CSRF** | `SecurityConfig.java:36-38` | `SessionCreationPolicy.STATELESS`, CSRF disabled for REST API. |

---

## 7. Implementation Reality Check (Working vs Stubbed/Pending)

The following table provides an exhaustive, unambiguous breakdown of what is 100% operational in the repository versus what is currently a simulated seam, partial implementation, or deferred future scope:

| Feature / Subsystem | Implementation Reality | Source File Reference | Working Status |
|---|---|---|:---:|
| **Public Business Profile & Operating Hours** | Fully implemented; returns Solapur business data, operating schedule, ₹299 visiting charge. | `BusinessService.java`, `PublicBusinessController.java` | ✅ **100% Working** |
| **Service Catalog (5 Appliance Types)** | Fully implemented; Washing Machine, Fridge, Microwave, AC, TV. Mobile repair strictly filtered out. | `CatalogService.java`, `PublicCatalogController.java` | ✅ **100% Working** |
| **Available-Only Slot Engine** | Fully implemented; calculates 1-hour slots, checks Sunday closing, weekday breaks (14:00-16:00), leaves, and active bookings. | `SchedulingEngine.java:64-155` | ✅ **100% Working** |
| **Atomic Booking Confirmation** | Fully implemented; creates Booking, Job, Assignment, ScheduleEntry under transactional advisory lock. | `BookingService.java:101-389` | ✅ **100% Working** |
| **PostgreSQL GiST Overlap Defense** | Fully implemented in database migration; physical exclusion constraint prevents double-booking. | `V1__initial_schema.sql:480-484` | ✅ **100% Working** |
| **Booking Idempotency Engine** | Fully implemented; caches response by `Idempotency-Key` and checks SHA-256 request payload hash. | `BookingService.java:104-126`, `IdempotencyRecord.java` | ✅ **100% Working** |
| **Booking Cancellation Policy** | Fully implemented; pre-arrival free cancellation releases schedule entry; post-departure triggers ₹299 charge exception. | `BookingService.java:455-526` | ✅ **100% Working** |
| **Immutable Feedback Collection** | Fully implemented; single-use token verification, prevents duplicate submissions (`409 Conflict`). | `FeedbackService.java:56-170` | ✅ **100% Working** |
| **RFC 7807 Error Sanitization** | Fully implemented; all exceptions mapped to sanitized problem details with stack traces suppressed. | `GlobalExceptionHandler.java:50-354` | ✅ **100% Working** |
| **Supabase JWT Resource Server** | Fully implemented; validates incoming Bearer JWTs against Supabase JWKS endpoint. | `SecurityConfig.java:34-55` | ✅ **100% Working** |
| **Frontend Auth Error Sanitization** | Fully implemented; replaces Supabase/SMTP errors with clean user-friendly copy. | `authErrorTranslator.ts:39-266` | ✅ **100% Working** |
| **Frontend Production Logger Guard** | Fully implemented; suppresses console logging in production builds. | `logger.ts:10-59` | ✅ **100% Working** |
| **Customer User-Scoped Authorization** | **PARTIAL / TODO**: Controller endpoint has TODO comments: `// TODO: authorize that this booking belongs to the current user`. Subject is parsed from JWT but not asserted against booking customer. | `CustomerBookingController.java:39,51` | ⚠️ **Partial Logic** |
| **Phone OTP Verification** | **SIMULATED / IN-MEMORY**: In-memory `ConcurrentHashMap` with fallback OTP `"123456"`. No real SMS provider (Twilio/MSG91) connected. | `CustomerOtpService.java:48-56,70-72` | ⚠️ **Simulated Seam** |
| **AI Feedback Sentiment & Escalation** | **RULE-BASED STUB**: Hardcoded rule (rating ≤ 2 creates `FeedbackAnalysis` and `Escalation`). No external LLM API (OpenAI/Claude) connected. | `FeedbackService.java:122-144` | ⚠️ **Rule-Based Seam** |
| **Transactional Outbox Dispatcher** | **PARTIAL**: Events are persisted to `outbox_event` table, but no polling background worker exists to dispatch them to external message queues. | `OutboxService.java:28-54` | ⚠️ **Partial Seam** |
| **Google Reviews Fetcher** | **STUBBED**: Adapter returns empty reviews list with `configured: false`. | `ReviewService.java:53-61` | ⚠️ **Stubbed Adapter** |
| **Payment Gateway Integration** | **DEFERRED (FUTURE)**: No Stripe/Razorpay SDK or webhook handlers. ₹299 fee is purely an accounting record. | `ADR-008`, `docs/architecture/` | ❌ **Future Scope** |
| **Technician Mobile App (Android)** | **DESIGN ASSETS ONLY**: HTML/screen exports exist in `stitch_repairreach_technician_mobile_app`; no native Android/Kotlin codebase. | Workspace directories | ❌ **Future Scope** |

---

## 8. Development & Verification Reference

### 8.1 Key Build and Test Commands

#### Backend Verification (Java 21 / Maven)
```bash
# Run all backend unit and integration tests (PostgreSQL Testcontainers)
cd /home/sami/Desktop/RepairReach/backend
mvn clean test

# Build production executable Fat JAR (skipping tests)
mvn clean package -Dmaven.test.skip=true

# Run backend with local profile (reads root .env)
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

#### Frontend Verification (Node 20 / Vite / Vitest)
```bash
# Install frontend dependencies
cd /home/sami/Desktop/RepairReach/frontend
npm install

# Run all 14 Vitest unit, component, and integration suites
npm test

# Run Vitest with code coverage report
npm run test:coverage

# Build static production bundle to dist/
npm run build
```

#### End-to-End Test Suite Execution (5 Tiers, 224+ Tests)
```bash
# Run all E2E test suites (Tiers 1 through 5)
cd /home/sami/Desktop/RepairReach/e2e-tests
npm run test:all

# Run specific E2E test tier (e.g. Tier 1 Core Feature Coverage)
npm run test:tier1
```

### 8.2 Deployment Configurations & Environments

#### 1. Railway Container Deployment (`backend/railway.toml` & `backend/Dockerfile`)
- **Base Image**: Multi-stage `maven:3.9-eclipse-temurin-21-alpine` -> `eclipse-temurin:21-jre-alpine`.
- **JVM Options**: `-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0`.
- **Health Check Probe**: `GET /actuator/health` (timeout: 100s, max retries: 10).
- **Dynamic Port**: Binds to Railway `$PORT`.

#### 2. Vercel SPA Deployment (`vercel.json` & `frontend/vercel.json`)
- **Framework**: Vite.
- **Build Command**: `cd frontend && npm run build`.
- **Output Directory**: `frontend/dist`.
- **Install Command**: `cd frontend && npm install`.
- **SPA Rewrites**: `[{"source": "/(.*)", "destination": "/index.html"}]`.

#### 3. Local Multi-Container Development (`docker-compose.yml`)
```bash
# Start backend (port 8080) and frontend (port 5173) with live Supabase DB
docker compose up --build
```

### 8.3 Environment Variables Reference Matrix

| Variable Name | Target Service | Required | Purpose / Example Value |
|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | Backend | **Yes** | `prod` (activates `application-prod.yml`) |
| `SPRING_DATASOURCE_URL` | Backend | **Yes** | `jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require&stringtype=unspecified` |
| `SPRING_DATASOURCE_USERNAME` | Backend | **Yes** | `postgres.<SUPABASE_PROJECT_REF>` |
| `SPRING_DATASOURCE_PASSWORD` | Backend | **Yes** | `<SUPABASE_DB_PASSWORD>` |
| `SUPABASE_PROJECT_REF` | Backend | **Yes** | Supabase project identifier (e.g. `mllhxxzjbzfupaolelsz`) |
| `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI` | Backend | **Yes** | `https://<PROJECT_REF>.supabase.co/auth/v1/.well-known/jwks.json` |
| `CORS_ALLOWED_ORIGINS` | Backend | **Yes** | `https://repairreach.shop,https://repairreach.vercel.app,http://localhost:5173` |
| `APP_JWT_SECRET` | Backend | **Yes** | 64+ character secret for internal HMAC capability tokens |
| `VITE_API_BASE_URL` | Frontend | **Yes** | `https://repairreach-backend.up.railway.app/api/v1` |
| `VITE_SUPABASE_URL` | Frontend | **Yes** | `https://<PROJECT_REF>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Frontend | **Yes** | Supabase public anonymous API key |

### 8.4 Post-Deployment Verification Smoke Tests

```bash
# 1. Verify Backend Liveness & Readiness
curl -i https://<YOUR_RAILWAY_DOMAIN>.up.railway.app/actuator/health

# 2. Verify Solapur Business Profile
curl -i https://<YOUR_RAILWAY_DOMAIN>.up.railway.app/api/v1/public/business

# 3. Verify Appliance Catalog
curl -i https://<YOUR_RAILWAY_DOMAIN>.up.railway.app/api/v1/public/services

# 4. Verify Available Time Slots (Excludes breaks & Sunday afternoon)
curl -i "https://<YOUR_RAILWAY_DOMAIN>.up.railway.app/api/v1/public/availability/slots?serviceId=<SERVICE_UUID>&date=2026-08-25"

# 5. Verify CORS Preflight Headers
curl -i -X OPTIONS https://<YOUR_RAILWAY_DOMAIN>.up.railway.app/api/v1/public/business \
  -H "Origin: https://repairreach.shop" \
  -H "Access-Control-Request-Method: GET"
```
