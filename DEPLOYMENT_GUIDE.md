# RepairReach — Production Deployment Guide

This guide provides exhaustive, step-by-step instructions for deploying the **RepairReach** multi-cloud production architecture:
1. **Database & Auth Layer**: Live [Supabase](https://supabase.com/) PostgreSQL with Supabase Auth (OAuth2 / JWKS) and automated Flyway migrations.
2. **Backend Web Service**: Spring Boot 3.3.3 (Java 21) hosted on [Render](https://render.com/) using the Native Java environment and managed via Infrastructure-as-Code (`render.yaml`).
3. **Frontend SPA**: React 18 + Vite + Tailwind CSS customer platform hosted on [Vercel](https://vercel.com/) with client-side SPA routing (`vercel.json`).

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        REPAIRREACH ARCHITECTURE                        │
│                                                                        │
│   ┌─────────────────────┐              ┌───────────────────────────┐   │
│   │   React 18 (Vite)   │              │   Spring Boot 3.3 (Java)  │   │
│   │       Frontend      │─────────────▶│          Backend          │   │
│   │     (Vercel SPA)    │  REST (JSON) │    (Render Web Service)   │   │
│   └──────────┬──────────┘              └─────────────┬─────────────┘   │
│              │                                       │                 │
│              │ Supabase JS SDK                       │ JDBC + SSL      │
│              │ (Anon Key / OTP)                      │ (Flyway V1-V4)  │
│              ▼                                       ▼                 │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      Supabase Cloud                            │   │
│   │   • PostgreSQL 16+ (GiST Constraints, Flyway Schema)           │   │
│   │   • Supabase Auth (JWKS: /auth/v1/.well-known/jwks.json)       │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Table of Contents
- [Prerequisites](#prerequisites)
- [Phase 1: Supabase Database & Auth Setup](#phase-1-supabase-database--auth-setup)
- [Phase 2: Backend Deployment on Render](#phase-2-backend-deployment-on-render)
- [Phase 3: Frontend Deployment on Vercel](#phase-3-frontend-deployment-on-vercel)
- [Phase 4: End-to-End Verification & Health Checks](#phase-4-end-to-end-verification--health-checks)
- [Operational Runbook & Troubleshooting](#operational-runbook--troubleshooting)

---

## Prerequisites

Before starting deployment, ensure you have:
1. A **GitHub account** with access to the `RepairReach` repository.
2. A **Supabase account** (Free or Pro tier) at [supabase.com](https://supabase.com/).
3. A **Render account** at [render.com](https://render.com/).
4. A **Vercel account** at [vercel.com](https://vercel.com/).
5. `curl` and a web browser for post-deployment verification.

---

## Phase 1: Supabase Database & Auth Setup

### Step 1.1: Create a Supabase Project
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project** and select your organization.
3. Configure the project details:
   - **Name**: `repairreach-prod` (or your preferred name)
   - **Database Password**: Generate and securely store a strong database password (e.g., in a password manager).
   - **Region**: Choose a region closest to your target audience (e.g., `South Asia (Mumbai)` for Solapur/India or `US East/West`).
   - **Pricing Plan**: Free or Pro.
4. Click **Create new project** and wait ~2 minutes for provisioning to complete.

### Step 1.2: Retrieve Database Connection Details
1. In the Supabase Dashboard, navigate to **Project Settings** (gear icon in the sidebar) → **Database**.
2. Scroll down to the **Connection parameters** / **Connection string** section.
3. Select the **JDBC** tab (or construct from URI):
   - **Host**: `db.<PROJECT_REF>.supabase.co` (e.g., `db.abcdefghijklmnop.supabase.co`)
   - **Port**: `5432` (Direct / Session Pooler)
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: Your database password set in Step 1.1.
4. **SSL Requirement**: Supabase PostgreSQL requires SSL encryption. Construct your production JDBC URL as follows:
   ```text
   jdbc:postgresql://db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
   ```
   > **Note on Connection Pooling**: If you use the Supavisor Session Pooler (recommended for high traffic or serverless environments), use:
   > ```text
   > jdbc:postgresql://aws-0-<REGION>.pooler.supabase.com:5432/postgres?sslmode=require
   > ```
   > For the pooler, the username format is `postgres.<PROJECT_REF>`.

### Step 1.3: Retrieve Supabase Auth & API Keys
1. In the Supabase Dashboard, navigate to **Project Settings** → **API**.
2. Under **Project URL**, copy the URL:
   - Example: `https://abcdefghijklmnop.supabase.co`
3. Under **Project API keys**, copy the `anon` / `public` key:
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. The backend verifies Supabase Auth tokens using the JSON Web Key Set (JWKS). Your JWKS URI is:
   ```text
   https://<PROJECT_REF>.supabase.co/auth/v1/.well-known/jwks.json
   ```

### Step 1.4: Schema Migrations (Flyway Automated)
You do **not** need to manually execute SQL scripts. When the Spring Boot backend boots on Render with the `prod` profile, Flyway automatically runs all migration scripts (`V1__initial_schema.sql` through `V4__...`) located in `backend/src/main/resources/db/migration/`:
- Creates all 29 relational tables (`business_profile`, `service_catalog_item`, `booking`, `schedule_entry`, `job`, `customer`, etc.).
- Installs PostgreSQL extensions (`btree_gist`, `uuid-ossp`).
- Establishes the GiST exclusion constraint on `schedule_entry.active_interval` to prevent overlapping technician bookings.
- Seeds the initial Solapur business profile, operating hours, and standard appliance services.

---

## Phase 2: Backend Deployment on Render

The backend is configured for deployment as a Native Java Web Service on Render using the repository's `render.yaml` Blueprint.

### Option A: Automated Deployment via Render Blueprint (Recommended)
1. Log in to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Connect your GitHub repository (`RepairReach`).
4. Render detects `render.yaml` in the root directory and displays the `repairreach-backend` web service definition.
5. Provide the required sensitive environment variables prompted by the Blueprint UI:
   - `SPRING_DATASOURCE_URL`
   - `SPRING_DATASOURCE_USERNAME`
   - `SPRING_DATASOURCE_PASSWORD`
   - `CORS_ALLOWED_ORIGINS`
   - `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI`
   *(Note: `APP_JWT_SECRET` is automatically generated by Render).*
6. Click **Apply**. Render will trigger the initial build and deployment.

---

### Option B: Manual Web Service Creation
If configuring manually without the Blueprint:
1. In the Render Dashboard, click **New +** → **Web Service**.
2. Select **Build and deploy from a Git repository** and connect `RepairReach`.
3. Fill in the service configuration:
   - **Name**: `repairreach-backend`
   - **Region**: `Oregon (US West)` (or closest region)
   - **Branch**: `main` (or your production release branch)
   - **Root Directory**: *(leave blank — repository root)*
   - **Environment / Runtime**: `Java`
   - **Build Command**:
     ```bash
     cd backend && mvn clean package -DskipTests
     ```
   - **Start Command**:
     ```bash
     java -jar backend/target/repairreach-backend-0.0.1-SNAPSHOT.jar --server.port=$PORT
     ```
   - **Instance Type / Plan**: `Starter` ($7/mo recommended for production to avoid free-tier cold starts) or `Free`.
4. Expand **Advanced** and set:
   - **Health Check Path**: `/actuator/health`
   - **Auto-Deploy**: `Yes` (deploys automatically on push to branch)

---

### Backend Environment Variable Matrix

Configure these environment variables under the **Environment** tab in your Render Web Service dashboard:

| Variable Name | Required? | Sensitive? | Default / Fallback | Production Example Value | Purpose |
|---|---|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | **Yes** | No | `local` | `prod` | Activates `application-prod.yml` profile. |
| `SPRING_DATASOURCE_URL` | **Yes** | No | `jdbc:postgresql://localhost:5432/...` | `jdbc:postgresql://db.<REF>.supabase.co:5432/postgres?sslmode=require` | Supabase PostgreSQL JDBC connection string. |
| `SPRING_DATASOURCE_USERNAME` | **Yes** | No | `postgres` | `postgres` (or `postgres.<REF>` for pooler) | Supabase database username. |
| `SPRING_DATASOURCE_PASSWORD` | **Yes** | **Yes** | *(none)* | `your-db-password` | Supabase database user password. |
| `CORS_ALLOWED_ORIGINS` | **Yes** | No | `http://localhost:5173` | `https://repairreach.vercel.app,https://your-custom-domain.com` | Comma-separated list of allowed frontend origins for CORS. |
| `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI` | **Yes** | No | *(none)* | `https://<REF>.supabase.co/auth/v1/.well-known/jwks.json` | Supabase JWKS endpoint for validating Bearer tokens. |
| `APP_JWT_SECRET` | **Yes** | **Yes** | *(internal default)* | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` | HMAC-SHA256 secret (min 64 chars) for signing capability tokens. |
| `DB_POOL_MAX` | No | No | `10` | `10` | Maximum HikariCP pool connections. |
| `DB_POOL_MIN_IDLE` | No | No | `2` | `2` | Minimum idle connections in HikariCP pool. |
| `JAVA_TOOL_OPTIONS` | No | No | *(none)* | `-Xmx384m -Xms128m -XX:+UseG1GC` | JVM memory parameters to prevent container OOM killer. |

> **Copy your Render Backend URL**: Once deployed, copy your assigned Render service URL (e.g. `https://repairreach-backend.onrender.com`). You will need this for the frontend configuration in Phase 3.

---

## Phase 3: Frontend Deployment on Vercel

The frontend is a React 18 SPA built with Vite and Tailwind CSS. It requires client-side routing rewrites (`vercel.json`) to support deep linking and page refreshes.

### Step 3.1: Import Project into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Import the `RepairReach` GitHub repository.

### Step 3.2: Configure Build & Output Settings
In the **Configure Project** screen:
1. **Project Name**: `repairreach` (or `repairreach-frontend`)
2. **Framework Preset**: Select **Vite** (Vercel will usually auto-detect this).
3. **Root Directory**: Click **Edit** and set to `frontend`.
4. **Build and Output Settings**:
   - **Build Command**: `npm run build` (or leave toggle off for default)
   - **Output Directory**: `dist` (or leave toggle off for default)
   - **Install Command**: `npm install`

### Step 3.3: Configure Frontend Environment Variables
Under the **Environment Variables** section, add the following key-value pairs:

| Variable Name | Required? | Example Value | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | **Yes** | `https://repairreach-backend.onrender.com/api/v1/public` | Full URL to the Spring Boot public API endpoints. Must include `/api/v1/public`. |
| `VITE_SUPABASE_URL` | **Yes** | `https://abcdefghijklmnop.supabase.co` | Supabase Project URL for client-side Auth and SDK. |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Public Supabase anonymous API key. |

### Step 3.4: Deploy & Verify SPA Rewrites
1. Click **Deploy**.
2. Vercel will run `npm install` and `npm run build`, producing the production bundle in `frontend/dist`.
3. Once finished, Vercel will provide your production URL (e.g., `https://repairreach.vercel.app`).
4. **SPA Rewrite Verification**: `vercel.json` in the root and `frontend/` contains:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
   This ensures that refreshing paths like `/book`, `/track/RR-2026-0001`, or `/feedback` returns `index.html` with status 200 instead of a 404 error.

### Step 3.5: Synchronize CORS on Render
Return to the **Render Dashboard** → `repairreach-backend` → **Environment**:
- Ensure `CORS_ALLOWED_ORIGINS` includes your live Vercel domain (e.g., `https://repairreach.vercel.app` and any custom domains).
- Save changes to trigger an automatic re-deploy or configuration reload.

---

## Phase 4: End-to-End Verification & Health Checks

Follow these verification procedures to confirm the entire production pipeline is operational.

### 4.1 Backend Health Check
Verify the Spring Boot Actuator health endpoint:
```bash
curl -i https://repairreach-backend.onrender.com/actuator/health
```
**Expected Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.spring-boot.actuator.v3+json

{"status":"UP"}
```

---

### 4.2 Business Profile Public API
Verify that the business profile for Solapur is seeded and accessible:
```bash
curl -i https://repairreach-backend.onrender.com/api/v1/public/business
```
**Expected Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "...",
  "businessCode": "SOLAPUR_MAIN",
  "businessName": "RepairReach Solapur",
  "city": "Solapur",
  "state": "Maharashtra",
  "currency": "INR",
  "timezone": "Asia/Kolkata",
  "operatingHours": [...]
}
```

---

### 4.3 Service Catalog Public API
Verify that appliance repair services are loaded:
```bash
curl -i https://repairreach-backend.onrender.com/api/v1/public/services
```
**Expected Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "id": "...",
    "category": "WASHING_MACHINE",
    "name": "Washing Machine Repair",
    "basePrice": 399.00,
    "durationMinutes": 60,
    "active": true
  },
  ...
]
```

---

### 4.4 Real-Time Slot Availability Check
Query bookable slots for tomorrow's date:
```bash
# Replace <SERVICE_ID> with an ID from the services endpoint above
curl -i "https://repairreach-backend.onrender.com/api/v1/public/availability/slots?serviceId=<SERVICE_ID>&date=$(date -d '+1 day' +%Y-%m-%d)"
```
**Expected Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "serviceId": "...",
  "date": "2026-08-19",
  "slots": [
    {
      "startTime": "09:00:00",
      "endTime": "10:00:00",
      "available": true
    },
    {
      "startTime": "10:00:00",
      "endTime": "11:00:00",
      "available": true
    }
  ]
}
```

---

### 4.5 Customer Booking & Deep Link Verification
1. Open `https://<your-vercel-domain>.vercel.app` in your browser.
2. Click **Book a Repair** to navigate to `/book`.
3. Complete the booking form:
   - Enter customer name, phone number, and Solapur address.
   - Select an appliance service and pick an available time slot.
   - Click **Confirm Booking**.
4. Confirm redirection to `/booking/RR-2026-XXXX` with:
   - "Booking Confirmed" banner.
   - 2x2 Summary Box detailing service, technician schedule, and location.
   - Signed Capability Token stored for self-service cancellation.
5. **Deep Link Test**: Press `Ctrl+F5` (or `Cmd+Shift+R`) on `/booking/RR-2026-XXXX`. Confirm the page reloads the booking details cleanly without a 404 error.

---

## Operational Runbook & Troubleshooting

### Issue 1: Database Connection Refused or SSL Handshake Failed
- **Symptom**: Render backend logs show `PSQLException: FATAL: no pg_hba.conf entry` or `SSL connection has been closed unexpectedly`.
- **Resolution**:
  1. Ensure `?sslmode=require` is appended to `SPRING_DATASOURCE_URL`.
  2. If using Supabase Connection Pooler, verify you are connecting on port `5432` (Session Mode) or `6543` (Transaction Mode) and that username is formatted as `postgres.<PROJECT_REF>`.
  3. Verify the database password contains no unescaped special characters in the URL string, or supply username and password separately via `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD`.

### Issue 2: CORS Error in Browser Console (`Access-Control-Allow-Origin`)
- **Symptom**: Browser console displays `Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource`.
- **Resolution**:
  1. Inspect the `CORS_ALLOWED_ORIGINS` variable on Render.
  2. Ensure the exact origin of your Vercel deployment (including protocol `https://` and without trailing slashes) is listed:
     `https://repairreach.vercel.app`
  3. If testing custom domains or preview branches, add them comma-separated:
     `https://repairreach.vercel.app,https://repairreach-preview.vercel.app,https://repairreach.com`

### Issue 3: 404 Not Found on Page Refresh (Vercel)
- **Symptom**: Navigating directly to `/book` or refreshing a tracking link produces a Vercel 404 page.
- **Resolution**:
  1. Ensure `vercel.json` exists in `frontend/vercel.json` or root `vercel.json` with the rewrite rule `{"source": "/(.*)", "destination": "/index.html"}`.
  2. Verify that Vercel's **Root Directory** setting is set to `frontend`.

### Issue 4: JVM Out of Memory (OOM Killer Exit Code 137)
- **Symptom**: Render logs show `Container killed by OOM killer` or service restarts abruptly under load.
- **Resolution**:
  1. Verify `JAVA_TOOL_OPTIONS` is set to `-Xmx384m -Xms128m -XX:+UseG1GC`.
  2. Ensure maximum Hikari pool size (`DB_POOL_MAX`) is capped at `10` or lower to prevent excessive thread memory overhead.
  3. If running on Render Starter (512MB RAM), upgrade to Standard (2GB RAM) for high-concurrency workloads.

### Issue 5: Supabase Connection Limit Exceeded
- **Symptom**: Backend logs show `FATAL: remaining connection slots are reserved for non-replication superuser connections`.
- **Resolution**:
  1. Switch `SPRING_DATASOURCE_URL` to point to the Supabase Supavisor Session Pooler (port 5432).
  2. Set `DB_POOL_MAX=5` and `DB_POOL_MIN_IDLE=2` in Render environment variables.
