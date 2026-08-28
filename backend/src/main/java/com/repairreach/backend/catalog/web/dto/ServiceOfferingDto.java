package com.repairreach.backend.catalog.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ServiceOfferingDto(
    UUID id,
    String code,
    String name,
    String description,
    String category,
    Integer baseDurationMinutes,
    Integer approxDurationMinutes,
    Boolean supportsHomeService,
    Boolean homeServiceSupported,
    Boolean supportsWorkshopRepair,
    Boolean workshopSupported,
    Boolean supportsDeviceTransfer,
    Boolean deviceTransferSupported,
    BigDecimal baseVisitingCharge,
    Integer displayOrder,
    List<String> capabilities
) {}
