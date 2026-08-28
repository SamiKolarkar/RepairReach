package com.repairreach.backend.customer.infrastructure;

import com.repairreach.backend.customer.domain.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByBusinessIdAndNormalizedPhone(UUID businessId, String normalizedPhone);
}
