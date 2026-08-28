# Open Architectural Decisions

> Classification: OPEN DECISIONS. Entries must be closed explicitly before dependent implementation behavior is treated as final.

These are unresolved because the authoritative product knowledge intentionally leaves them open or the design package cannot establish a business rule. They must be closed before the dependent implementation phase.

| ID | Decision needed | Why architecture depends on it | Current options | Recommended status |
|---|---|---|---|---|
| OD-001 | Exact recurring hours by weekday and date-specific Sunday rules | Availability and slot results depend on effective intervals | Configure in business settings; hardcode initial hours; owner-managed settings | Configure as data; confirm values before launch |
| OD-002 | Fixed slot granularity and whether service duration can span multiple slots | Determines slot generation, reservation range, and UI options | Fixed grid; duration-driven intervals; hybrid grid plus duration | Hybrid capability, with exact grid confirmed |
| OD-003 | Travel model and buffer source | Determines whether adjacent home jobs are feasible | Fixed configured buffer; Maps estimate; manual operator buffer | Start with explicit configurable buffer; add provider later |
| OD-004 | Exact emergency insertion/reflow authority | Emergency work must not silently displace confirmed customers | Feasible-gap only; owner-authorized reflow; reserved emergency capacity | Owner-authorized reflow with audit; confirm workflow |
| OD-005 | Final booking status labels shown to customers/technicians | API/state machine is stable but labels affect UX and support | Use states in [05](05-booking-architecture.md); separate display labels | Keep internal states; finalize display copy |
| OD-006 | Customer public capability mechanism | Needed for cancellation, confirmation lookup, and feedback without accounts | Signed short-lived token; one-time opaque link; SMS/WhatsApp verification | Opaque scoped capability with expiry; confirm channel |
| OD-007 | Exact technician reject/reassignment workflow | Determines whether the app can resolve failure immediately or queue owner work | Automatic next candidate; owner approval; customer contact first | Automatic candidate search plus owner resolution fallback |
| OD-008 | Firebase services enabled at MVP | Firebase is a mobile boundary but exact services are not fully fixed | Firebase Auth only; Auth + FCM; other Firebase services | Auth for technician identity; FCM when push is approved |
| OD-009 | Notification channels and automation level | Schedule changes require communication but channels are not confirmed | Direct phone/WhatsApp; outbound WhatsApp; SMS/email/push | Adapter/outbox now; select channels separately |
| OD-010 | Google review synchronization mechanism and display policy | Provider API, quotas, consent, and curation affect review data | Manual import; approved Google API sync; link only | Read-only adapter; verify provider/API path |
| OD-011 | AI provider/model and data-processing policy | Provider, retention, cost, and regional privacy affect analysis adapter | Hosted provider; self-hosted model; manual analysis | Provider-neutral interface; select provider after data review |
| OD-012 | Exact service configuration fields and capability taxonomy | Catalog and scheduler need stable validation fields | Relational fields; relational core + constrained JSON extension | Relational core for scheduling-critical fields; confirm taxonomy |
| OD-013 | Owner/admin account and permission rollout | Broader schedule/reassignment actions need an authorized actor | Single technician-owner account initially; separate owner role now | Keep permission boundary; defer separate UI/role until needed |
| OD-014 | Customer cancellation time proof beyond backend arrival timestamp | Backend arrival is the charge boundary, but disputes may require evidence | Timestamp only; technician confirmation; location/context evidence | Timestamp + actor/audit; decide whether extra evidence is needed |
| OD-015 | Workshop schedule detail | Job supports transfer/workshop lifecycle, but workshop capacity rules are not confirmed | Track status only; create workshop schedule entries; separate queue | Track lifecycle first; add schedule activity when workshop policy exists |

An implementation session must not resolve these by copying fixture text or common industry defaults without recording the choice.
