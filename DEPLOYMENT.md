# RepairReach — Production Deployment Guide (Railway + Vercel + Firebase + Supabase)

This guide documents the production deployment architecture, step-by-step setup, and operational configuration for **RepairReach**:
- **Frontend SPA**: React 18 + Vite + Tailwind CSS deployed to **Vercel**.
- **Backend REST API**: Spring Boot 3.3.3 (Java 21) running in a Docker container on **Railway**.
- **Database & Schema**: PostgreSQL 16+ hosted on **Supabase** with Flyway database migrations (V1 through V6).
- **Authentication**: **Firebase Auth** (Phone Number OTP & Google OAuth) with backend ID Token cryptographic verification via Google's public JWKS.

---

## Architecture Overview

```
┌──────────────────────────────────────┐               ┌──────────────────────────────────────┐
│        React 18 + Vite SPA           │               │       Spring Boot 3.3.3 API          │
│          (Vercel Cloud)              │               │          (Railway Cloud)             │
│   https://repairreach.shop           │               │    Port $PORT (default 8080)         │
│   https://repairreach.vercel.app     │               │    JVM Container Memory Tuned        │
└──────────────────┬───────────────────┘               └──────────────────┬───────────────────┘
                   │                                                      │
                   │ REST API (/api/v1/*)                                 │ JDBC over TLS (SSL)
                   │ Bearer ID Token (Firebase Auth)                      │ HikariCP Pool (Flyway V1-V6)
                   ▼                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Supabase Cloud                                        │
│  • PostgreSQL 16+ Database (29 Relational Tables, btree_gist, uuid-ossp)                    │
│  • Supavisor Session Pooler (Port 5432) / Direct Database (Port 5432)                        │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                               ▲
                                               │ Token Validation (Google JWKS)
                                               │ https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com
┌──────────────────────────────────────────────┴──────────────────────────────────────────────┐
│                                        Firebase Auth                                        │
│  • Phone OTP (+91 SMS verification) & Google OAuth                                          │
│  • Project ID: repairreach-prod                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Supabase Database Configuration

1. **Access Project**: Navigate to the [Supabase Dashboard](https://supabase.com/dashboard).
2. **Database Connection String**:
   - In **Project Settings** → **Database** → **Connection string**, select **JDBC**.
   - **Recommended (Session Pooler)**:
     ```
     jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require&stringtype=unspecified
     ```
   - **Direct Connection**:
     ```
     jdbc:postgresql://db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require&stringtype=unspecified
     ```
   - **Database User**: `postgres.<PROJECT_REF>` (for pooler) or `postgres` (direct).
   - **Database Password**: `<YOUR_SUPABASE_DATABASE_PASSWORD>`
3. **Flyway Migrations**:
   - Automated schema migrations (`V1` through `V6`) are applied automatically by Spring Boot on startup (`flyway.enabled=true`, `flyway.baseline-on-migrate=true`).

---

## 2. Railway Backend Deployment

### Setup Steps
1. Log in to [Railway](https://railway.app/).
2. Click **New Project** → **Deploy from GitHub repo** → select the `RepairReach` repository.
3. Configure the service:
   - Railway will detect `backend/railway.toml` and build using `backend/Dockerfile`.
   - The Docker multi-stage build uses `maven:3.9-eclipse-temurin-21-alpine` to package the application with `-Dmaven.test.skip=true`, then runs with `eclipse-temurin:21-jre-alpine` using container ergonomics (`-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0`).
   - Railway automatically injects the `PORT` environment variable.

### Railway Environment Variables Matrix

Configure the following variables in the Railway dashboard under **Variables**:

| Variable Name | Required | Example / Recommended Value | Description |
|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | **Yes** | `prod` | Activates `application-prod.yml` |
| `SPRING_DATASOURCE_URL` | **Yes** | `jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require&stringtype=unspecified` | Supabase JDBC URL with SSL enabled |
| `SPRING_DATASOURCE_USERNAME` | **Yes** | `postgres.<PROJECT_REF>` | Supabase database username |
| `SPRING_DATASOURCE_PASSWORD` | **Yes** | `<SUPABASE_DB_PASSWORD>` | Supabase database password |
| `FIREBASE_PROJECT_ID` | **Yes** | `repairreach-prod` | Firebase Project ID for token issuer and audience verification |
| `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI` | No | `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` | Google JWKS endpoint (defaults to Google's public endpoint) |
| `CORS_ALLOWED_ORIGINS` | **Yes** | `https://repairreach.shop,https://www.repairreach.shop,https://repairreach.vercel.app,http://localhost:5173` | Allowed frontend origins (comma-delimited) |
| `APP_JWT_SECRET` | **Yes** | `repairreach-super-secure-secret-key-for-jwt-capability-tokens-solapur-2026` | 64+ char secret for internal HMAC capability tokens |
| `APP_BUSINESS_DEFAULT_CODE` | No | `SOLAPUR_MAIN` | Default business code for Solapur operating unit |
| `DB_POOL_MAX` | No | `10` | Maximum HikariCP pool connections |
| `DB_POOL_MIN_IDLE` | No | `2` | Minimum HikariCP idle connections |
| `JAVA_TOOL_OPTIONS` | No | `-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0` | Container JVM options |

