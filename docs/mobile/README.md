# RepairReach Technician Android Handoff

This folder is the implementation handoff for the technician Android application. It is additive to `docs/architecture/11-mobile-architecture.md`; that architecture document remains the authority for backend ownership, authentication boundaries, scheduling, and offline limits.

The existing customer web implementation remains the source of truth for customer authentication and booking behavior. This handoff defines only the technician Android surface.

## Source of truth

- Product and domain requirements: [`RepairReach — Product & Engineering Knowledge Generation.md`](../../RepairReach%20%E2%80%94%20Product%20%26%20Engineering%20Knowledge%20Generation.md)
- Backend/mobile boundary: [`docs/architecture/11-mobile-architecture.md`](../architecture/11-mobile-architecture.md)
- Supplied visual design: [`stitch_repairreach_technician_mobile_app/field_professional/DESIGN.md`](../../stitch_repairreach_technician_mobile_app/field_professional/DESIGN.md)
- Supplied screens: `today_s_jobs`, `job_details`, `schedule`, `set_availability`, and `profile`, each containing `code.html` and `screen.png`.

## Documents

| Document | Purpose | Depends on |
|---|---|---|
| [`01-design-evidence.md`](01-design-evidence.md) | Records the supplied screens and visual rules without treating HTML as Android implementation | Stitch package, product knowledge |
| [`02-screen-and-behavior-spec.md`](02-screen-and-behavior-spec.md) | Defines screen states, user actions, backend commands, and forbidden client decisions | 01, architecture docs |
| [`03-android-client-architecture.md`](03-android-client-architecture.md) | Defines the Android layers, ownership, session, cache, retry, and navigation boundaries | 02, architecture docs |
| [`04-implementation-handoff.md`](04-implementation-handoff.md) | Orders future implementation work and records acceptance gates/open decisions | 01–03, backend API contracts |

No application code, Gradle project, assets, or design files are created by this handoff.
