# Domain Architecture

> Classification: DECISION baseline. Confirmed product facts are preserved; uncertain fields remain subject to open decisions.

## Core concepts

### Business

The service business operating in Solapur. It owns operating timezone, business contact information, locations, working-hour configuration, and policy configuration. The model supports one business now and multiple businesses only as a future extension; multi-tenant behavior is not an MVP requirement.

### Customer, address, and device

Customer is a durable relationship identity keyed by verified/normalized contact information as far as the current workflow allows. Address is a customer-owned value/entity that can be reused and snapshotted onto a service request. Device/appliance history is a useful relationship record only when captured in the service workflow; it is not an excuse to store arbitrary sensitive data.

### Service offering and capability

A service offering is configurable business data. It includes name, category, description, supported service location, planning duration, optional buffers, home/workshop/transfer support, capability requirements, and scheduling constraints. A technician capability is a separate qualification/availability fact. Service examples in Stitch do not define catalog truth.

### Booking

Booking is the customer's request and business commitment around a service. It contains customer, requested service, location, problem description, requested/selected time intent, public reference, and links to the resulting job and schedule. It does not contain detailed execution state or replace the schedule reservation.

### Assignment

Assignment is the relationship between a job and technician over time. It records who was selected, by which policy or operator, when it became effective, acceptance/rejection, and replacement history. It is not a technician field copied into booking.

### Job

Job is the operational service lifecycle created from a confirmed booking. It can represent a home visit, diagnosis, optional device transfer, workshop repair, and completion as one customer service lifecycle. A job can have multiple activities/phases without creating an unrelated second service history item.

### Schedule entry

Schedule entry is a reservable time interval for an operational activity, initially the home visit. It owns the currently committed planned interval, resource/technician, location, and version. Prior values are retained as schedule revisions/audit records. Schedule entry is not the booking and not the job lifecycle.

### Feedback, analysis, escalation

Feedback is the immutable customer-authored rating/comment associated with a job. Analysis is a separate, versioned machine-produced interpretation. Escalation is a business follow-up work item derived from analysis or owner policy. None may alter the source feedback.

### Reviews and testimonials

Google reviews are external snapshots with source identifiers and synchronization metadata. Website testimonials are curated internal content with provenance and publication state. Private feedback is neither of these.

## Aggregate ownership

| Aggregate / boundary | Invariant examples |
|---|---|
| Business configuration | A service/location references an active business; configured hours are valid intervals in the business timezone |
| Customer | Addresses belong to the customer; contact data is minimized and history references remain stable |
| Service offering | Published services have valid planning data and supported locations/capability requirements |
| Booking | A confirmed booking points to a committed schedule and job; cancellation obeys job arrival boundary |
| Schedule | An active technician schedule interval cannot overlap another active interval; every mutation has a revision |
| Assignment | A current assignment has one effective technician; candidate is capable and schedule reservation succeeds |
| Job | Lifecycle transitions are legal, timestamped, actor-attributed, and linked to the booking |
| Feedback | Original rating/comment and submission time are immutable after acceptance |
| Testimonial | Only curated approved content is public; external review records are read-only imports |

## Information ownership versus projections

Transactional ownership stays normalized. Customer history is primarily a query across customer, booking, job, assignment, schedule, feedback, and device records. A denormalized history read model may be added for performance, but it is derived and rebuildable. It must not become a second authority.

Future follow-up or re-engagement can be represented as an explicit business interaction record or projection tied to the customer and completed service. It is not an MVP requirement and arbitrary marketing attributes must not be added to the customer record merely to anticipate it.

## Domain events

Useful internal events include `BookingConfirmed`, `ScheduleChanged`, `TechnicianAssigned`, `JobArrived`, `JobCompleted`, `BookingCancelled`, `FeedbackSubmitted`, `FeedbackAnalysisCompleted`, and `EscalationCreated`. Events are emitted after the owning transaction commits through an outbox record; they are not used to bypass synchronous invariants.
