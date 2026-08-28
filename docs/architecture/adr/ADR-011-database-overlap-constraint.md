# ADR-011: Enforce exclusive schedule overlap in PostgreSQL

- Status: Accepted
- Date: 2026-08-16

## Context

Application availability checks alone can race when two requests target the same interval. A double-confirmed exclusive slot is a core correctness failure.

## Decision

Represent active schedule intervals as PostgreSQL ranges and enforce same-resource non-overlap with a database exclusion constraint, supplemented by transaction locks and expected versions.

## Consequences

The database becomes the final concurrency guard and conflict responses are reliable. Migration setup must support the required range/operator classes, and tests must exercise concurrent requests.
