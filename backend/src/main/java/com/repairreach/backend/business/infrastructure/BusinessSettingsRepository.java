package com.repairreach.backend.business.infrastructure;

import com.repairreach.backend.business.domain.BusinessSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BusinessSettingsRepository extends JpaRepository<BusinessSettings, UUID> {
    Optional<BusinessSettings> findByBusinessId(UUID businessId);
}
