# ADR-007: Preserve separate customer web and technician Android surfaces

- Status: Accepted
- Date: 2026-08-16

## Context

The supplied Stitch packages are separate first-class surfaces with different users, interaction density, and visual systems. The technician target is Android.

## Decision

Implement React customer web and Android technician app as independent clients over the Spring Boot API. Preserve their design languages and do not make the Android app a disguised web dashboard.

## Consequences

There is some duplicated presentation work, but each client can optimize for public responsive booking versus field operations. Shared behavior comes from API/domain contracts, not shared UI code.
