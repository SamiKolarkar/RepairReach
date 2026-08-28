package com.repairreach.backend.shared.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface DomainEvent {
    UUID eventId();
    String eventType();
    String aggregateType();
    UUID aggregateId();
    OffsetDateTime occurredAt();
}
