package com.repairreach.backend.booking.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record BookingConfirmationResponseDto(
    String publicReference,
    UUID bookingId,
    String status,
    String customerName,
    String customerPhone,
    UUID serviceId,
    String serviceName,
    String locationAddress,
    String serviceLocation,
    String problemDescription,
    String scheduledDate,
    String scheduledStartTime,
    String scheduledEndTime,
    ScheduledSlotInfoDto scheduledSlot,
    CustomerInfoDto customer,
    ServiceInfoDto service,
    String capabilityToken,
    String feedbackCapabilityToken,
    String jobStatus,
    BigDecimal estimatedCharge,
    OffsetDateTime createdAt
) {
    public record ScheduledSlotInfoDto(
        String date,
        String startTime,
        String endTime,
        String formatted
    ) {}

    public record CustomerInfoDto(
        String fullName,
        String phoneNumber
    ) {}

    public record ServiceInfoDto(
        UUID serviceId,
        String serviceName
    ) {}
}
