# ADR-008: Isolate external providers behind adapters

- Status: Accepted
- Date: 2026-08-16

## Context

RepairReach may use WhatsApp, Maps, Google Reviews, Firebase, and an AI provider. Provider APIs, credentials, failures, and data models change independently of the business domain.

## Decision

Define internal ports for identity verification, push, travel, contact/messaging, review source, and feedback analysis. Provider SDKs and HTTP protocols remain in adapters. Durable outbox work handles post-commit outbound operations.

## Consequences

Provider replacement and failure handling are localized. The product still needs explicit decisions for exact channels and providers before implementation.
