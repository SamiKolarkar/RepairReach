package com.repairreach.backend.booking.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CancelBookingResponseDto(
    String publicReference,
    String status,
    String cancellationOutcome,
    String outcome,
    Boolean visitingChargeApplicable,
    BigDecimal chargeAmount,
    OffsetDateTime cancelledAt,
    String message
) {}
