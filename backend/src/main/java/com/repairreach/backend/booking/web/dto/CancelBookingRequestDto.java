package com.repairreach.backend.booking.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CancelBookingRequestDto(
    String cancellationReason,
    String capabilityToken
) {}
