package com.repairreach.backend.assignment.infrastructure;

import com.repairreach.backend.assignment.domain.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
    Optional<Assignment> findByJobIdAndIsCurrentTrue(UUID jobId);
}
