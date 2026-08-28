# ADR-002: Use Supabase PostgreSQL as the transactional datastore

- Status: Accepted
- Date: 2026-08-16

## Context

Bookings, schedule intervals, customer history, assignment, audit, and feedback require relational constraints and transactions. Supabase PostgreSQL is a confirmed technology choice.

## Decision

Store all authoritative business/domain state in Supabase PostgreSQL. Use foreign keys, range/exclusion constraints, indexes, versioning, and transactional outbox records. The frontend never receives direct database credentials or makes direct database calls.

## Consequences

The system gains strong consistency and SQL queryability. Schema migrations must be deliberate, and Firebase collections cannot be introduced as a second source of truth for bookings, jobs, schedules, or customers.
