# API Architecture

> Classification: DECISION baseline. Endpoint paths are capability contracts; exact implementation naming may be finalized without changing semantics.

## Style

Spring Boot exposes versioned business-oriented REST APIs under `/api/v1`. Controllers translate HTTP to request DTOs and invoke application services. JPA entities and repositories never cross the API boundary.

```text
Controller -> request DTO validation -> application service
           -> domain policy / module port -> repository transaction
           -> response DTO
```

## Capability-oriented endpoints

The exact path names may be finalized during implementation, but the capabilities are fixed here:

### Public/customer

```text
GET  /api/v1/public/business
GET  /api/v1/public/services
GET  /api/v1/public/availability/slots
POST /api/v1/public/bookings
GET  /api/v1/public/bookings/{publicReference}
POST /api/v1/public/bookings/{publicReference}/cancel
POST /api/v1/public/jobs/{jobReference}/feedback
```

Public reads expose only intended public data. Public booking/feedback/cancellation uses an unguessable capability or equivalent proof; it does not expose sequential IDs or unrestricted customer history.

### Technician

```text
GET  /api/v1/technician/me
GET  /api/v1/technician/jobs?date=...
GET  /api/v1/technician/jobs/{jobId}
POST /api/v1/technician/jobs/{jobId}/accept
POST /api/v1/technician/jobs/{jobId}/cannot-fulfill
POST /api/v1/technician/jobs/{jobId}/en-route
POST /api/v1/technician/jobs/{jobId}/arrive
POST /api/v1/technician/jobs/{jobId}/start
POST /api/v1/technician/jobs/{jobId}/transfer
POST /api/v1/technician/jobs/{jobId}/complete
GET  /api/v1/technician/schedule
POST /api/v1/technician/schedule/preview-adjustment
POST /api/v1/technician/schedule/adjustment
GET  /api/v1/technician/availability
POST /api/v1/technician/availability/exceptions
```

The server checks that the authenticated technician owns the target assignment or has a future owner/operator permission. A path name is not an authorization rule.

### Internal/operator capabilities

Owner-facing endpoints may later expose reassignment, escalation handling, review curation, and business settings. They should not be built as broad CRUD solely because the domain has tables.

## DTO and validation rules

- Requests are explicit command/query DTOs, not entity-shaped passthroughs.
- Validate syntax at the API boundary and business invariants in the application/domain layer.
- Normalize phone/contact/address values consistently before matching.
- Validate service is published and supports requested location.
- Require a client-generated `Idempotency-Key` for public booking and retryable state-changing commands.
- Use an expected version/ETag-like value for mobile mutations where stale screen state could overwrite an operator change.

## Error model

Use a stable problem response such as:

```json
{
  "type": "https://api.repairreach.example/problems/slot-unavailable",
  "title": "Selected slot is no longer available",
  "status": 409,
  "code": "SLOT_UNAVAILABLE",
  "detail": "Choose one of the current alternatives.",
  "correlationId": "...",
  "alternatives": []
}
```

Important codes include `VALIDATION_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `SLOT_UNAVAILABLE`, `SCHEDULE_VERSION_CONFLICT`, `INVALID_STATE_TRANSITION`, `TECHNICIAN_NOT_CAPABLE`, `CANNOT_CANCEL_AFTER_CLOSURE`, and `EXTERNAL_SERVICE_UNAVAILABLE`.

## Transaction boundaries

Application services define transactions around booking confirmation, cancellation/arrival boundary, assignment/reassignment, job lifecycle mutations, schedule moves/reflows, feedback submission, and idempotency response recording. Queries do not hold long business transactions.

## API and event separation

REST responses are synchronous committed results. Domain events/outbox work is an internal post-commit mechanism for notifications, AI analysis, and synchronization. The API must not claim an external delivery succeeded merely because an outbox row was created.
