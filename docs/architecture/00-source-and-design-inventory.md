# Source and Design Inventory

> Classification: FACT and DESIGN INPUT. Architectural interpretations are labeled as decisions or open decisions elsewhere.

## Authoritative source

The source file is `RepairReach — Product & Engineering Knowledge Generation.md` at the repository root. It establishes the business context, current/future boundary, two client surfaces, confirmed technology stack, and explicit exclusions. This architecture does not replace it.

## Supplied packages inspected

| Package | Contents inspected | Architectural relevance |
|---|---|---|
| `stitch_repairreach_booking_web_platform.zip` | `repairreach/DESIGN.md`; `booking_page/code.html` and screenshot; `confirmation_page/code.html` and screenshot; `feedback_page/code.html` and screenshot | Customer web interaction boundary and design language |
| `stitch_repairreach_technician_mobile_app.zip` | `field_professional/DESIGN.md`; `today_s_jobs`, `job_details`, `schedule`, `set_availability`, and `profile` HTML/screenshots | Technician Android operational surface and design language |

The ZIP files are preserved as supplied. No Stitch artifact is modified by this architecture work.

## Customer surface inventory

### Booking page

The inspected page visibly contains:

- full name;
- phone number;
- service type selection;
- service location/address;
- problem description;
- selectable available time slots with a booked/disabled example;
- confirm booking action;
- terms/privacy acknowledgement text;
- contact and public navigation affordances.

The architecture maps this to an anonymous public booking command plus a backend availability query. The displayed slot list is a projection returned by the backend, never a client-owned availability calculation.

The HTML includes a `Mobile Repair` example option. **Fact:** mobile phones are explicitly excluded by the product knowledge. This is treated as Stitch demo content, not an allowed service. The implementation must load the configurable service catalog and must not expose excluded services.

### Confirmation page

The page presents a confirmed state and a summary of customer, service, date/time, and location, plus return-home and contact actions. The confirmation must be rendered from the backend result, including the committed schedule revision/reference; a client-side success screen must never imply a transaction that the API rejected.

### Feedback page

The page presents a one-to-five star rating, optional free-text feedback, submit, skip, back, and account visual affordances. The customer knowledge says customers should not be burdened with accounts, so the account icon is not an authorization requirement. Feedback association should use a booking/job-scoped, unguessable public token or equivalent backend-issued capability.

## Technician surface inventory

### Today's Jobs

Shows the day, assigned jobs, customer, time range, service, address, status, completion action, phone/WhatsApp affordances, and accept/reject actions for a pending card. The backend must decide whether an action is legal. A reject action means the technician cannot fulfill the assignment and starts a reassignment/exception workflow; it is not a client-side deletion.

### Job Details

Shows job status/time, customer contact actions, address/map area, estimated travel, directions, reported problem, tags, equipment, potential parts, and accept/reject/complete actions. The displayed equipment and parts are not confirmed current requirements; they are fields the domain can accommodate only when supported by service workflow data.

### Service Schedule

Shows today, tomorrow, upcoming work, statuses, date/time, location, service labels, navigation, and an add affordance. The add affordance is not treated as permission for an arbitrary technician to create bookings; its final command semantics are open.

### Manage Availability

Shows date selection, full-day blocking, availability slots, breaks/unavailable slots, weekly capacity, and the four technician navigation areas. It maps to recurring availability rules and date-specific exceptions. Exact business hours and slot sizes remain open where the source does not confirm them.

### Profile

Shows profile/contact information, availability summary, scheduled-job count, weekly hours, online status, notification/security/support settings, logout, and navigation. Names, photos, ratings, dates, and counts in the screenshot are placeholders, not seed data or business facts.

## Design language constraints

Customer web uses Manrope, a light off-white/cool surface palette, deep teal primary accents, rounded cards, 8px rhythm, generous whitespace, and responsive single-column-to-wide-grid behavior. Technician mobile uses Inter, deep blue primary accents, high-contrast status colors, rounded cards, 4px/8px spacing, 48px touch targets, and a persistent bottom navigation.

These are preservation constraints for later client implementation, not domain decisions.

## Design versus requirement cautions

- Dates, people, addresses, prices/ratings, and service examples in HTML/screenshots are illustrative.
- The customer package contains only booking, confirmation, and feedback pages; it does not constitute a complete public website inventory.
- `Messages` and `Parts` are mentioned in the technician design prose, while the supplied screens expose Home, Schedule, Availability, and Profile. They are not current requirements without confirmation.
- The design's visual `AC Repair`, `Plumbing Repair`, and `Mobile Repair` examples do not define the service catalog. RepairReach handles configurable electronics/appliance services and explicitly excludes mobile phones.
