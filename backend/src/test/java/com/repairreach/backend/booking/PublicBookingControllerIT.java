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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PublicBookingControllerIT extends BaseIntegrationTest {

    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;

    @Test
    @DisplayName("POST /api/v1/public/bookings creates booking and GET returns confirmed tracking")
    void shouldCreateAndRetrieveBooking() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        String requestedDate = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.THURSDAY)).toString();
        String idempotencyKey = UUID.randomUUID().toString();

        CreateBookingRequestDto request = new CreateBookingRequestDto(
            "Anand Deshpande",
            "+91 98221 23456",
            service.getId(),
            "45 Shaniwar Peth, Solapur, Maharashtra 413002",
            "Washing machine spin vibration issue",
            requestedDate,
            "slot-09-10",
            "09:00",
            "10:00"
        );

        // 1. Create Booking
        String responseBody = mockMvc.perform(post("/api/v1/public/bookings")
                .header("Idempotency-Key", idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.publicReference", startsWith("RR-")))
            .andExpect(jsonPath("$.status", is("CONFIRMED")))
            .andExpect(jsonPath("$.customerName", is("Anand Deshpande")))
            .andExpect(jsonPath("$.customerPhone", is("+919822123456")))
            .andExpect(jsonPath("$.scheduledDate", is(requestedDate)))
            .andExpect(jsonPath("$.scheduledSlot.formatted", equalToIgnoringCase("09:00 AM - 10:00 AM")))
            .andExpect(jsonPath("$.capabilityToken", notNullValue()))
            .andReturn()
            .getResponse()
            .getContentAsString();

        String publicReference = objectMapper.readTree(responseBody).get("publicReference").asText();

        // 2. Retrieve Booking
        mockMvc.perform(get("/api/v1/public/bookings/" + publicReference)
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.publicReference", is(publicReference)))
            .andExpect(jsonPath("$.status", is("CONFIRMED")))
            .andExpect(jsonPath("$.customerName", is("Anand Deshpande")))
            .andExpect(jsonPath("$.canCancel", is(true)))
            .andExpect(jsonPath("$.visitingChargeAmount", is(299.00)));

        // 3. Idempotency Test: Replay same request with same key -> Returns identical 201 response
        mockMvc.perform(post("/api/v1/public/bookings")
                .header("Idempotency-Key", idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.publicReference", is(publicReference)));
    }

    @Test
    @DisplayName("POST /api/v1/public/bookings returns 400 when slotId is missing")
    void shouldReturn400WhenSlotIdMissing() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        CreateBookingRequestDto requestWithoutSlot = new CreateBookingRequestDto(
            "Anand Deshpande",
            "+91 98221 23456",
            service.getId(),
            "45 Shaniwar Peth, Solapur",
            "Problem text",
            LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.FRIDAY)).toString(),
            null, // missing slotId!
            null,
            null
        );

        mockMvc.perform(post("/api/v1/public/bookings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestWithoutSlot))
                .accept(MediaType.APPLICATION_PROBLEM_JSON, MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
            .andExpect(jsonPath("$.invalidParams[0].name", is("slotId")));
    }
}
