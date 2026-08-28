package com.repairreach.backend.notify.infrastructure;

import com.repairreach.backend.notify.domain.OutboxEvent;
import com.repairreach.backend.notify.domain.OutboxStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {
    List<OutboxEvent> findByStatusInAndNextAttemptAtLessThanEqual(List<OutboxStatus> statuses, OffsetDateTime now);
}
