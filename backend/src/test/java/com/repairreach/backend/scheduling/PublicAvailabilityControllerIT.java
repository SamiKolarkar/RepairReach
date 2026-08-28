package com.repairreach.backend.scheduling;

import com.repairreach.backend.BaseIntegrationTest;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PublicAvailabilityControllerIT extends BaseIntegrationTest {

    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;

    @Test
    @DisplayName("GET /api/v1/public/availability/slots returns available slots for valid service and weekday")
    void shouldReturnSlotsForValidService() throws Exception {
        ServiceOffering service = serviceOfferingRepository
            .findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(TenantContext.DEFAULT_SOLAPUR_BUSINESS_ID)
            .getFirst();

        LocalDate nextMonday = LocalDate.now().plusDays(2).with(TemporalAdjusters.next(DayOfWeek.MONDAY));

        mockMvc.perform(get("/api/v1/public/availability/slots")
                .param("serviceId", service.getId().toString())
                .param("date", nextMonday.toString())
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.date", is(nextMonday.toString())))
            .andExpect(jsonPath("$.serviceId", is(service.getId().toString())))
            .andExpect(jsonPath("$.slots", hasSize(greaterThanOrEqualTo(5))))
            .andExpect(jsonPath("$.slots[*].available", everyItem(is(true))));
    }

    @Test
    @DisplayName("GET /api/v1/public/availability/slots returns 400 when serviceId or date is missing")
    void shouldReturn400WhenParamsMissing() throws Exception {
        mockMvc.perform(get("/api/v1/public/availability/slots")
                .accept(MediaType.APPLICATION_PROBLEM_JSON, MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
            .andExpect(jsonPath("$.invalidParams", not(empty())));
    }

    @Test
    @DisplayName("GET /api/v1/public/availability/slots returns 400 on malformed date")
    void shouldReturn400OnMalformedDate() throws Exception {
        UUID randomServiceId = UUID.randomUUID();

        mockMvc.perform(get("/api/v1/public/availability/slots")
                .param("serviceId", randomServiceId.toString())
                .param("date", "2026/13/45")
                .accept(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
            .andExpect(jsonPath("$.invalidParams[0].name", is("date")));
    }
}
