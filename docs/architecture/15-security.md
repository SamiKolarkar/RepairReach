# Security Architecture

> Classification: DECISION baseline for MVP security; enterprise controls listed as future are not implied requirements.

## Baseline controls

- HTTPS for web, Android, and provider calls.
- Server-side validation for every command.
- Firebase token verification at the API boundary for technician access.
- Technician resource ownership checks on every job/schedule query and mutation.
- No direct frontend-to-PostgreSQL or frontend-to-Supabase service-role access.
- CORS allowlist for the deployed customer web origin; Android uses authenticated API access.
- Rate limiting and abuse controls for public booking, cancellation, feedback, and availability endpoints.
- Unpredictable public references/capabilities rather than sequential IDs.
- Parameterized persistence access and bounded request payloads.
- Secrets only in deployment secret configuration; never in repository, HTML, or logs.
- Privacy-minimized customer data and redacted structured logs.

## Sensitive operations

Arrival, cancellation, assignment, reassignment, schedule movement, reflow, capability changes, feedback access, and testimonial publication create audit events with actor, timestamp, correlation ID, expected version, reason, and before/after summary.

## CORS and CSRF posture

Public APIs should use explicit origin/CORS policy and avoid ambient privileged browser cookies for technician access. If cookie-based public capability sessions are introduced, CSRF protection and same-site policy become mandatory. Token/capability handling must be chosen consistently during implementation.

## Threats addressed by the domain boundary

- A customer cannot claim a slot by changing a client-side status.
- A technician cannot see another technician's jobs by altering a path ID.
- A stale mobile action cannot overwrite a committed schedule without a version/conflict response.
- An external provider outage cannot silently turn a confirmed booking into an unknown state.
- AI cannot rewrite or auto-respond as the customer/business.

## Not in current scope

Enterprise SSO, complex tenant isolation, payments security, parts-inventory security, and a full security operations platform are future work. This does not remove the baseline controls above.
