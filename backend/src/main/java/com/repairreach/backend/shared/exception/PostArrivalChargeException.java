package com.repairreach.backend.shared.exception;

import org.springframework.http.HttpStatus;

import java.net.URI;

public class PostArrivalChargeException extends ProblemDetailException {

    public PostArrivalChargeException(String message) {
        super(
            HttpStatus.CONFLICT,
            "POST_ARRIVAL_CHARGE",
            URI.create("https://api.repairreach.shop/problems/post-arrival-charge"),
            message
        );
    }
}
