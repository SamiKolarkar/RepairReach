# ADR-010: Keep booking, job, assignment, and schedule concepts separate

- Status: Accepted
- Date: 2026-08-16

## Context

A customer request can be awaiting slot resolution; a job can continue into a workshop; an assignment can change; and a schedule interval can move without changing service history.

## Decision

Booking owns the customer commitment, assignment owns resource responsibility, schedule entry owns a reservable interval, and job owns execution lifecycle. They are linked by IDs and commands, not collapsed into one mutable appointment row.

## Consequences

The model has more concepts but avoids contradictory state and supports dynamic scheduling, reassignment, and workshop transfer. Read models may combine them for client screens.
