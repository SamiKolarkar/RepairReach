package com.repairreach.backend.notify.infrastructure;

import com.repairreach.backend.notify.domain.NotificationAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationAttemptRepository extends JpaRepository<NotificationAttempt, UUID> {
    List<NotificationAttempt> findByOutboxEventId(UUID outboxEventId);
}