### Health Check
- Railway monitors container health using the path specified in `backend/railway.toml`:
  - **Path**: `/actuator/health`
  - **Success Response**: HTTP 200 `{"status":"UP"}`

---

## 3. Vercel Frontend Deployment

### Setup Steps
1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** → **Project** → import `RepairReach`.
3. Configure Project Settings (Root `vercel.json` automatically supplies monorepo build configuration):
   - **Framework Preset**: `Vite`
   - **Root Directory**: `.` (or `frontend`)
   - **Build Command**: `cd frontend && npm run build` (or `npm run build` if Root Directory is `frontend`)
   - **Output Directory**: `frontend/dist` (or `dist` if Root Directory is `frontend`)
   - **Install Command**: `cd frontend && npm install` (or `npm install` if Root Directory is `frontend`)
4. Single-Page Application (SPA) client-side routing is handled automatically by `vercel.json` rewrites (`/(.*) -> /index.html`).

### Vercel Environment Variables Matrix

Configure the following variables in Vercel under **Project Settings** → **Environment Variables**:

| Variable Name | Required | Example / Recommended Value | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | **Yes** | `https://repairreach-backend.up.railway.app/api/v1` | Public Railway backend API URL (includes `/api/v1`) |
| `VITE_FIREBASE_API_KEY` | **Yes** | `AIzaSy...` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Yes** | `repairreach-prod.firebaseapp.com` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | **Yes** | `repairreach-prod` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Yes** | `repairreach-prod.appspot.com` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Yes** | `123456789012` | Firebase Cloud Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | **Yes** | `1:123456789012:web:abcdef...` | Firebase Web App ID |

> **Note on Vite Build-Time Inlining**: Vite embeds `import.meta.env.*` variables at build time. When updating environment variables in Vercel, trigger a redeployment for changes to take effect.

---

## 4. Local Development with Docker Compose

To test the multi-container stack locally:

1. Create `.env` at the repository root:
   ```env
   SPRING_DATASOURCE_URL=jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require&stringtype=unspecified
   SPRING_DATASOURCE_USERNAME=postgres.<PROJECT_REF>
   SPRING_DATASOURCE_PASSWORD=<YOUR_PASSWORD>
   FIREBASE_PROJECT_ID=repairreach-dev
   ```
2. Create `frontend/.env.local`:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=repairreach-dev.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=repairreach-dev
   VITE_FIREBASE_STORAGE_BUCKET=repairreach-dev.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef...
   VITE_API_BASE_URL=http://localhost:8080/api/v1
   ```
3. Start the stack:
   ```bash
   docker compose up --build
   ```
4. Access the applications:
   - **Frontend SPA**: `http://localhost:5173`
   - **Backend API**: `http://localhost:8080/api/v1`
   - **Backend Health Endpoint**: `http://localhost:8080/actuator/health`

---

## 5. Post-Deployment Verification & Smoke Tests

Run the following curl commands to verify your deployment:

### 1. Actuator Health Check
```bash
curl -i https://<YOUR_RAILWAY_DOMAIN>.up.railway.app/actuator/health
```
**Expected Response**: `HTTP/1.1 200 OK` with JSON `{"status":"UP"}`.

### 2. Public Business Profile (Solapur Unit)
```bash
curl -i https://<YOUR_RAILWAY_DOMAIN>.up.railway.app/api/v1/public/business
```
**Expected Response**: `HTTP/1.1 200 OK` returning the Solapur business configuration.

### 3. Public Service Catalog
```bash
curl -i https://<YOUR_RAILWAY_DOMAIN>.up.railway.app/api/v1/public/services
```
**Expected Response**: `HTTP/1.1 200 OK` returning the active service catalog.

### 4. Availability Slots
```bash
curl -i "https://<YOUR_RAILWAY_DOMAIN>.up.railway.app/api/v1/public/availability/slots?serviceId=<SERVICE_UUID>&date=2026-08-25"
```
**Expected Response**: `HTTP/1.1 200 OK` with available booking time slots.

### 5. CORS Preflight Verification
```bash
curl -i -X OPTIONS https://<YOUR_RAILWAY_DOMAIN>.up.railway.app/api/v1/public/business \
  -H "Origin: https://repairreach.shop" \
  -H "Access-Control-Request-Method: GET"
```
**Expected Response**: `HTTP/1.1 200 OK` with header `Access-Control-Allow-Origin: https://repairreach.shop` and `Access-Control-Allow-Credentials: true`.
