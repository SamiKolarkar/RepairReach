package com.repairreach.backend.shared.web.dto;

public record InvalidParamDto(
    String name,
    String reason,
    Object value
) {
    public InvalidParamDto(String name, String reason) {
        this(name, reason, null);
    }
}
