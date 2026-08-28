package com.repairreach.backend.booking.infrastructure;

import com.repairreach.backend.booking.domain.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {
    Optional<Booking> findByPublicReference(String publicReference);
    Optional<Booking> findByBusinessIdAndPublicReference(UUID businessId, String publicReference);
}
