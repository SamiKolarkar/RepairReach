# ADR-009: Keep AI feedback analysis provider-neutral

- Status: Accepted
- Date: 2026-08-16

## Context

AI feedback analysis is required, but no provider or model is finalized. The original feedback must be preserved and business follow-up must remain human-controlled.

## Decision

Feedback submits immutable source data to an asynchronous-capable `FeedbackAnalyzer` interface. An adapter returns a schema-validated versioned analysis. Failures are retryable work and never block feedback persistence or generate automatic customer responses.

## Consequences

Provider/model selection can happen later without coupling the feedback module. Data-processing, retention, cost, and privacy review are required before enabling a real provider.
