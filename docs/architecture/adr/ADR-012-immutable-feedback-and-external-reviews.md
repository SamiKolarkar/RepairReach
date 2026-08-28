# ADR-012: Separate immutable feedback, AI analysis, testimonials, and external reviews

- Status: Accepted
- Date: 2026-08-16

## Context

Private feedback supports business learning and escalation; Google reviews are external; website testimonials are curated genuine content. They have different ownership and trust boundaries.

## Decision

Persist original private feedback immutably, store AI analysis separately, model owner escalation separately, synchronize Google reviews read-only, and curate testimonials locally with provenance/publication state. RepairReach never authors or submits external reviews.

## Consequences

Negative feedback cannot be suppressed or rewritten, and external provider changes do not corrupt customer feedback. A later owner workflow can act on escalation without granting AI customer-contact authority.
