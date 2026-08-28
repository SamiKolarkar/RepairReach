package com.repairreach.backend.feedback.infrastructure;

import com.repairreach.backend.feedback.domain.Escalation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EscalationRepository extends JpaRepository<Escalation, UUID> {
    Optional<Escalation> findByFeedbackId(UUID feedbackId);
}
