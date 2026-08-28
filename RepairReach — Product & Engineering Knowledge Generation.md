# RepairReach — Knowledge Generation Only

You are working on **RepairReach**, a real-world electronics and home-appliance service platform.

Two existing Stitch-generated design packages are present in the repository:

1. Customer-facing web platform
2. Technician-facing mobile application

Your job in this phase is **NOT to implement the application**.

Your job is to inspect the supplied artifacts and the confirmed business requirements below, reconcile them, and generate a durable **product + domain + architecture knowledge base** that future Claude Code sessions can use as the source of truth.

Do not generate application code in this phase.

Do not redesign the UI.

Do not invent product requirements.

Do not silently resolve unknown business behavior.

When something remains unknown, record it explicitly as an open decision.

---

# 1. SOURCE OF TRUTH PRIORITY

Use the following priority order when interpreting the product:

1. Explicit confirmed business requirements in this document
2. Existing Stitch designs and their accompanying documentation
3. Existing source code, if any
4. Reasonable technical interpretation

Never override a confirmed business requirement merely because the UI design suggests something different.

When a design and business requirement conflict:

- record the conflict
- preserve the confirmed business requirement
- document the required UI/architecture implication
- do not modify the design in this phase

---

# 2. INSPECT THE UPLOADED DESIGN PACKAGES

Locate and inspect both supplied ZIP packages.

For each package:

- inspect the directory structure
- inspect all `DESIGN.md` files
- inspect all `code.html`
- inspect relevant assets
- inspect screenshots if present
- identify page-to-page relationships
- identify visible user actions
- identify fields
- identify status indicators
- identify navigation
- identify responsive/mobile behavior
- identify typography and design tokens

Create a design inventory before creating product conclusions.

Important:

There are TWO design packages and BOTH must be treated as first-class product surfaces.

Do not assume the technician application is merely a web dashboard because the design looks mobile.

The confirmed target is a **technician Android application**.

---

# 3. PRODUCT IDENTITY

RepairReach is being built for an established, professionally trustworthy electronics/appliance repair business in **Solapur, India**.

The existing business already has professional trust and reputation.

The software is intended to increase:

- reach
- incoming business
- home/service bookings
- shop visits where applicable
- repeat customers
- scheduling efficiency

The product should support the existing business rather than artificially changing its character.

The long-term direction is to allow the business to evolve into a larger **electronics service company**, where additional employees/technicians can be managed through the same system.

Therefore the domain model must not permanently assume that there is only one technician.

The first deployment may have only the owner/father as the technician.

---

# 4. CURRENT BUSINESS SCOPE

The business handles:

- home appliances
- electronics

Examples include:

- TV
- monitors
- other household electronics/appliances

Mobile phones are explicitly excluded.

Do not hardcode the example list as the complete service catalog.

Services must be configurable.

The service model must support adding new repair/service types without changing scheduling code.

---

# 5. SERVICE MODEL

Every service type must be treated as configurable business data.

A service should eventually be able to define properties such as:

- name
- description
- category
- approximate duration
- whether home visit is supported
- whether workshop handling is required
- whether device pickup/porting is possible
- operational constraints
- other scheduling-relevant properties

The exact final property set should be derived during domain analysis.

The system must not hardcode:

```text
TV repair = exactly 1 hour
```

The confirmed current operating assumption is that a typical initial visit is **approximately one hour**, including examination and, where necessary, device transfer to the shop.

This is a configurable operational value, not a permanent rule.

---

# 6. SERVICE LOCATION

The business operates through BOTH:

- shop/workshop service
- customer-home service

The customer should be able to request the appropriate service.

Do not automatically assume that every appliance supports both locations.

Model this as configurable service capability.

---

# 7. CUSTOMER ENTRY EXPERIENCE

Customers can enter RepairReach through:

- the website
- WhatsApp

The WhatsApp Business greeting already exists and is currently working.

Do not redesign the WhatsApp greeting.

Do not spend implementation effort reproducing the user's existing WhatsApp greeting unless necessary for documentation.

The website should be a professional public-facing business experience.

It should provide quick/direct access to:

- business information
- services
- contact options
- genuine reviews/testimonials
- booking

The customer is expected to spend limited time on the public website, so critical actions must be easy to find.

Do NOT create unnecessary navigation depth.

---

# 8. CUSTOMER CONTACT

The public website should support both:

- phone contact
- WhatsApp contact

However, document the exact boundary carefully:

RepairReach should not become a replacement for the business's direct communication channel.

