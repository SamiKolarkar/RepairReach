package com.repairreach.backend.scheduling.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TimeSlotDto(
    String slotId,
    String startTime,
    String endTime,
    String label,
    Boolean available,
    String reason
) {}
