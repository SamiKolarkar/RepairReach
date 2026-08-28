# Quality Assessment, Risks, and MVP Boundary

> Classification: DECISION and FUTURE boundary. Risks and future capabilities are not hidden requirements.

## Quality assessment

| Quality | Assessment |
|---|---|
| Correctness | Backend-owned commands, explicit state transitions, relational constraints, and arrival-based cancellation boundary protect core semantics. |
| Simplicity | One Spring Boot modular monolith, one transactional database, and durable outbox work avoid premature distributed systems. |
| Extensibility | Service capabilities, technician assignments, generic schedule entries, policies, and provider ports support future growth without singleton branches. |
| Domain integrity | Booking, assignment, schedule, job, feedback, analysis, and review records have separate ownership and invariants. |
| Concurrency safety | Transactional commands plus technician/day locking and a PostgreSQL overlap constraint prevent double-confirmed exclusive slots. |
| Maintainability | Modules expose contracts and exchange DTOs/IDs; provider SDKs and client state are isolated. |
| Testability | Scheduling is an independent domain API; policy, transitions, overlap, idempotency, and provider failures can be tested without UI. |
| Deployment simplicity | Initial topology is a React web deployment, Android app, Spring Boot application, and Supabase PostgreSQL, with optional provider adapters. |
| One technician today | One technician is simply the only eligible candidate; no special architecture branch is needed. |
| Multiple technicians later | Technician capability, assignment history, candidate policy, and per-resource schedule constraints are present from the beginning. |
| Provider replacement | Firebase, Maps, Google, WhatsApp, and AI are adapters behind internal ports. |
| Scheduling evolution | Rules and policy inputs are configurable, with explicit preview/commit for dynamic adjustments. |

## Architectural risks

| Risk | Impact | Mitigation / trigger |
|---|---|---|
| Exact business hours/slot policy remain unresolved | Wrong availability and customer promises | Close OD-001/002 before implementing reservation; keep configuration data-driven |
| Schedule reflow becomes too complex for the first operator | Operational confusion or unsafe silent moves | Preview/commit, affected-job list, explicit operator action, immutable revisions |
| Maps/travel estimates are treated as precise | Overlapping or late home visits | Start with explicit buffer; label estimates; provider is an input, not authority |
| Public anonymous endpoints are abused | Spam, fake bookings, privacy exposure | Scoped capabilities, rate limits, payload bounds, abuse controls, minimal responses |
| Firebase identity leaks into domain tables | Provider lock-in and difficult migration | Store application user/technician IDs; isolate external subject mapping |
| External integrations block core workflows | Booking or feedback loss during provider outage | Outbox and async processing; provider failures remain observable work |
| Design fixtures become seeded business truth | Incorrect services/data shipped | Treat examples/placeholders as non-authoritative and load catalog/configuration from backend |
| AI output is over-trusted | Incorrect escalation or customer harm | Immutable source, schema validation, human follow-up, no automatic responses |
| Technician permissions broaden implicitly | Customer privacy/schedule tampering | Resource-level authorization and future owner permission boundary |
| Workshop requirements expand during implementation | Scope and data model churn | Track lifecycle now; defer workshop scheduling/parts inventory until policy is confirmed |

## MVP boundary

### In the initial architecture/implementation boundary

- Professional customer web experience preserving the supplied booking, confirmation, and feedback designs.
- Public booking with backend-calculated availability and atomic confirmation.
- One technician represented through the multi-technician model.
- Technician authentication and assignment-scoped Android operations.
- Availability rules, exceptions, breaks, fixed/configurable slot behavior, and operator-controlled schedule adjustment.
- Job lifecycle including arrival, diagnosis, optional device transfer, workshop state, and completion.
- Customer service history, private feedback, curated testimonials, and a read-only review integration boundary.
- Durable audit/outbox seams for later notification and AI delivery.

### Explicitly future

- Larger workforce optimization and advanced balancing.
- Separate owner/admin application and broad administration UI.
- Automated WhatsApp/SMS/email/push policy beyond selected approved channels.
- Advanced workshop capacity, parts inventory, payments, analytics, AMC/service contracts, and CRM marketing.
- Customer accounts, full offline-first operation, and distributed messaging infrastructure.

## Architectural fitness gate

Before implementation is declared ready, the team should have closed the open decisions that affect data shape and contracts, especially hours/slots, public capabilities, travel, Firebase services, notification policy, and service capability taxonomy. Documentation alignment alone is not runtime completion.
