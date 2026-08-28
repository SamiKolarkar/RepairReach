# ADR-006: Model service duration and capabilities as data

- Status: Accepted
- Date: 2026-08-16

## Context

RepairReach handles configurable electronics/appliance services, home and workshop work, optional transfer, approximate duration, and technician capability. Appliance-specific constants would block growth.

## Decision

Service offerings expose scheduling-relevant configuration and capability requirements. The scheduler consumes planning values and technician capability data through contracts rather than hardcoded appliance logic.

## Consequences

Catalog configuration must be validated and versioned where changes affect future bookings. Exact taxonomy and fields remain OD-012; published services cannot be exposed until required planning fields are valid.
