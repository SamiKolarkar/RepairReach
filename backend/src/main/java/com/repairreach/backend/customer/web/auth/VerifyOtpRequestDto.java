package com.repairreach.backend.customer.web.auth;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record VerifyOtpRequestDto(
    @JsonAlias({"phoneNumber", "phone", "customerPhone"})
    String phoneNumber,

    String otp,

    @JsonAlias({"fullName", "customerName", "name"})
    String fullName
) {}