Customer contact actions may be launched from the application/interface, but RepairReach's core purpose is to guide the customer through the service workflow.

Do not introduce arbitrary communication automation.

External communication remains an external boundary.

---

# 9. CUSTOMER EXPERIENCE

The public customer experience should include:

- business introduction
- services
- contact information
- working hours
- shop/business information
- genuine reviews/testimonials
- booking entry
- confirmation
- feedback

The previously supplied customer design contains at least:

- Booking
- Confirmation
- Feedback

Do not change those designs in this phase.

Instead document how those existing screens fit into the broader customer journey.

---

# 10. BOOKING REQUIREMENT

Customers can request a service through the website.

The exact final booking fields should be derived from the supplied design and business scenario.

At minimum, booking information will need to represent the customer, service, location, requested date/time, and problem/service details.

Do not finalize additional fields merely because they are common in other applications.

Mark uncertain fields as decisions for confirmation.

---

# 11. BOOKING CONFIRMATION MODEL

A key confirmed business behavior:

A customer's requested time does NOT necessarily need to be rejected merely because the initially requested slot cannot immediately be accommodated.

If the requested time cannot be accommodated, the application should resolve the problem by proposing/selecting an alternative appropriate time rather than unnecessarily delaying the customer.

The exact algorithm must be derived from the scenarios and scheduling model.

The system must remain responsible for checking actual availability.

Do not treat frontend availability as authoritative.

---

# 12. AUTOMATIC BOOKING BEHAVIOR

When a requested time is compatible with the current schedule, booking confirmation may happen automatically.

When the schedule cannot directly accommodate the request, the technician application acts as the operational control surface for resolving the schedule.

The technician/owner must be able to make necessary schedule changes quickly.

The scheduling system should minimize customer delay.

Do not interpret this as permission to silently move a booking without appropriate communication.

---

# 13. BOOKING ACCEPTANCE / CUSTOMER CALL

For operational workflow, the technician/owner will call the customer before the visit during the specified time workflow.

Document this as part of the service process.

Do not assume that every step must be automated.

Human interaction remains an intentional part of the business.

---

# 14. SCHEDULING

Scheduling is a core business capability.

Confirmed facts:

- fixed service time slots are used
- multiple jobs can occur in the same day
- availability is predictable and does not normally change day-to-day
- weekly recurring availability is relevant
- specific-date exceptions are also relevant
- technicians can manually submit exceptional unavailability when there is a strong reason
- occupied slots become unavailable when a booking is committed
- emergency/urgent work must be possible
- afternoon travel needs to be considered
- the system must support schedule changes without unnecessary customer delay

The exact slot size, travel model, break rules, and transition mechanics must be documented precisely rather than assumed.

---

# 15. WORKING HOURS

Current known pattern:

- working days include Sunday
- Sunday is a shorter day ending around the afternoon
- there is an afternoon break around 2 PM–4 PM
- regular working availability otherwise follows a predictable weekly schedule

Do not invent exact weekday opening/closing times that the business owner has not confirmed.

Record those exact times as open configuration.

---

# 16. DYNAMIC SCHEDULE ADJUSTMENT

The technician application is an active operational scheduling tool, not merely a read-only calendar.

Example confirmed behavior:

A technician may finish an earlier job sooner than expected.

Example:

```text
10:00–11:00 Job A
11:00–12:00 Job B
12:00–1:00 Job C
```

If Job A finishes early, the owner should be able to move Job B earlier.

Likewise, if a job is taking longer than expected, the owner should be able to adjust subsequent bookings.

Document schedule adjustment as a first-class domain capability.

Do not treat the original booking time as immutable.

---

# 17. CUSTOMER NOTIFICATION DURING SCHEDULE CHANGES

Schedule changes must not silently create customer confusion.

The architecture must allow the system to communicate schedule changes appropriately.

The exact notification channels and degree of automation remain to be documented as an open decision if not already specified by the supplied designs.

Do not automatically select SMS/WhatsApp/push/email without evidence.

---

# 18. CANCELLATION

Confirmed behavior:

A customer may cancel a booking.

If cancellation happens **before the technician arrives at the customer's location**, the visit does not incur a visiting charge.

If the technician has **arrived at the home**, the visiting charge becomes applicable.

The exact lifecycle state at which that boundary occurs must be explicitly modeled.

Possible states should be investigated through the domain model rather than guessed.

The customer must not have authority to reschedule a confirmed booking.

Technician/owner controls schedule changes.

---

# 19. SERVICE JOB LIFECYCLE

A home visit and subsequent workshop/device repair are part of the **same service/job lifecycle**.

