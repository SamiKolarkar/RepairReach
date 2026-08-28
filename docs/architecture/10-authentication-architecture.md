# Authentication and Authorization

> Classification: DECISION confirmed. Customer authentication is mandatory (fast phone OTP). Firebase remains the technician identity boundary.

## Identity boundaries

```text
Customer (web)
    → Phone OTP authentication (WhatsApp or SMS)
    → Customer identity record
    → Signed customer JWT (stateless session, 24h)
    → Capability JWT per booking (scoped: CANCEL, FEEDBACK)
    → Scoped operations: booking creation, cancellation, feedback

Technician (Android)
    → Firebase Authentication
    → Spring Boot Firebase token verification
    → external_identity(provider, subject) → application_user → technician profile
    → Scoped operations: job execution, availability management, status updates
```

The domain refers to `CustomerId`, `ApplicationUserId`, and `TechnicianId` — not Firebase UIDs or phone numbers. Provider replacement does not require rewriting bookings, jobs, or audit rows.

## Customer authentication — mandatory, fast OTP

Customer authentication is **required before booking creation**. The experience must be near-instant:

1. Customer enters phone number.
2. Backend sends OTP via WhatsApp (preferred) or SMS — consistent with the existing WhatsApp integration boundary.
3. Customer enters OTP (max 5-minute expiry).
4. Backend verifies OTP, creates or retrieves a `Customer` record, issues a signed **customer JWT**.
5. Customer JWT is stored client-side in `sessionStorage` (not `localStorage`).
6. All booking, cancellation, and feedback requests carry this JWT in the `Authorization: Bearer` header.

**Goal:** Attach a verified phone identity to every booking. Prevents fake/spam bookings that waste technician time. Rate-limit OTP sends (max 5 per phone per hour).

## Customer JWT — stateless session

```json
{
  "sub": "<customerId>",
  "scope": "customer",
  "iat": "<issued-at>",
  "exp": "<issued-at + 24h>"
}
```

Backend verifies signature, expiry, and scope on every protected customer endpoint. No server-side session store required for authentication.

## Capability JWT — booking operations

On successful booking creation, the backend issues a `capabilityToken` — a scoped JWT separate from the session JWT:

```json
{
  "sub": "<customerId>",
  "bookingId": "<bookingId>",
  "ref": "<publicReference>",
  "actions": ["CANCEL", "FEEDBACK"],
  "exp": "<lifecycle-aligned expiry>"
}
```

Used in `X-Capability-Token` header for `POST /api/bookings/{ref}/cancel` and `POST /api/jobs/{ref}/feedback`. When the job reaches `COMPLETED`, the backend also issues a short-lived `feedbackCapabilityToken` (actions: ["FEEDBACK"]) and delivers it via the outbox/WhatsApp adapter — the customer does not need to find the feedback form.

## Technician authentication (unchanged)

Technicians authenticate via Firebase on the Android app. The backend verifies the Firebase ID token (issuer, audience, signature, expiry, subject). A technician cannot query another technician's data by changing an ID.

## Technician availability is binding

A technician's pre-configured availability schedule is the basis for slots shown to customers. Once a customer books a slot within that declared window, **the technician cannot reject on scheduling grounds** — their availability declaration is their commitment. The `cannot_fulfill_assignment` path (illness, emergency) remains as an exceptional operational command requiring a mandatory reason; it is not a schedule-preference opt-out.

## Public vs. protected endpoints

| Endpoint | Auth required |
|---|---|
| `GET /api/services` | None |
| `GET /api/availability/slots` | None |
| `GET /api/testimonials`, `GET /api/reviews` | None |
| `POST /api/auth/otp/send` | None (rate-limited by IP + phone) |
| `POST /api/auth/otp/verify` | None |
| `POST /api/bookings` | Customer JWT |
| `GET /api/bookings/{ref}` | Capability JWT or Customer JWT |
| `POST /api/bookings/{ref}/cancel` | Capability JWT |
| `POST /api/jobs/{ref}/feedback` | Capability JWT |
| Technician endpoints | Firebase JWT |

## Authorization checks (all actors)

1. Verify token and application user status.
2. Resolve customer/technician/business scope.
3. Check permission for the command.
4. Check resource ownership.
5. Recheck state/version inside the transaction.

UI visibility is a convenience only. Hidden buttons do not provide protection.

## Credential and privacy rules

OTP secrets, JWT signing keys, Firebase credentials, and WhatsApp provider credentials are server-side secrets only. Logs must redact phone numbers, addresses, feedback text, and tokens.
