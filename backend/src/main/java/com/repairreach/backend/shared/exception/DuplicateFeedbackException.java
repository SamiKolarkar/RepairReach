package com.repairreach.backend.shared.exception;

import org.springframework.http.HttpStatus;

import java.net.URI;

public class DuplicateFeedbackException extends ProblemDetailException {

    public DuplicateFeedbackException(String message) {
        super(
            HttpStatus.CONFLICT,
            "FEEDBACK_ALREADY_SUBMITTED",
            URI.create("https://api.repairreach.shop/problems/feedback-already-submitted"),
            message
        );
    }
}
