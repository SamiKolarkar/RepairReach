package com.repairreach.backend.business.infrastructure;

import com.repairreach.backend.business.domain.Business;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BusinessRepository extends JpaRepository<Business, UUID> {
    Optional<Business> findByCode(String code);
    Optional<Business> findFirstByIsActiveTrue();
}
