# ADR-003: Spring Boot is the business authority

- Status: Accepted
- Date: 2026-08-16

## Context

Both customer and technician clients need availability, state transitions, authorization, assignment, and cancellation rules. Duplicating these rules in React or Android would create divergent behavior.

## Decision

Spring Boot owns business validation, domain commands, authorization, transaction boundaries, scheduling, assignment, and API DTO contracts. Clients render and request; they do not decide.

## Consequences

Clients remain replaceable and thinner. API latency and error UX must be designed well, and the backend needs explicit domain tests rather than relying on UI behavior.
