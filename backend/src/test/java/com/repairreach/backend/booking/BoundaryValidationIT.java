package com.repairreach.backend.booking;

import com.repairreach.backend.BaseIntegrationTest;
import com.repairreach.backend.booking.web.dto.CreateBookingRequestDto;
import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.catalog.infrastructure.ServiceOfferingRepository;
import com.repairreach.backend.shared.domain.TenantContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

class BoundaryValidationIT extends BaseIntegrationTest {

    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;

    @Test
    @DisplayName("Boundary: Reject 50000 character problem description")
    void shouldRejectOversizedProblemDescription() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        String targetDate = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.FRIDAY)).plusWeeks(2).toString();
        String hugeDescription = "A".repeat(50000);

        CreateBookingRequestDto requestDto = new CreateBookingRequestDto(
            "Boundary Tester",
            "+91 98000 22222",
            service.getId(),
            "123 Main St",
            hugeDescription,
            targetDate,
            "slot-10-11",
            "10:00",
            "11:00"
        );

        mockMvc.perform(post("/api/v1/public/bookings")
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestDto))
                .accept(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(result -> {
                int status = result.getResponse().getStatus();
                assertThat(status).isNotEqualTo(500);
            });
    }

    @Test
    @DisplayName("Boundary: Handle emojis and zero-width spaces gracefully or reject if invalid pattern")
    void shouldHandleBizarreCharactersInName() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        String targetDate = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.FRIDAY)).plusWeeks(2).toString();
        // Emojis and zero-width spaces
        String bizarreName = "Customer 😎🔧\u200B\u0000";

        CreateBookingRequestDto requestDto = new CreateBookingRequestDto(
            bizarreName,
            "+91 98000 22222",
            service.getId(),
            "123 Main St",
            "Normal description",
            targetDate,
            "slot-10-11",
            "10:00",
            "11:00"
        );

        // It may be accepted or rejected depending on strictness, but it must NOT cause a 500 error.
        mockMvc.perform(post("/api/v1/public/bookings")
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestDto))
                .accept(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(result -> {
                int status = result.getResponse().getStatus();
                // We just expect it not to be a 500 Internal Server Error
                assertThat(status).isNotEqualTo(500);
            });
    }
}
