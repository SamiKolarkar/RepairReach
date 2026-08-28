package com.repairreach.backend.shared.exception;

import org.springframework.http.HttpStatus;

import java.net.URI;

public class InvalidStateTransitionException extends ProblemDetailException {

    public InvalidStateTransitionException(String message) {
        super(
            HttpStatus.CONFLICT,
            "INVALID_STATE_TRANSITION",
            URI.create("https://api.repairreach.shop/problems/invalid-state-transition"),
            message
        );
    }
}
