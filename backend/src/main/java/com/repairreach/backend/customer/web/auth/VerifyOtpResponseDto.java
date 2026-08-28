package com.repairreach.backend.customer.web.auth;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record VerifyOtpResponseDto(
    String token,
    CustomerSummaryDto customer,
    String message
) {
    public record CustomerSummaryDto(
        UUID id,
        String fullName,
        String phoneNumber
    ) {}
}
