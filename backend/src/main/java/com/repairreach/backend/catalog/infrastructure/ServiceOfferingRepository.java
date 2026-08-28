package com.repairreach.backend.catalog.infrastructure;

import com.repairreach.backend.catalog.domain.ServiceOffering;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, UUID> {
    List<ServiceOffering> findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(UUID businessId);
    Optional<ServiceOffering> findByIdAndBusinessId(UUID id, UUID businessId);
    Optional<ServiceOffering> findByCodeAndBusinessId(String code, UUID businessId);
}
