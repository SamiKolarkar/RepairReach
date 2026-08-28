# ADR-001: Use a modular monolith for the backend

- Status: Accepted
- Date: 2026-08-16

## Context

RepairReach begins with one business and one technician, but requires clean boundaries for future technicians, richer scheduling, feedback analysis, and integrations. Distributed deployment would add operational and consistency complexity before there is evidence it is needed.

## Decision

Build the backend as a Spring Boot modular monolith with explicit module ownership, application services, domain ports, and one transactional PostgreSQL boundary. Modules are not independent deployables in the initial system.

## Consequences

Booking, assignment, scheduling, and job operations can commit atomically. The codebase must enforce module dependency rules and must not use a shared table model as an excuse to bypass ownership. A later extraction remains possible only after real scaling/team/availability evidence.
