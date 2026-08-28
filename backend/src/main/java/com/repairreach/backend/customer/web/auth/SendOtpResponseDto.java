package com.repairreach.backend.customer.web.auth;

public record SendOtpResponseDto(
    String status,
    String message,
    int expiresInSeconds
) {}
