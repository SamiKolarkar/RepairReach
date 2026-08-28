package com.repairreach.backend.booking.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record BookingTrackingResponseDto(
    String publicReference,
    UUID bookingId,
    String status,
    String bookingState,
    String jobStatus,
    String customerName,
    String customerPhone,
    String serviceName,
    String locationAddress,
    String serviceLocation,
    String problemDescription,
    String scheduledDate,
    String scheduledStartTime,
    String scheduledEndTime,
    String scheduledTimeRange,
    TechnicianSummaryDto technician,
    String technicianName,
    String technicianPhone,
    TimelineSummaryDto timeline,
    Boolean canCancel,
    Boolean canCancelWithoutCharge,
    BigDecimal visitingChargeAmount,
    String feedbackCapabilityToken,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public record TechnicianSummaryDto(
        Boolean assigned,
        String technicianName,
        String technicianPhone
    ) {}

    public record TimelineSummaryDto(
        OffsetDateTime bookedAt,
        OffsetDateTime scheduledAt,
        OffsetDateTime enRouteAt,
        OffsetDateTime arrivedAt,
        OffsetDateTime completedAt
    ) {}
}
