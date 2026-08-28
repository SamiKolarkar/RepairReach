package com.repairreach.backend.scheduling.web.dto;

import java.util.List;
import java.util.UUID;

public record AvailabilitySlotsResponseDto(
    String date,
    UUID serviceId,
    List<TimeSlotDto> slots
) {}
