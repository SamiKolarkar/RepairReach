package com.repairreach.backend.technician.infrastructure;

import com.repairreach.backend.technician.domain.TechnicianCapability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TechnicianCapabilityRepository extends JpaRepository<TechnicianCapability, UUID> {
    List<TechnicianCapability> findByTechnicianIdAndIsActiveTrue(UUID technicianId);
    List<TechnicianCapability> findByCapabilityKeyAndIsActiveTrue(String capabilityKey);
}
