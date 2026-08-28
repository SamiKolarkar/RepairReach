package com.repairreach.backend.shared.exception;

import com.repairreach.backend.shared.web.dto.InvalidParamDto;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.util.Collections;
import java.util.List;

public class ValidationException extends ProblemDetailException {

    private final List<InvalidParamDto> invalidParams;

    public ValidationException(String message, List<InvalidParamDto> invalidParams) {
        super(
            HttpStatus.BAD_REQUEST,
            "VALIDATION_FAILED",
            URI.create("https://api.repairreach.shop/problems/validation-failed"),
            message
        );
        this.invalidParams = invalidParams != null ? invalidParams : Collections.emptyList();
    }

    public ValidationException(String message) {
        this(message, Collections.emptyList());
    }

    public List<InvalidParamDto> getInvalidParams() {
        return invalidParams;
    }
}
