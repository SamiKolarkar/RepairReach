package com.repairreach.backend.technician.infrastructure;

import com.repairreach.backend.technician.domain.ExternalIdentity;
import com.repairreach.backend.technician.domain.IdentityProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExternalIdentityRepository extends JpaRepository<ExternalIdentity, UUID> {
    Optional<ExternalIdentity> findByProviderAndProviderSubject(IdentityProvider provider, String providerSubject);
}
