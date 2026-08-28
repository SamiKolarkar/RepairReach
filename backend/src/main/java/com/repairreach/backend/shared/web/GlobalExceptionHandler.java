package com.repairreach.backend.shared.web;

import com.repairreach.backend.shared.exception.ProblemDetailException;
import com.repairreach.backend.shared.exception.SlotUnavailableException;
import com.repairreach.backend.shared.exception.ValidationException;
import com.repairreach.backend.shared.web.dto.AlternativeSlotDto;
import com.repairreach.backend.shared.web.dto.InvalidParamDto;
import com.repairreach.backend.shared.web.dto.ProblemDetailsDto;
import com.repairreach.backend.shared.web.filter.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.net.URI;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final MediaType PROBLEM_JSON_MEDIA_TYPE = MediaType.parseMediaType("application/problem+json");

    private static final URI URI_VALIDATION_FAILED = URI.create("https://api.repairreach.shop/problems/validation-failed");
    private static final URI URI_MALFORMED_REQUEST = URI.create("https://api.repairreach.shop/problems/malformed-request");
    private static final URI URI_SLOT_UNAVAILABLE = URI.create("https://api.repairreach.shop/problems/slot-unavailable");
    private static final URI URI_DATA_CONFLICT = URI.create("https://api.repairreach.shop/problems/data-conflict");
    private static final URI URI_NOT_FOUND = URI.create("https://api.repairreach.shop/problems/not-found");
    private static final URI URI_METHOD_NOT_ALLOWED = URI.create("https://api.repairreach.shop/problems/method-not-allowed");
    private static final URI URI_INTERNAL_ERROR = URI.create("https://api.repairreach.shop/problems/internal-error");
    private static final URI URI_GENERAL_ERROR = URI.create("https://api.repairreach.shop/problems/general-error");

    @ExceptionHandler(SlotUnavailableException.class)
    public ResponseEntity<ProblemDetailsDto> handleSlotUnavailable(
        SlotUnavailableException ex,
        HttpServletRequest request
    ) {
        log.warn("Slot unavailable conflict: {}", ex.getMessage());
        return buildProblemResponse(
            ex.getType(),
            "Selected slot is no longer available",
            HttpStatus.CONFLICT,
            ex.getCode(),
            "The selected time slot has already been booked by another customer. Please choose an alternative slot.",
            request,
            null,
            ex.getAlternatives()
        );
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ProblemDetailsDto> handleValidationException(
        ValidationException ex,
        HttpServletRequest request
    ) {
        log.warn("Validation error: {}", ex.getMessage());
        return buildProblemResponse(
            ex.getType(),
            "Request Validation Failed",
            HttpStatus.BAD_REQUEST,
            ex.getCode(),
            "One or more fields failed validation. Please review your input and try again.",
            request,
            ex.getInvalidParams(),
            null
        );
    }

    @ExceptionHandler(ProblemDetailException.class)
    public ResponseEntity<ProblemDetailsDto> handleProblemDetailException(
        ProblemDetailException ex,
        HttpServletRequest request
    ) {
        log.warn("Application problem [{}]: {}", ex.getCode(), ex.getMessage());
        return buildProblemResponse(
            ex.getType(),
            formatTitleFromCode(ex.getCode()),
            ex.getStatus(),
            ex.getCode(),
            ex.getMessage() != null && !ex.getMessage().isBlank()
                ? ex.getMessage()
                : "An error occurred while processing the request. Please try again.",
            request,
            null,
            null
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetailsDto> handleMethodArgumentNotValid(
        MethodArgumentNotValidException ex,
        HttpServletRequest request
    ) {
        log.warn("Method argument validation failed: ", ex);
        List<InvalidParamDto> invalidParams = new ArrayList<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            invalidParams.add(new InvalidParamDto(error.getField(), error.getDefaultMessage(), error.getRejectedValue()));
        }

        String detail = String.format("The request contains %d invalid parameter(s).", invalidParams.size());
        return buildProblemResponse(
            URI_VALIDATION_FAILED,
            "Request Validation Failed",
            HttpStatus.BAD_REQUEST,
            "VALIDATION_FAILED",
            detail,
            request,
            invalidParams,
            null
        );
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetailsDto> handleConstraintViolation(
        ConstraintViolationException ex,
        HttpServletRequest request
    ) {
        log.warn("Constraint violation: ", ex);
        List<InvalidParamDto> invalidParams = new ArrayList<>();
        ex.getConstraintViolations().forEach(violation -> {
            String property = violation.getPropertyPath().toString();
            invalidParams.add(new InvalidParamDto(property, violation.getMessage(), violation.getInvalidValue()));
        });

        return buildProblemResponse(
            URI_VALIDATION_FAILED,
            "Request Validation Failed",
            HttpStatus.BAD_REQUEST,
            "VALIDATION_FAILED",
            "Validation failed for one or more fields.",
            request,
            invalidParams,
            null
        );
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ProblemDetailsDto> handleMissingParam(
        MissingServletRequestParameterException ex,
        HttpServletRequest request
    ) {
        log.warn("Missing request parameter: ", ex);
        List<InvalidParamDto> invalidParams = List.of(
            new InvalidParamDto(ex.getParameterName(), "Required request parameter is missing")
        );
        String detail = String.format("Required request parameter '%s' is missing.", ex.getParameterName());
        return buildProblemResponse(
            URI_VALIDATION_FAILED,
            "Missing Required Parameter",
            HttpStatus.BAD_REQUEST,
            "VALIDATION_FAILED",
            detail,
            request,
            invalidParams,
            null
        );
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ProblemDetailsDto> handleTypeMismatch(
        MethodArgumentTypeMismatchException ex,
        HttpServletRequest request
    ) {
        log.warn("Method argument type mismatch: ", ex);
        List<InvalidParamDto> invalidParams = List.of(
            new InvalidParamDto(ex.getName(), "Invalid format or type for parameter", ex.getValue())
        );
        String detail = String.format("Invalid value provided for parameter '%s'.", ex.getName());
        return buildProblemResponse(
            URI_VALIDATION_FAILED,
            "Parameter Type Mismatch",
            HttpStatus.BAD_REQUEST,
            "VALIDATION_FAILED",
            detail,
            request,
            invalidParams,
            null
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetailsDto> handleNotReadable(
        HttpMessageNotReadableException ex,
        HttpServletRequest request
    ) {
        log.warn("HTTP message not readable: ", ex);
        return buildProblemResponse(
            URI_MALFORMED_REQUEST,
            "Malformed Request Body",
            HttpStatus.BAD_REQUEST,
            "VALIDATION_FAILED",
            "The request body is malformed or contains invalid JSON.",
            request,
            null,
            null
        );
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetailsDto> handleDataIntegrityViolation(
        DataIntegrityViolationException ex,
        HttpServletRequest request
    ) {
        log.warn("Database integrity violation: ", ex);
        String msg = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();

        if (msg != null && (msg.contains("schedule_entry_no_overlap") || msg.contains("exclusion constraint"))) {
            return buildProblemResponse(
                URI_SLOT_UNAVAILABLE,
                "Selected slot is no longer available",
                HttpStatus.CONFLICT,
                "SLOT_UNAVAILABLE",
                "The selected time slot has already been booked by another customer. Please choose an alternative slot.",
                request,
                null,
                null
            );
        }

        return buildProblemResponse(
            URI_DATA_CONFLICT,
            "Data Conflict",
            HttpStatus.CONFLICT,
            "DATA_CONFLICT",
            "A database integrity constraint was violated.",
            request,
            null,
            null
        );
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ProblemDetailsDto> handleNoResourceFound(
        NoResourceFoundException ex,
        HttpServletRequest request
    ) {
        log.warn("Resource not found: ", ex);
        return buildProblemResponse(
            URI_NOT_FOUND,
            "Resource Not Found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND",
            "The requested resource could not be found.",
            request,
            null,
            null
        );
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ProblemDetailsDto> handleMethodNotSupported(
        HttpRequestMethodNotSupportedException ex,
        HttpServletRequest request
    ) {
        log.warn("HTTP method not supported: ", ex);
        String detail = String.format("HTTP method '%s' is not supported for this endpoint.", ex.getMethod());
        return buildProblemResponse(
            URI_METHOD_NOT_ALLOWED,
            "Method Not Allowed",
            HttpStatus.METHOD_NOT_ALLOWED,
            "METHOD_NOT_ALLOWED",
            detail,
            request,
            null,
            null
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetailsDto> handleGenericException(
        Exception ex,
        HttpServletRequest request
    ) {
        log.error("Unhandled internal server error: ", ex);
        return buildProblemResponse(
            URI_INTERNAL_ERROR,
            "Internal Server Error",
            HttpStatus.INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            "An unexpected error occurred while processing your request.",
            request,
            null,
            null
        );
    }

    private ResponseEntity<ProblemDetailsDto> buildProblemResponse(
        URI type,
        String title,
        HttpStatus status,
        String code,
        String detail,
        HttpServletRequest request,
        List<InvalidParamDto> invalidParams,
        List<AlternativeSlotDto> alternatives
    ) {
        String correlationId = (String) request.getAttribute(CorrelationIdFilter.CORRELATION_ID_ATTRIBUTE);
        if (correlationId == null) {
            correlationId = request.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
        }

        ProblemDetailsDto body = new ProblemDetailsDto(
            type != null ? type : URI_GENERAL_ERROR,
            title,
            status.value(),
            code,
            detail,
            request.getRequestURI(),
            correlationId,
            OffsetDateTime.now(ZoneOffset.UTC),
            invalidParams,
            alternatives
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(PROBLEM_JSON_MEDIA_TYPE);
        if (correlationId != null) {
            headers.set(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId);
        }

        return new ResponseEntity<>(body, headers, status);
    }

    private String formatTitleFromCode(String code) {
        if (code == null) return "Error";
        return switch (code) {
            case "NOT_FOUND" -> "Resource Not Found";
            case "VALIDATION_FAILED" -> "Validation Failed";
            case "SLOT_UNAVAILABLE" -> "Selected Slot Unavailable";
            case "POST_ARRIVAL_CHARGE" -> "Cancellation Fee Applicable";
            case "INVALID_FEEDBACK_TOKEN" -> "Invalid Feedback Token";
            case "FEEDBACK_ALREADY_SUBMITTED" -> "Feedback Already Submitted";
            case "IDEMPOTENCY_CONFLICT" -> "Idempotency Conflict";
            case "INVALID_STATE_TRANSITION", "CANNOT_CANCEL_AFTER_CLOSURE" -> "Invalid State Transition";
            default -> code.replace('_', ' ');
        };
    }
}
