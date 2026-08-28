package com.repairreach.backend.feedback.infrastructure;

import com.repairreach.backend.feedback.domain.FeedbackAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeedbackAnalysisRepository extends JpaRepository<FeedbackAnalysis, UUID> {
    Optional<FeedbackAnalysis> findByFeedbackId(UUID feedbackId);
}
