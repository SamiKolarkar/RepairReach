package com.repairreach.backend.business.infrastructure;

import com.repairreach.backend.business.domain.BusinessLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BusinessLocationRepository extends JpaRepository<BusinessLocation, UUID> {
    List<BusinessLocation> findByBusinessId(UUID businessId);
    Optional<BusinessLocation> findByBusinessIdAndIsPrimaryTrue(UUID businessId);
}
