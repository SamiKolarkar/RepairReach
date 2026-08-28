package com.repairreach.backend.booking.web;

import com.repairreach.backend.booking.application.BookingService;
import com.repairreach.backend.booking.web.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/v1/customer/bookings")
public class CustomerBookingController {

    private final BookingService bookingService;

    public CustomerBookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<BookingConfirmationResponseDto> createBooking(
        @RequestBody CreateBookingRequestDto request,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
        @AuthenticationPrincipal Jwt jwt
    ) {
        String authUserId = jwt.getSubject();
        BookingConfirmationResponseDto response = bookingService.createBooking(request, idempotencyKey, authUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{publicReference}")
    public ResponseEntity<BookingTrackingResponseDto> getBookingByReference(
        @PathVariable("publicReference") String publicReference,
        @AuthenticationPrincipal Jwt jwt
    ) {
        // TODO: authorize that this booking belongs to the current user
        BookingTrackingResponseDto response = bookingService.getBookingTracking(publicReference);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{publicReference}/cancel")
    public ResponseEntity<CancelBookingResponseDto> cancelBooking(
        @PathVariable("publicReference") String publicReference,
        @RequestBody(required = false) CancelBookingRequestDto request,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
        @AuthenticationPrincipal Jwt jwt
    ) {
        // TODO: authorize that this booking belongs to the current user
        CancelBookingResponseDto response = bookingService.cancelBooking(publicReference, request, idempotencyKey);
        return ResponseEntity.ok(response);
    }
}