Do NOT automatically create an unrelated second customer service simply because the device is taken to the shop.

The knowledge model should investigate a lifecycle such as:

```text
Booking
  ↓
Home Visit
  ↓
Diagnosis
  ↓
Device Transfer (if required)
  ↓
Workshop Repair
  ↓
Completion
```

The exact final states should be modeled based on the business process and existing design.

---

# 20. TECHNICIAN MODEL

The current deployment may have only the owner's father.

However, the product is explicitly being designed so that the business can later become a larger electronics service company with multiple employees.

Therefore:

- technicians are a reusable domain concept
- bookings can be assigned to technicians
- the system should not hardcode "father" as the technician entity
- assignment should be system-driven
- multiple technicians must be possible

The current operating case can simply have one technician record.

---

# 21. TECHNICIAN ASSIGNMENT

The system should assign bookings to technicians.

The exact assignment algorithm must be designed for the future multi-technician service company.

At minimum consider:

- technician availability
- service capability
- service location
- schedule conflicts
- travel
- operational constraints

Do not hardcode a simplistic "first available technician" rule without documenting why.

The architecture should support future extension of the assignment algorithm.

---

# 22. TECHNICIAN FAILURE TO SERVE

If the system assigns a booking to a technician and that technician cannot fulfill it, the system should be capable of resolving the booking by offering another suitable path rather than leaving the customer indefinitely waiting.

The exact reassignment algorithm is to be designed.

Do not assume that the original technician is always the only possible resource.

---

# 23. TECHNICIAN APPLICATION

The technician design package is a first-class product artifact.

Inspect and document all supplied screens, including at least:

- Today's Jobs
- Job Details
- Schedule
- Set Availability
- Profile

The Android application is the intended technician product.

Do not treat the current Stitch package as disposable mockup material.

Document each screen's:

- purpose
- data
- actions
- state changes
- navigation
- business rules
- dependencies

---

# 24. CUSTOMER HISTORY

The system must retain customer history.

The history is not merely for support.

It should help the business maintain the relationship with the customer after service.

Document a customer relationship model capable of retaining relevant service history.

Examples may include:

- previous service visits
- appliance/device history
- problem history
- dates
- service outcomes
- technician interactions
- feedback
- follow-up information

Do NOT store arbitrary sensitive information merely because it could be stored.

Identify which data is genuinely useful.

---

# 25. CUSTOMER ENGAGEMENT AFTER SERVICE

Customer history should support future engagement.

The objective is to help the business remain memorable and encourage repeat business.

This may eventually support:

- service reminders
- follow-up
- customer re-engagement
- relevant recommendations
- service history visibility

Do not turn all possible future marketing features into MVP requirements.

Clearly separate currently required functionality from future capabilities.

---

# 26. REVIEWS

The website should support BOTH:

1. Google reviews
2. Website testimonials

Google reviews should support automatic retrieval.

Also document the possibility of maintaining synced review data locally.

The exact technical mechanism for Google integration must be investigated separately.

Do not invent a Google API design.

Website testimonials must remain genuine.

Do not:

- fabricate testimonials
- auto-generate reviews
- post reviews on behalf of customers
- impersonate customers
- manipulate public reviews

---

# 27. FEEDBACK

The customer feedback system should collect comprehensive service feedback.

Do not limit it to a single satisfaction yes/no question.

Investigate the fields represented by the design.

Feedback should be associated with the relevant service/job where appropriate.

Customers should be able to provide public-review feedback independently from private feedback.

The system must not suppress the public-review option solely because a customer gives negative feedback.

---

# 28. AI FEEDBACK ANALYSIS

AI is intended for **business-side escalation and understanding of customer feedback**.

Confirmed desired behavior:

Customer submits feedback.

AI analyzes it.

AI helps identify unhappy customers and escalates them to the owner/business for human follow-up.

The initial AI responsibility is therefore:

```text
Customer Feedback
       ↓
AI analysis
       ↓
Identify concerns / unhappy customer
       ↓
Business-owner attention
```

Do not automatically send a customer response unless explicitly requested later.

Do not allow AI to alter or falsify the customer's original feedback.

AI output should support human decision-making.

---

# 29. PUBLIC REVIEWS VS PRIVATE FEEDBACK

These are different concepts.

Document the distinction:

```text
Customer
   │
   ├── Private feedback → RepairReach
   │
   └── Public review → external review platform
```

The customer controls whether to leave a public review.

RepairReach can facilitate access but cannot author or submit the review on the customer's behalf.

