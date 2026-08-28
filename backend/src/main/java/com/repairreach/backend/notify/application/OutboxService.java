package com.repairreach.backend.notify.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.repairreach.backend.notify.domain.OutboxEvent;
import com.repairreach.backend.notify.domain.OutboxStatus;
import com.repairreach.backend.notify.infrastructure.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class OutboxService {

    private static final Logger log = LoggerFactory.getLogger(OutboxService.class);
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public OutboxService(OutboxEventRepository outboxEventRepository, ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public OutboxEvent publishEvent(
        String aggregateType,
        UUID aggregateId,
        String eventType,
        Object payload,
        String idempotencyKey
    ) {
        OutboxEvent event = new OutboxEvent();
        event.setAggregateType(aggregateType);
        event.setAggregateId(aggregateId);
        event.setEventType(eventType);
        event.setStatus(OutboxStatus.PENDING);
        event.setRetryCount(0);
        event.setMaxRetries(5);
        event.setNextAttemptAt(OffsetDateTime.now());
        event.setIdempotencyKey(idempotencyKey);

        try {
            String jsonPayload = (payload instanceof String s) ? s : objectMapper.writeValueAsString(payload);
            event.setPayload(jsonPayload);
        } catch (Exception e) {
            log.error("Failed to serialize outbox payload for aggregate {}: {}", aggregateId, e.getMessage());
            event.setPayload("{}");
        }

        return outboxEventRepository.save(event);
    }
}
