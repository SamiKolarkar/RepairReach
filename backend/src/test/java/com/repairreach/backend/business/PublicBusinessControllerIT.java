package com.repairreach.backend.business;

import com.repairreach.backend.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PublicBusinessControllerIT extends BaseIntegrationTest {

    @Test
    @DisplayName("GET /api/v1/public/business returns business profile and operating hours")
    void shouldReturnBusinessProfile() throws Exception {
        mockMvc.perform(get("/api/v1/public/business")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.code", is("SOLAPUR_MAIN")))
            .andExpect(jsonPath("$.city", is("Solapur")))
            .andExpect(jsonPath("$.state", is("Maharashtra")))
            .andExpect(jsonPath("$.phone", notNullValue()))
            .andExpect(jsonPath("$.visitingCharge.amount", is(299.00)))
            .andExpect(jsonPath("$.visitingCharge.currency", is("INR")))
            .andExpect(jsonPath("$.workingHours.weekday", containsString("09:00")))
            .andExpect(jsonPath("$.operatingHours", hasSize(7)))
            .andExpect(jsonPath("$.trustPillars", hasSize(greaterThanOrEqualTo(3))));
    }
}
