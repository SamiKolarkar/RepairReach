package com.repairreach.backend.shared.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.repairreach.backend.shared.exception.DuplicateFeedbackException;
import com.repairreach.backend.shared.exception.FeedbackTokenInvalidException;
import com.repairreach.backend.shared.exception.IdempotencyConflictException;
import com.repairreach.backend.shared.exception.InvalidStateTransitionException;
import com.repairreach.backend.shared.exception.PostArrivalChargeException;
import com.repairreach.backend.shared.exception.ResourceNotFoundException;
import com.repairreach.backend.shared.exception.SlotUnavailableException;
import com.repairreach.backend.shared.exception.ValidationException;
import com.repairreach.backend.shared.web.dto.AlternativeSlotDto;
import com.repairreach.backend.shared.web.dto.InvalidParamDto;
import com.repairreach.backend.shared.web.filter.CorrelationIdFilter;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.sql.SQLException;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("GlobalExceptionHandler Unit & Security Hardening Tests")
class GlobalExceptionHandlerTest {

    private static final String PROBLEM_BASE_URI = "https://api.repairreach.shop/problems/";
    private static final String FORBIDDEN_EXAMPLE_DOMAIN = "api.repairreach.example";

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .addFilters(new CorrelationIdFilter())
            .build();
    }

    // =========================================================================
    // 1. Spring MVC Request Binding & Validation Exceptions (HTTP 400)
    // =========================================================================
    @Nested
    @DisplayName("1. Spring Request Binding & Validation Handlers")
    class RequestBindingAndValidationTests {

        @Test
        @DisplayName("MethodArgumentNotValidException: Returns 400 with invalidParams array and sanitized detail")
        void shouldHandleMethodArgumentNotValid() throws Exception {
            TestRequestDto invalidDto = new TestRequestDto("", "invalid-email-format", 0);

            mockMvc.perform(post("/test-api/valid-body")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "validation-failed")))
                .andExpect(jsonPath("$.title", is("Request Validation Failed")))
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
                .andExpect(jsonPath("$.instance", is("/test-api/valid-body")))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.correlationId").isNotEmpty())
                .andExpect(jsonPath("$.invalidParams").isArray())
                .andExpect(jsonPath("$.invalidParams", hasSize(3)))
                // Negative assertion: no internal class or package names in response
                .andExpect(content().string(not(containsString("org.springframework"))))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("ConstraintViolationException: Returns 400 with sanitized detail and does not leak DB/class names")
        void shouldHandleConstraintViolation() throws Exception {
            mockMvc.perform(get("/test-api/constraint-violation"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "validation-failed")))
                .andExpect(jsonPath("$.title", is("Request Validation Failed")))
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
                .andExpect(jsonPath("$.invalidParams").isArray())
                .andExpect(jsonPath("$.detail", is("Validation failed for one or more fields.")))
                .andExpect(jsonPath("$.detail", not(containsString("ConstraintViolationImpl"))))
                .andExpect(jsonPath("$.detail", not(containsString("com.repairreach"))))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("MissingServletRequestParameterException: Returns 400 with sanitized parameter name and no stack details")
        void shouldHandleMissingServletRequestParameter() throws Exception {
            mockMvc.perform(get("/test-api/missing-param"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "validation-failed")))
                .andExpect(jsonPath("$.title", is("Missing Required Parameter")))
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
                .andExpect(jsonPath("$.detail", is("Required request parameter 'requiredKey' is missing.")))
                .andExpect(jsonPath("$.detail", not(containsString("org.springframework"))))
                .andExpect(jsonPath("$.invalidParams[0].name", is("requiredKey")))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("MethodArgumentTypeMismatchException: Returns 400 with sanitized mismatch detail and no Java NumberFormatException")
        void shouldHandleMethodArgumentTypeMismatch() throws Exception {
            mockMvc.perform(get("/test-api/type-mismatch").param("numericId", "not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "validation-failed")))
                .andExpect(jsonPath("$.title", is("Parameter Type Mismatch")))
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
                .andExpect(jsonPath("$.detail", is("Invalid value provided for parameter 'numericId'.")))
                .andExpect(jsonPath("$.detail", not(containsString("NumberFormatException"))))
                .andExpect(jsonPath("$.detail", not(containsString("java.lang"))))
                .andExpect(jsonPath("$.invalidParams[0].name", is("numericId")))
                .andExpect(jsonPath("$.invalidParams[0].value", is("not-a-number")))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("HttpMessageNotReadableException: Returns 400 with generic malformed body message and NO Jackson stack trace")
        void shouldHandleHttpMessageNotReadable() throws Exception {
            String malformedJson = "{\"title\": unquoted_value_here, \"email\": }";

            mockMvc.perform(post("/test-api/readable-body")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(malformedJson))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "malformed-request")))
                .andExpect(jsonPath("$.title", is("Malformed Request Body")))
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
                .andExpect(jsonPath("$.detail", is("The request body is malformed or contains invalid JSON.")))
                // Negative assertion: Jackson parser traces are completely excluded
                .andExpect(content().string(not(containsString("com.fasterxml.jackson"))))
                .andExpect(content().string(not(containsString("StreamUtils"))))
                .andExpect(content().string(not(containsString("JsonParseException"))))
                .andExpect(content().string(not(containsString("Cannot deserialize"))))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }
    }

    // =========================================================================
    // 2. Custom Domain ProblemDetailException Handlers (400, 401, 404, 409)
    // =========================================================================
    @Nested
    @DisplayName("2. Domain ProblemDetailException Subclass Handlers")
    class DomainProblemDetailExceptionTests {

        @Test
        @DisplayName("SlotUnavailableException: Returns 409 with alternatives list and correct problem type")
        void shouldHandleSlotUnavailable() throws Exception {
            mockMvc.perform(get("/test-api/slot-unavailable"))
                .andExpect(status().isConflict())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "slot-unavailable")))
                .andExpect(jsonPath("$.title", is("Selected slot is no longer available")))
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.code", is("SLOT_UNAVAILABLE")))
                .andExpect(jsonPath("$.alternatives", hasSize(1)))
                .andExpect(jsonPath("$.alternatives[0].slotId", is("slot-101")))
                .andExpect(jsonPath("$.alternatives[0].label", is("Tomorrow 10:00 AM")))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("ValidationException: Returns 400 with invalidParams and correct problem type")
        void shouldHandleValidationException() throws Exception {
            mockMvc.perform(get("/test-api/validation-exception"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "validation-failed")))
                .andExpect(jsonPath("$.title", is("Request Validation Failed")))
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
                .andExpect(jsonPath("$.invalidParams", hasSize(1)))
                .andExpect(jsonPath("$.invalidParams[0].name", is("postalCode")))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("ResourceNotFoundException: Returns 404 with formatted title and problem type")
        void shouldHandleResourceNotFound() throws Exception {
            mockMvc.perform(get("/test-api/resource-not-found"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "resource-not-found")))
                .andExpect(jsonPath("$.title", is("Resource Not Found")))
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.code", is("NOT_FOUND")))
                .andExpect(jsonPath("$.detail", is("Booking not found with identifier: BK-99999")))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("IdempotencyConflictException: Returns 409 with IDEMPOTENCY_CONFLICT code")
        void shouldHandleIdempotencyConflict() throws Exception {
            mockMvc.perform(get("/test-api/idempotency-conflict"))
                .andExpect(status().isConflict())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "idempotency-conflict")))
                .andExpect(jsonPath("$.title", is("Idempotency Conflict")))
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.code", is("IDEMPOTENCY_CONFLICT")))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("InvalidStateTransitionException: Returns 409 with INVALID_STATE_TRANSITION code")
        void shouldHandleInvalidStateTransition() throws Exception {
            mockMvc.perform(get("/test-api/invalid-state-transition"))
                .andExpect(status().isConflict())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "invalid-state-transition")))
                .andExpect(jsonPath("$.title", is("Invalid State Transition")))
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.code", is("INVALID_STATE_TRANSITION")))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("PostArrivalChargeException: Returns 409 with POST_ARRIVAL_CHARGE code")
        void shouldHandlePostArrivalCharge() throws Exception {
            mockMvc.perform(get("/test-api/post-arrival-charge"))
                .andExpect(status().isConflict())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "post-arrival-charge")))
                .andExpect(jsonPath("$.title", is("Cancellation Fee Applicable")))
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.code", is("POST_ARRIVAL_CHARGE")))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("DuplicateFeedbackException: Returns 409 with FEEDBACK_ALREADY_SUBMITTED code")
        void shouldHandleDuplicateFeedback() throws Exception {
            mockMvc.perform(get("/test-api/duplicate-feedback"))
                .andExpect(status().isConflict())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "feedback-already-submitted")))
                .andExpect(jsonPath("$.title", is("Feedback Already Submitted")))
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.code", is("FEEDBACK_ALREADY_SUBMITTED")))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("FeedbackTokenInvalidException: Returns 401 with INVALID_FEEDBACK_TOKEN code")
        void shouldHandleFeedbackTokenInvalid() throws Exception {
            mockMvc.perform(get("/test-api/feedback-token-invalid"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "invalid-feedback-token")))
                .andExpect(jsonPath("$.title", is("Invalid Feedback Token")))
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.code", is("INVALID_FEEDBACK_TOKEN")))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }
    }

    // =========================================================================
    // 3. Database Integrity & Concurrency Handlers (HTTP 409)
    // =========================================================================
    @Nested
    @DisplayName("3. DataIntegrityViolationException Handlers")
    class DataIntegrityViolationTests {

        @Test
        @DisplayName("Slot Exclusion Overlap: Maps PostgreSQL schedule_entry_no_overlap constraint to SLOT_UNAVAILABLE problem")
        void shouldHandleSlotExclusionOverlapConstraint() throws Exception {
            mockMvc.perform(get("/test-api/data-integrity-overlap"))
                .andExpect(status().isConflict())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "slot-unavailable")))
                .andExpect(jsonPath("$.title", is("Selected slot is no longer available")))
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.code", is("SLOT_UNAVAILABLE")))
                .andExpect(jsonPath("$.detail", is("The selected time slot has already been booked by another customer. Please choose an alternative slot.")))
                // Negative assertion: no raw SQL or DB exception string
                .andExpect(content().string(not(containsString("SQLException"))))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("Generic DB Constraint: Returns sanitized DATA_CONFLICT without leaking table or constraint names")
        void shouldHandleGenericDatabaseIntegrityConstraint() throws Exception {
            mockMvc.perform(get("/test-api/data-integrity-generic"))
                .andExpect(status().isConflict())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "data-conflict")))
                .andExpect(jsonPath("$.title", is("Data Conflict")))
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.code", is("DATA_CONFLICT")))
                .andExpect(jsonPath("$.detail", is("A database integrity constraint was violated.")))
                // Negative assertion: constraint and table names are suppressed
                .andExpect(content().string(not(containsString("fk_bookings_technician_id"))))
                .andExpect(content().string(not(containsString("bookings"))))
                .andExpect(content().string(not(containsString("SQLException"))))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }
    }

    // =========================================================================
    // 4. Spring Web Routing & Dispatch Handlers (HTTP 404, 405)
    // =========================================================================
    @Nested
    @DisplayName("4. Routing & Method Dispatch Handlers")
    class RoutingAndDispatchTests {

        @Test
        @DisplayName("NoResourceFoundException: Returns 404 with sanitized detail and NOT_FOUND code")
        void shouldHandleNoResourceFound() throws Exception {
            mockMvc.perform(get("/test-api/no-resource-found"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "not-found")))
                .andExpect(jsonPath("$.title", is("Resource Not Found")))
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.code", is("NOT_FOUND")))
                .andExpect(jsonPath("$.detail", is("The requested resource could not be found.")))
                .andExpect(content().string(not(containsString("No static resource"))))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("HttpRequestMethodNotSupportedException: Returns 405 with safe method name")
        void shouldHandleMethodNotSupported() throws Exception {
            mockMvc.perform(post("/test-api/get-only"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "method-not-allowed")))
                .andExpect(jsonPath("$.title", is("Method Not Allowed")))
                .andExpect(jsonPath("$.status", is(405)))
                .andExpect(jsonPath("$.code", is("METHOD_NOT_ALLOWED")))
                .andExpect(jsonPath("$.detail", is("HTTP method 'POST' is not supported for this endpoint.")))
                .andExpect(content().string(not(containsString("org.springframework"))))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }
    }

    // =========================================================================
    // 5. Generic & Unhandled Exception Fallback (HTTP 500)
    // =========================================================================
    @Nested
    @DisplayName("5. Generic Unhandled Exception Fallback")
    class GenericExceptionFallbackTests {

        @Test
        @DisplayName("Unhandled RuntimeException: Returns 500 with zero stack trace and safe message")
        void shouldHandleUnhandledRuntimeException() throws Exception {
            mockMvc.perform(get("/test-api/generic-runtime-error"))
                .andExpect(status().isInternalServerError())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "internal-error")))
                .andExpect(jsonPath("$.title", is("Internal Server Error")))
                .andExpect(jsonPath("$.status", is(500)))
                .andExpect(jsonPath("$.code", is("INTERNAL_ERROR")))
                .andExpect(jsonPath("$.detail", is("An unexpected error occurred while processing your request.")))
                // Negative assertion: internal null pointer stack trace NEVER leaks
                .andExpect(content().string(not(containsString("NullPointerException"))))
                .andExpect(content().string(not(containsString("InternalLogic"))))
                .andExpect(content().string(not(containsString("com.repairreach"))))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }

        @Test
        @DisplayName("Checked Exception with Sensitive Content: Returns 500 without leaking sensitive messages")
        void shouldHandleCheckedExceptionWithSensitiveContent() throws Exception {
            mockMvc.perform(get("/test-api/generic-checked-error"))
                .andExpect(status().isInternalServerError())
                .andExpect(header().string("Content-Type", startsWith("application/problem+json")))
                .andExpect(jsonPath("$.type", is(PROBLEM_BASE_URI + "internal-error")))
                .andExpect(jsonPath("$.title", is("Internal Server Error")))
                .andExpect(jsonPath("$.status", is(500)))
                .andExpect(jsonPath("$.code", is("INTERNAL_ERROR")))
                .andExpect(jsonPath("$.detail", is("An unexpected error occurred while processing your request.")))
                // Negative assertion: sensitive text and passwords never leak
                .andExpect(content().string(not(containsString("SuperSecretPassword123!"))))
                .andExpect(content().string(not(containsString("admin_db"))))
                .andExpect(content().string(not(containsString(FORBIDDEN_EXAMPLE_DOMAIN))));
        }
    }

    // =========================================================================
    // 6. Correlation ID & Header Propagation
    // =========================================================================
    @Nested
    @DisplayName("6. Correlation ID & Header Propagation")
    class CorrelationIdTests {

        @Test
        @DisplayName("Custom X-Correlation-ID header is propagated in response header and JSON body")
        void shouldPropagateCustomCorrelationId() throws Exception {
            String customCorrId = "client-trace-id-98765";

            mockMvc.perform(get("/test-api/resource-not-found")
                    .header("X-Correlation-ID", customCorrId))
                .andExpect(status().isNotFound())
                .andExpect(header().string("X-Correlation-ID", is(customCorrId)))
                .andExpect(jsonPath("$.correlationId", is(customCorrId)));
        }

        @Test
        @DisplayName("Missing X-Correlation-ID header generates random correlation ID prefixed with 'corr-'")
        void shouldGenerateRandomCorrelationIdWhenHeaderMissing() throws Exception {
            mockMvc.perform(get("/test-api/resource-not-found"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("X-Correlation-ID", startsWith("corr-")))
                .andExpect(jsonPath("$.correlationId", startsWith("corr-")));
        }
    }

    // =========================================================================
    // Dummy Controller & DTOs for Standalone Testing
    // =========================================================================
    @RestController
    @RequestMapping("/test-api")
    static class TestController {

        @PostMapping("/valid-body")
        public ResponseEntity<Void> testMethodArgumentNotValid(@Valid @RequestBody TestRequestDto dto) {
            return ResponseEntity.ok().build();
        }

        @GetMapping("/constraint-violation")
        public ResponseEntity<Void> testConstraintViolation() {
            @SuppressWarnings("unchecked")
            ConstraintViolation<Object> violation = mock(ConstraintViolation.class);
            Path mockPath = mock(Path.class);
            when(mockPath.toString()).thenReturn("customerEmail");
            when(violation.getPropertyPath()).thenReturn(mockPath);
            when(violation.getMessage()).thenReturn("must be a valid email");
            when(violation.getInvalidValue()).thenReturn("invalid-email");

            throw new ConstraintViolationException("Validation constraints failed", Set.of(violation));
        }

        @GetMapping("/missing-param")
        public ResponseEntity<Void> testMissingParam(@RequestParam("requiredKey") String requiredKey) {
            return ResponseEntity.ok().build();
        }

        @GetMapping("/type-mismatch")
        public ResponseEntity<Void> testTypeMismatch(@RequestParam("numericId") Long numericId) {
            return ResponseEntity.ok().build();
        }

        @PostMapping("/readable-body")
        public ResponseEntity<Void> testNotReadable(@RequestBody TestRequestDto dto) {
            return ResponseEntity.ok().build();
        }

        @GetMapping("/slot-unavailable")
        public ResponseEntity<Void> testSlotUnavailable() {
            throw new SlotUnavailableException(
                "Selected slot is no longer available",
                List.of(new AlternativeSlotDto("slot-101", "2026-08-25T10:00:00Z", "2026-08-25T11:00:00Z", "Tomorrow 10:00 AM"))
            );
        }

        @GetMapping("/validation-exception")
        public ResponseEntity<Void> testValidationException() {
            throw new ValidationException(
                "Request Validation Failed",
                List.of(new InvalidParamDto("postalCode", "Must be a valid 6-digit postal code", "ABCXYZ"))
            );
        }

        @GetMapping("/resource-not-found")
        public ResponseEntity<Void> testResourceNotFound() {
            throw new ResourceNotFoundException("Booking", "BK-99999");
        }

        @GetMapping("/idempotency-conflict")
        public ResponseEntity<Void> testIdempotencyConflict() {
            throw new IdempotencyConflictException("An in-flight request is already being processed with this idempotency key.");
        }

        @GetMapping("/invalid-state-transition")
        public ResponseEntity<Void> testInvalidStateTransition() {
            throw new InvalidStateTransitionException("Cannot cancel a booking that has already been completed.");
        }

        @GetMapping("/post-arrival-charge")
        public ResponseEntity<Void> testPostArrivalCharge() {
            throw new PostArrivalChargeException("Technician has arrived at location. A diagnostic fee applies upon cancellation.");
        }

        @GetMapping("/duplicate-feedback")
        public ResponseEntity<Void> testDuplicateFeedback() {
            throw new DuplicateFeedbackException("Feedback has already been submitted for this service booking.");
        }

        @GetMapping("/feedback-token-invalid")
        public ResponseEntity<Void> testFeedbackTokenInvalid() {
            throw new FeedbackTokenInvalidException("The feedback authorization token has expired or is invalid.");
        }

        @GetMapping("/data-integrity-overlap")
        public ResponseEntity<Void> testDataIntegrityOverlap() {
            throw new DataIntegrityViolationException(
                "constraint violation",
                new SQLException("ERROR: duplicate key value violates exclusion constraint \"schedule_entry_no_overlap\"")
            );
        }

        @GetMapping("/data-integrity-generic")
        public ResponseEntity<Void> testDataIntegrityGeneric() {
            throw new DataIntegrityViolationException(
                "foreign key violation",
                new SQLException("ERROR: insert or update on table \"bookings\" violates foreign key constraint \"fk_bookings_technician_id\"")
            );
        }

        @GetMapping("/no-resource-found")
        public ResponseEntity<Void> testNoResourceFound() throws NoResourceFoundException {
            throw new NoResourceFoundException(HttpMethod.GET, "/test-api/non-existent-resource");
        }

        @GetMapping("/get-only")
        public ResponseEntity<String> testGetOnly() {
            return ResponseEntity.ok("success");
        }

        @GetMapping("/generic-runtime-error")
        public ResponseEntity<Void> testGenericRuntimeException() {
            throw new NullPointerException("Internal null pointer at com.repairreach.backend.service.InternalLogic.execute(InternalLogic.java:42)");
        }

        @GetMapping("/generic-checked-error")
        public ResponseEntity<Void> testGenericCheckedException() throws Exception {
            throw new Exception("Sensitive internal database connection timeout: password=SuperSecretPassword123! user=admin_db");
        }
    }

    static class TestRequestDto {
        @NotBlank(message = "Service title cannot be blank")
        private String title;

        @NotBlank(message = "Customer email cannot be blank")
        @Email(message = "Customer email must be a valid email address")
        private String email;

        @Min(value = 1, message = "Estimated duration must be at least 1 hour")
        private Integer durationHours;

        public TestRequestDto() {}

        public TestRequestDto(String title, String email, Integer durationHours) {
            this.title = title;
            this.email = email;
            this.durationHours = durationHours;
        }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public Integer getDurationHours() { return durationHours; }
        public void setDurationHours(Integer durationHours) { this.durationHours = durationHours; }
    }
}
