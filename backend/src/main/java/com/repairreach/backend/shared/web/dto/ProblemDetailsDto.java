package com.repairreach.backend.shared.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProblemDetailsDto(
    URI type,
    String title,
    int status,
    String code,
    String detail,
    String instance,
    String correlationId,
    OffsetDateTime timestamp,
    List<InvalidParamDto> invalidParams,
    List<AlternativeSlotDto> alternatives
) {
    public ProblemDetailsDto(
        URI type,
        String title,
        int status,
        String code,
        String detail,
        String instance,
        String correlationId,
        OffsetDateTime timestamp
    ) {
        this(type, title, status, code, detail, instance, correlationId, timestamp, null, null);
    }
}