---

# 30. AUTHENTICATION

The technician application requires authentication.

Customers should not be burdened with unnecessary accounts unless a future requirement explicitly introduces customer accounts.

The exact technician authentication mechanism must be designed around the confirmed technology stack.

Do not invent a role system larger than necessary.

The future system should support multiple authenticated technicians.

---

# 31. TECHNOLOGY STACK

Confirmed stack:

### Backend

- Spring Boot
- Java

### Database

- Supabase PostgreSQL

### Customer frontend

- React

### Technician application

- Android application
- Firebase is intended to support the mobile application

### Animation

- Three.js may be used on the web experience where appropriate

Do not force Three.js into areas where it adds no real value.

Do not introduce microservices merely because the product may grow later.

Begin with a modular architecture that can evolve.

---

# 32. FIREBASE BOUNDARY

Firebase is specifically intended for the mobile application.

Document possible responsibilities, but do NOT automatically assign Firebase every mobile capability.

Determine from the actual requirements whether it is needed for:

- authentication
- push notifications
- mobile-specific services
- other confirmed capabilities

The authoritative transactional business data remains in the backend/database architecture.

Do not create a second competing transactional database in Firebase unless explicitly required.

---

# 33. SUPABASE POSTGRESQL

Supabase PostgreSQL is the persistent relational data store.

Business entities and scheduling state must ultimately be represented consistently there.

Do not split transactional business state between random Firebase collections and PostgreSQL without a clear reason and documented ownership.

---

# 34. SYSTEM BOUNDARIES

Create explicit boundaries between:

## Customer web

Presentation + customer interaction.

## Technician Android app

Mobile operational interface.

## Spring Boot backend

Business rules and API boundary.

## Supabase PostgreSQL

Primary relational persistence.

## Firebase

Mobile-specific supporting services where actually required.

## External services

Examples:

- WhatsApp
- Google reviews
- Maps

Document each boundary and data flow.

---

# 35. DESIGN PRESERVATION

The supplied Stitch designs must be preserved.

The knowledge base must document:

- customer design language
- technician design language
- screen inventory
- interaction hierarchy
- responsive/mobile characteristics

Do NOT modify or "improve" the designs during this knowledge-generation stage.

Implementation can later translate the designs into working interfaces without changing their intended visual identity.

---

# 36. DOMAIN MODEL FIRST

Before producing a proposed SQL schema, derive the conceptual domain.

At minimum investigate:

```text
Business
Customer
Customer Address
Service Type
Technician
Booking
Schedule
Availability
Job
Feedback
Testimonial
Review
Notification
```

Do not assume every listed concept requires a separate database table.

Determine which concepts are true domain entities versus projections/value objects/configuration.

Explain the reasoning.

---

# 37. BOOKING STATE MACHINE

Produce a formal booking/job state machine.

For every state transition document:

```text
Current State
Action
Actor
Next State
Preconditions
Side Effects
Invalid Cases
```

This is especially important for:

- acceptance
- assignment
- cancellation
- arrival
- service start
- completion
- rescheduling
- workshop transfer
- schedule changes

The state machine must reflect the real business process, not a generic appointment system.

---

# 38. SCHEDULING ENGINE MODEL

Create a dedicated scheduling knowledge document.

It should define:

- availability
- working hours
- breaks
- booked time
- job duration
- service capabilities
- technician assignment
- travel
- rescheduling
- early completion
- delayed completion
- emergency insertion
- alternative-slot generation
- conflict resolution

Do not write implementation code yet.

First define the business semantics.

---

# 39. API CAPABILITIES

Do not begin by creating CRUD endpoints.

First identify business capabilities:

- business information
- service catalog
- customer booking
- availability
- slot calculation
- assignment
- technician job management
- schedule adjustment
- customer history
- feedback
- review/testimonial synchronization
- notifications
- authentication

Then map those capabilities to APIs.

---

# 40. NON-FUNCTIONAL REQUIREMENTS

Document:

- mobile usability
- responsiveness
- accessibility
- reliability
- transactional consistency
- schedule correctness
- validation
- authentication
- authorization
- privacy
- data minimization
- maintainability
- error handling
- offline considerations for the Android app if relevant
- observability

Do not introduce enterprise-grade infrastructure without evidence.

---

# 41. MVP VS FUTURE

Create an explicit boundary.

### Current product direction

The product should support:

- professional public website
- customer booking
- automatic/availability-aware scheduling
- technician Android workflow
- schedule adjustment
- technician assignment
- customer history
- feedback
- genuine reviews/testimonials
- business/technician expansion path

