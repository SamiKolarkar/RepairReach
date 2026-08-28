# ADR-005: Make scheduling backend-authoritative

- Status: Accepted
- Date: 2026-08-16

## Context

Two near-simultaneous customer requests, technician changes, travel, exceptions, early completion, and delays can invalidate a client-rendered slot.

## Decision

The scheduling module calculates advisory slots and transactionally reserves/mutates the committed schedule. PostgreSQL overlap constraints and application locks/version checks enforce concurrency. Clients must revalidate through API commands.

## Consequences

The system can return a typed conflict and alternatives instead of double-confirming. UI implementations need clear handling for stale slots, previews, and schedule-change results.
