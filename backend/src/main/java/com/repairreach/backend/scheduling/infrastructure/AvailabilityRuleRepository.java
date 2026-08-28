package com.repairreach.backend.scheduling.infrastructure;

import com.repairreach.backend.scheduling.domain.AvailabilityRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AvailabilityRuleRepository extends JpaRepository<AvailabilityRule, UUID> {
    List<AvailabilityRule> findByBusinessIdAndIsActiveTrue(UUID businessId);
    List<AvailabilityRule> findByBusinessIdAndDayOfWeekAndIsActiveTrue(UUID businessId, Integer dayOfWeek);
    List<AvailabilityRule> findByTechnicianIdAndDayOfWeekAndIsActiveTrue(UUID technicianId, Integer dayOfWeek);
}
