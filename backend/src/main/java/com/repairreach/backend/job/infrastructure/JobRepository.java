package com.repairreach.backend.job.infrastructure;

import com.repairreach.backend.job.domain.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, UUID> {
    Optional<Job> findByBookingId(UUID bookingId);
    Optional<Job> findByJobReference(String jobReference);
    Optional<Job> findByFeedbackCapabilityToken(String feedbackCapabilityToken);
}
