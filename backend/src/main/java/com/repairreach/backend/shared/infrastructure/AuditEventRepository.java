package com.repairreach.backend.shared.infrastructure;

import com.repairreach.backend.shared.domain.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {
    List<AuditEvent> findByAggregateTypeAndAggregateIdOrderByCreatedAtDesc(String aggregateType, UUID aggregateId);
}