### Future possibilities

Potential future capabilities may include:

- larger technician workforce
- automated customer reminders
- advanced CRM
- parts management
- payments
- analytics
- service contracts/AMC
- richer customer engagement
- sophisticated AI assistance

Do not treat future possibilities as current requirements.

---

# 42. KNOWLEDGE BASE STRUCTURE

Create:

```text
docs/
└── knowledge/
    ├── README.md
    ├── 00-source-inventory.md
    ├── 01-product-overview.md
    ├── 02-business-context.md
    ├── 03-user-roles.md
    ├── 04-customer-journey.md
    ├── 05-technician-journey.md
    ├── 06-design-system.md
    ├── 07-domain-model.md
    ├── 08-booking-lifecycle.md
    ├── 09-scheduling-model.md
    ├── 10-technician-assignment.md
    ├── 11-customer-history.md
    ├── 12-feedback-and-reviews.md
    ├── 13-ai-feedback.md
    ├── 14-system-boundaries.md
    ├── 15-technology-architecture.md
    ├── 16-api-capabilities.md
    ├── 17-security-and-nonfunctional.md
    ├── 18-mvp-boundary.md
    ├── 19-open-decisions.md
    ├── 20-architecture-decisions.md
    └── 21-implementation-roadmap.md
```

The exact filenames may be changed if a better organization emerges, but the information must be covered.

---

# 43. FACT / DECISION / ASSUMPTION / FUTURE LABELING

Every document should clearly distinguish:

**FACT**
Confirmed by source material or explicitly confirmed requirement.

**DECISION**
Intentionally chosen behavior.

**ASSUMPTION**
Not confirmed; temporarily required for progress.

**FUTURE**
Not part of current implementation scope.

Minimize assumptions.

Whenever possible, leave uncertain details in the open-decisions document instead.

---

# 44. OPEN DECISIONS

Create a concise list of genuinely unresolved questions.

Examples include:

- exact working hours for each day
- exact slot duration model
- exact travel-time calculation
- exact booking status terminology
- exact technician assignment scoring
- exact Google review synchronization mechanism
- exact Firebase responsibilities
- exact AI provider/model
- exact notification mechanisms
- exact service-level configuration fields

Do not ask questions that have already been answered in this document.

---

# 45. ARCHITECTURAL DECISIONS

Create ADRs for meaningful architectural choices.

Examples:

```text
ADR-001 Spring Boot as business API
ADR-002 Supabase PostgreSQL as transactional data store
ADR-003 Firebase limited to mobile-support responsibilities
ADR-004 Separate customer and technician applications
ADR-005 Backend-authoritative scheduling
ADR-006 Configurable service durations and capabilities
ADR-007 Customer history as a first-class business concept
ADR-008 External review platforms remain external
```

Only create ADRs for actual decisions, not hypothetical possibilities.

---

# 46. IMPLEMENTATION ROADMAP

After all knowledge is synthesized, produce a dependency-aware implementation roadmap.

The roadmap should be based on the domain model, not the order in which the Stitch screens happen to appear.

For each phase specify:

- objective
- prerequisites
- implementation artifacts
- acceptance criteria
- risks

Do not implement anything yet.

---

# 47. CONSISTENCY AUDIT

After creating the knowledge base, perform a cross-document audit.

Specifically check:

- Booking states
- scheduling semantics
- availability
- technician assignment
- customer cancellation
- schedule changes
- workshop transfer
- customer history
- reviews
- AI feedback
- authentication
- Firebase responsibilities
- database ownership
- external service boundaries
- MVP scope

Resolve contradictions.

If a contradiction cannot be resolved from the confirmed requirements, record it in `19-open-decisions.md`.

---

# 48. FINAL TASK

At the end of this phase:

DO NOT write application code.

DO NOT modify the Stitch designs.

DO NOT install unnecessary dependencies.

DO NOT create fake implementation data and present it as business truth.

Instead produce the complete knowledge base and then summarize:

1. What the current product actually is
2. What the two design packages contain
3. The customer journey
4. The technician journey
5. The domain model
6. The booking lifecycle
7. The scheduling model
8. The technician assignment model
9. The customer history model
10. The feedback/review architecture
11. The AI feedback role
12. The system boundaries
13. The technology architecture
14. The MVP boundary
15. The unresolved decisions
16. The implementation roadmap

The resulting knowledge base will become the **source of truth for all future Claude Code implementation sessions**.

Core principle:

**Inspect → extract → reconcile → model → document → only then implement.**