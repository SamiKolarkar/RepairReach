package com.repairreach.backend.shared.exception;

import org.springframework.http.HttpStatus;

import java.net.URI;

public class FeedbackTokenInvalidException extends ProblemDetailException {

    public FeedbackTokenInvalidException(String message) {
        super(
            HttpStatus.UNAUTHORIZED,
            "INVALID_FEEDBACK_TOKEN",
            URI.create("https://api.repairreach.shop/problems/invalid-feedback-token"),
            message
        );
    }
}
