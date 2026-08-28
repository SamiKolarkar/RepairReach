package com.repairreach.backend.feedback.infrastructure;

import com.repairreach.backend.feedback.domain.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {
    Optional<Feedback> findByJobId(UUID jobId);
    Optional<Feedback> findByBookingId(UUID bookingId);
}
