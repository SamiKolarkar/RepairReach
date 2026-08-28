package com.repairreach.backend.technician.infrastructure;

import com.repairreach.backend.technician.domain.ApplicationUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationUserRepository extends JpaRepository<ApplicationUser, UUID> {
    Optional<ApplicationUser> findByPhone(String phone);
    Optional<ApplicationUser> findByEmail(String email);
}
