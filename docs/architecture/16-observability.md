# Observability Architecture

> Classification: DECISION baseline for practical MVP observability.

## Practical MVP approach

Use structured application logs, correlation IDs, basic request/transaction metrics, provider-call metrics, and durable domain audit records. A hosted log/metrics backend can be selected during deployment; no new distributed observability stack is required by this architecture.

## Required signals

| Area | Signals |
|---|---|
| Booking | request volume, validation failures, slot conflicts, confirmation latency, idempotency reuse, unresolved slot-selection cases |
| Scheduling | overlap constraint violations, reflow previews/commits, version conflicts, schedule adjustment failures, affected-entry count |
| Assignment | candidate counts, no-capable-technician outcomes, rejection/reassignment rate, assignment latency |
| Job | illegal transition attempts, arrival/completion variance, unable-to-serve outcomes, workshop transfer counts |
| Authentication | invalid token, disabled user, forbidden resource access, login/session failures |
| Notifications | outbox age, attempts, provider failures, retry exhaustion, undelivered event types |
| AI | pending age, provider latency, analysis failure/retry, escalation creation |
| External providers | Maps/Google/WhatsApp/AI request latency and typed failures |
| Database | transaction latency, lock waits, constraint conflicts, connection pool saturation |

## Correlation and audit

Every API request receives a correlation ID. Commands propagate it to audit and outbox records. Audit records answer who changed a schedule, what changed, why, and which bookings were affected. Logs contain IDs and outcomes, not raw customer feedback or full addresses.

## Operational alerts

Alert on sustained booking failures, repeated schedule conflicts, stale outbox/AI queues, authentication failure spikes, provider outage, database lock/latency thresholds, and failed schedule reflows. A single expected slot conflict is a business response, not an infrastructure alert.

## Health endpoints

Expose safe liveness/readiness checks for the application and database connection. Provider health should be reported separately; an unavailable AI or notification provider must not make the core booking API appear down if transactional operations remain healthy.
