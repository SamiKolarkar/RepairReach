package com.repairreach.backend.shared.exception;

import org.springframework.http.HttpStatus;

import java.net.URI;

public abstract class ProblemDetailException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final URI type;

    protected ProblemDetailException(HttpStatus status, String code, URI type, String message) {
        super(message);
        this.status = status;
        this.code = code;
        this.type = type;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public URI getType() {
        return type;
    }
}
