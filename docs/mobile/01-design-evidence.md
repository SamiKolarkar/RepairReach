# Technician Android Design Evidence

## Supplied design package

The authoritative supplied package is [`stitch_repairreach_technician_mobile_app`](../../stitch_repairreach_technician_mobile_app). Its visual-system specification is [`field_professional/DESIGN.md`](../../stitch_repairreach_technician_mobile_app/field_professional/DESIGN.md). It contains five screen folders:

| Screen | Evidence | Handoff interpretation |
|---|---|---|
| Today’s Jobs | [`today_s_jobs/code.html`](../../stitch_repairreach_technician_mobile_app/today_s_jobs/code.html), `screen.png` | Automatically accepted assigned work for the current day; operational status and job access |
| Job Details | [`job_details/code.html`](../../stitch_repairreach_technician_mobile_app/job_details/code.html), `screen.png` | One job’s customer/service context and primary field action |
| Schedule | [`schedule/code.html`](../../stitch_repairreach_technician_mobile_app/schedule/code.html), `screen.png` | Technician schedule view and schedule operations |
| Availability | [`set_availability/code.html`](../../stitch_repairreach_technician_mobile_app/set_availability/code.html), `screen.png` | Read-only system-managed working-time, breaks, and assignment capacity |
| Profile | [`profile/code.html`](../../stitch_repairreach_technician_mobile_app/profile/code.html), `screen.png` | Technician identity, session, and profile surface |

## Visual rules to preserve

`DESIGN.md` specifies Inter typography, a deep blue primary palette, light tonal surfaces, green/amber/red status signaling, rounded cards, ambient shadows, 16px edge margins, 4px/8px spacing rhythm, and 48px minimum touch targets. It describes a field-first, low-cognitive-load Android surface with persistent bottom navigation and sticky job actions.

The supplied HTML is visual reference only. It must not be embedded as a web implementation or treated as a source of business truth. Android components should reproduce the visual hierarchy and interaction affordances while using native accessibility, lifecycle, and back-stack behavior.

## Interpretation rules

- Names, addresses, ratings, job counts, dates, service names, photos, prices, map imagery, equipment, and parts in the designs are fixtures, not seed data or catalog requirements.
- The actual bottom navigation in all five screens is **Home, Schedule, Availability, Profile**. The prose mention of Messages and Parts is inconsistent with those screens and does not authorize either capability.
- The floating `+` buttons do not authorize technicians to create bookings. Their purpose is open and they must be omitted or disabled until a backend-authorized command exists.
- Phone and directions controls may hand off to permitted device applications; directions opens Google Maps for live navigation. WhatsApp/chat is not an Android capability. These handoffs do not create a system record or replace backend lifecycle commands.
- `Accept` is not an Android action: assignments are automatically accepted when the system assigns a technician. `Reject` becomes an exceptional **Report unable to serve** action with a mandatory reason; the server decides reassignment or the nearest feasible alternative. `Mark Completed` is available only when the backend permits the terminal transition.

## Required additions without redesigning the supplied screens

The supplied screens do not explicitly depict every confirmed lifecycle/scheduling case. Later implementation should add state-aware action labels, confirmation sheets, progress/timeline presentation, reflow preview, stale/offline indication, and error states using the same cards, bottom action area, and visual tokens. These are necessary operational states, not a permission to redesign the visual language.

## Evidence limits

The package does not establish API schemas, Android navigation technology, exact state transitions, offline guarantees, permissions, or the final meaning of every visual affordance. Those are specified in the behavior and architecture handoff documents and must remain aligned with the backend contracts.
