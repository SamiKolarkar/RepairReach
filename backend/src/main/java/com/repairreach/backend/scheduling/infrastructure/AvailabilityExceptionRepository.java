package com.repairreach.backend.scheduling.infrastructure;

import com.repairreach.backend.scheduling.domain.AvailabilityException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface AvailabilityExceptionRepository extends JpaRepository<AvailabilityException, UUID> {
    List<AvailabilityException> findByBusinessIdAndExceptionDate(UUID businessId, LocalDate exceptionDate);
    List<AvailabilityException> findByTechnicianIdAndExceptionDate(UUID technicianId, LocalDate exceptionDate);
}
