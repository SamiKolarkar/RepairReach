package com.repairreach.backend.scheduling.infrastructure;

import com.repairreach.backend.scheduling.domain.ScheduleEntry;
import com.repairreach.backend.scheduling.domain.ScheduleEntryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScheduleEntryRepository extends JpaRepository<ScheduleEntry, UUID> {

    List<ScheduleEntry> findByTechnicianIdAndStatus(UUID technicianId, ScheduleEntryStatus status);

    @Query("SELECT s FROM ScheduleEntry s WHERE s.technicianId = :technicianId AND s.status = :status AND s.startTime >= :startOfDay AND s.startTime < :endOfDay")
    List<ScheduleEntry> findByTechnicianAndDateRange(
        @Param("technicianId") UUID technicianId,
        @Param("status") ScheduleEntryStatus status,
        @Param("startOfDay") OffsetDateTime startOfDay,
        @Param("endOfDay") OffsetDateTime endOfDay
    );

    @Query("SELECT s FROM ScheduleEntry s WHERE s.businessId = :businessId AND s.status = :status AND s.startTime >= :startOfDay AND s.startTime < :endOfDay")
    List<ScheduleEntry> findByBusinessAndDateRange(
        @Param("businessId") UUID businessId,
        @Param("status") ScheduleEntryStatus status,
        @Param("startOfDay") OffsetDateTime startOfDay,
        @Param("endOfDay") OffsetDateTime endOfDay
    );

    Optional<ScheduleEntry> findByBookingId(UUID bookingId);
    Optional<ScheduleEntry> findByJobId(UUID jobId);
}
