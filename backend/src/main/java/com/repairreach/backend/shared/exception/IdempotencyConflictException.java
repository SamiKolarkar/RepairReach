package com.repairreach.backend.shared.exception;

import org.springframework.http.HttpStatus;

import java.net.URI;

public class IdempotencyConflictException extends ProblemDetailException {

    public IdempotencyConflictException(String message) {
        super(
            HttpStatus.CONFLICT,
            "IDEMPOTENCY_CONFLICT",
            URI.create("https://api.repairreach.shop/problems/idempotency-conflict"),
            message
        );
    }
}
