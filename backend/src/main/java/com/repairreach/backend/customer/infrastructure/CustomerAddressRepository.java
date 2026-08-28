package com.repairreach.backend.customer.infrastructure;

import com.repairreach.backend.customer.domain.CustomerAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, UUID> {
    List<CustomerAddress> findByCustomerId(UUID customerId);
    Optional<CustomerAddress> findFirstByCustomerIdAndIsDefaultTrue(UUID customerId);
}
