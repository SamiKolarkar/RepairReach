package com.repairreach.backend.job.infrastructure;

import com.repairreach.backend.job.domain.JobEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JobEventRepository extends JpaRepository<JobEvent, UUID> {
    List<JobEvent> findByJobIdOrderByCreatedAtAsc(UUID jobId);
}
