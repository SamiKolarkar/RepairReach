package com.repairreach.backend.business.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record DayOperatingHoursDto(
    String dayOfWeek,
    String openTime,
    String closeTime,
    Boolean isClosed,
    Boolean hasAfternoonBreak,
    String breakStartTime,
    String breakEndTime
) {}
