# E2E Test Infra: RepairReach Hardening

## Test Philosophy
- Opaque-box, requirement-driven verification derived directly from `ORIGINAL_REQUEST.md` and acceptance criteria.
- Methodology: 4-Tier Validation (Feature Coverage, Boundary & Corner, Cross-Feature Combinations, Real-World Scenarios) + Adversarial Integrity Forensics.

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Backend Exception Detail Sanitization | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Backend Problem Type URIs (`api.repairreach.shop`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Backend Server Error 500 Lockdown | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | Frontend Supabase Error Translation | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 5 | Frontend Auth UI Sanitization | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 6 | Frontend Production-Safe Logging | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |

## Test Architecture
- **Backend Test Runner**: Maven MockMvc unit and integration tests (`mvn test -Dtest=GlobalExceptionHandlerTest`).
- **Frontend Test Runner**: Vitest unit and component tests (`npm test` in `frontend/`).
- **E2E & Acceptance Verification Script**: Node.js / Bash verification runner that executes static analysis, grep audits, production build tests, and runtime payload validations.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | User attempts login with bad credentials, expired OTP, rate-limited email, and custom SMTP failures | F4, F5 | Medium |
| 2 | Malformed JSON payloads, invalid UUIDs, missing params, constraint violations sent to API | F1, F2 | Medium |
| 3 | Unhandled 500 trigger and server error response validation | F1, F2, F3 | High |
| 4 | Production bundle build and DevTools console inspection simulation | F6 | Medium |
| 5 | End-to-end user signup and login flow with sanitized feedback | F1, F4, F5, F6 | High |

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (Happy-path & isolated feature tests)
- Tier 2: ≥5 test cases per feature (Boundary values, malformed inputs, null/empty, invalid formats)
- Tier 3: Pairwise cross-feature interactions
- Tier 4: ≥5 realistic end-to-end scenarios
