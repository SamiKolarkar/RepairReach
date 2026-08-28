package com.repairreach.backend.technician.infrastructure;

import com.repairreach.backend.technician.domain.Technician;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TechnicianRepository extends JpaRepository<Technician, UUID> {
    List<Technician> findByBusinessIdAndIsActiveTrue(UUID businessId);
    Optional<Technician> findByUserId(UUID userId);
}
