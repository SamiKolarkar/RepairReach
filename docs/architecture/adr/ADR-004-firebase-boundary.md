# ADR-004: Limit Firebase to mobile-support responsibilities

- Status: Accepted with service selection recorded as open
- Date: 2026-08-16

## Context

Firebase is intended for the Android boundary and technician authentication is required. Firebase must not become a competing transactional datastore.

## Decision

Use Firebase Authentication as the recommended technician identity provider and isolate it behind backend verification plus application identity mapping. Use Firebase Cloud Messaging only when push notifications are approved. Do not use Firestore or Realtime Database for authoritative RepairReach transactions.

## Consequences

The Android app can use mobile-native identity/push capabilities while the domain remains provider-neutral. Exact Firebase project configuration and FCM rollout remain open until implementation planning closes OD-008/009.
