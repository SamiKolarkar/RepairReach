package com.repairreach.backend.shared.exception;

import org.springframework.http.HttpStatus;

import java.net.URI;

public class ResourceNotFoundException extends ProblemDetailException {

    public ResourceNotFoundException(String message) {
        super(
            HttpStatus.NOT_FOUND,
            "NOT_FOUND",
            URI.create("https://api.repairreach.shop/problems/resource-not-found"),
            message
        );
    }

    public ResourceNotFoundException(String resourceName, Object identifier) {
        this(String.format("%s not found with identifier: %s", resourceName, identifier));
    }
}
