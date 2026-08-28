package com.repairreach.backend.catalog.infrastructure;

import com.repairreach.backend.catalog.domain.ServiceRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ServiceRequirementRepository extends JpaRepository<ServiceRequirement, UUID> {
    List<ServiceRequirement> findByServiceOfferingId(UUID serviceOfferingId);
}
