package com.repairreach.backend.feedback;

import com.repairreach.backend.BaseIntegrationTest;
import com.repairreach.backend.booking.application.BookingService;
import com.repairreach.backend.booking.web.dto.BookingConfirmationResponseDto;
import com.repairreach.backend.booking.web.dto.CreateBookingRequestDto;
import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.catalog.infrastructure.ServiceOfferingRepository;
import com.repairreach.backend.feedback.web.dto.SubmitFeedbackRequestDto;
import com.repairreach.backend.shared.domain.TenantContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicFeedbackControllerIT extends BaseIntegrationTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;

    @Test
    @DisplayName("POST /api/v1/public/jobs/{jobRef}/feedback accepts rating and rejects duplicate submission")
    void shouldSubmitFeedbackAndRejectDuplicate() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        String requestedDate = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY)).toString();
        CreateBookingRequestDto bookingReq = new CreateBookingRequestDto(
            "Vikas Shinde",
            "+91 98900 11223",
            service.getId(),
            "78 Ashok Chowk, Solapur",
            "AC not cooling",
            requestedDate,
            "slot-12-13",
            "12:00",
            "13:00"
        );

        BookingConfirmationResponseDto booking = bookingService.createBooking(bookingReq, UUID.randomUUID().toString(), null);
        String token = booking.feedbackCapabilityToken();
        String jobRef = "JOB-" + booking.publicReference();

        SubmitFeedbackRequestDto feedbackReq = new SubmitFeedbackRequestDto(
            5,
            "Quick diagnosis and gas charging done in 45 mins. Very professional.",
            token
        );

        // 1. First submission -> 201 Created
        mockMvc.perform(post("/api/v1/public/jobs/" + jobRef + "/feedback")
                .header("X-Feedback-Token", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(feedbackReq))
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status", is("ACCEPTED")))
            .andExpect(jsonPath("$.rating", is(5)))
            .andExpect(jsonPath("$.googleReviewUrl", is("https://g.page/r/repairreach-solapur/review")));

        // 2. Duplicate submission -> 409 Conflict (FEEDBACK_ALREADY_SUBMITTED)
        mockMvc.perform(post("/api/v1/public/jobs/" + jobRef + "/feedback")
                .header("X-Feedback-Token", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(feedbackReq))
                .accept(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("FEEDBACK_ALREADY_SUBMITTED")));
    }
}
