package com.repairreach.backend.customer.infrastructure;

import com.repairreach.backend.customer.domain.CustomerDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CustomerDeviceRepository extends JpaRepository<CustomerDevice, UUID> {
    List<CustomerDevice> findByCustomerId(UUID customerId);
}
