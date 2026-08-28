package com.repairreach.backend.business.web.dto;

import java.math.BigDecimal;

public record VisitingChargeDto(
    BigDecimal amount,
    String currency,
    String formatted
) {}
