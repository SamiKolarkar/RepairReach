package com.repairreach.backend.business.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record BusinessProfileDto(
    UUID id,
    String code,
    String name,
    String businessName,
    String tagline,
    String description,
    String city,
    String state,
    String phone,
    String whatsapp,
    String whatsappNumber,
    String email,
    String address,
    String timezone,
    Boolean active,
    VisitingChargeDto visitingCharge,
    WorkingHoursDto workingHours,
    List<DayOperatingHoursDto> operatingHours,
    List<String> trustPillars,
    String googleReviewUrl
) {}
