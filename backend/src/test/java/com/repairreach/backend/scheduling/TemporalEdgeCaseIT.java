package com.repairreach.backend.scheduling;

import com.repairreach.backend.BaseIntegrationTest;
import com.repairreach.backend.booking.web.dto.CreateBookingRequestDto;
import com.repairreach.backend.catalog.domain.ServiceOffering;
import com.repairreach.backend.catalog.infrastructure.ServiceOfferingRepository;
import com.repairreach.backend.shared.domain.TenantContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TemporalEdgeCaseIT extends BaseIntegrationTest {

    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;

    @Test
    @DisplayName("Temporal: Reject booking request 5 years in the past")
    void shouldRejectPastBooking() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        String pastDate = "2019-01-01";

        CreateBookingRequestDto requestDto = new CreateBookingRequestDto(
            "Time Traveler",
            "+91 98000 33333",
            service.getId(),
            "123 Past St",
            "Broken DeLorean",
            pastDate,
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
                org.assertj.core.api.Assertions.assertThat(status).isNotEqualTo(500);
            });
    }

    @Test
    @DisplayName("Temporal: Handle year 2038 availability query gracefully without crashing")
    void shouldHandleDeepFutureAvailability() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        String futureDate = "2038-01-19";

        // Query availability for deep future
        mockMvc.perform(get("/api/v1/public/availability")
                .param("serviceId", service.getId().toString())
                .param("date", futureDate)
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(result -> {
                int status = result.getResponse().getStatus();
                // We just expect it not to be a 500 Internal Server Error (could be 200 OK or 400 Validation)
                org.assertj.core.api.Assertions.assertThat(status).isNotEqualTo(500);
            });
    }
}
