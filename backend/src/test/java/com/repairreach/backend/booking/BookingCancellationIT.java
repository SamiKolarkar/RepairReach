package com.repairreach.backend.booking;

import com.repairreach.backend.BaseIntegrationTest;
import com.repairreach.backend.booking.application.BookingService;
import com.repairreach.backend.booking.web.dto.BookingConfirmationResponseDto;
import com.repairreach.backend.booking.web.dto.CancelBookingRequestDto;
import com.repairreach.backend.booking.web.dto.CreateBookingRequestDto;
import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.catalog.infrastructure.ServiceOfferingRepository;
import com.repairreach.backend.job.domain.Job;
import com.repairreach.backend.job.infrastructure.JobRepository;
import com.repairreach.backend.shared.domain.TenantContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BookingCancellationIT extends BaseIntegrationTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;

    @Autowired
    private JobRepository jobRepository;

    @Test
    @DisplayName("Pre-arrival cancellation is free (visitingChargeApplicable: false)")
    void shouldCancelPreArrivalFree() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        String requestedDate = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.TUESDAY)).toString();
        CreateBookingRequestDto bookingReq = new CreateBookingRequestDto(
            "Pooja Joshi",
            "+91 97654 33221",
            service.getId(),
            "14 Jule Solapur, Solapur",
            "Microwave display dead",
            requestedDate,
            "slot-16-17",
            "16:00",
            "17:00"
        );

        BookingConfirmationResponseDto booking = bookingService.createBooking(bookingReq, UUID.randomUUID().toString(), null);

        CancelBookingRequestDto cancelReq = new CancelBookingRequestDto(
            "Changed mind, moving house",
            booking.capabilityToken()
        );

        mockMvc.perform(post("/api/v1/public/bookings/" + booking.publicReference() + "/cancel")
                .header("X-Capability-Token", booking.capabilityToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(cancelReq))
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status", is("CANCELLED")))
            .andExpect(jsonPath("$.visitingChargeApplicable", is(false)))
            .andExpect(jsonPath("$.cancellationOutcome", is("PRE_ARRIVAL_NO_VISIT_CHARGE")));
    }

    @Test
    @DisplayName("Post-arrival cancellation triggers 409 POST_ARRIVAL_CHARGE fee boundary")
    void shouldRejectPostArrivalCancellation() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        String requestedDate = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.WEDNESDAY)).toString();
        CreateBookingRequestDto bookingReq = new CreateBookingRequestDto(
            "Amit Deshmukh",
            "+91 97654 99887",
            service.getId(),
            "89 Saat Rasta, Solapur",
            "TV panel flickering",
            requestedDate,
            "slot-17-18",
            "17:00",
            "18:00"
        );

        BookingConfirmationResponseDto booking = bookingService.createBooking(bookingReq, UUID.randomUUID().toString(), null);

        // Simulate technician has arrived at the customer doorstep
        Job job = jobRepository.findByBookingId(booking.bookingId()).orElseThrow();
        job.setActualArrivedAt(OffsetDateTime.now().minusMinutes(15));
        jobRepository.saveAndFlush(job);

        CancelBookingRequestDto cancelReq = new CancelBookingRequestDto(
            "Customer not home anymore",
            booking.capabilityToken()
        );

        mockMvc.perform(post("/api/v1/public/bookings/" + booking.publicReference() + "/cancel")
                .header("X-Capability-Token", booking.capabilityToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(cancelReq))
                .accept(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("POST_ARRIVAL_CHARGE")));
    }
}
