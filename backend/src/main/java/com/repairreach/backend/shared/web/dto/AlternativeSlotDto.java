package com.repairreach.backend.shared.web.dto;

public record AlternativeSlotDto(
    String slotId,
    String startTime,
    String endTime,
    String label
) {}
