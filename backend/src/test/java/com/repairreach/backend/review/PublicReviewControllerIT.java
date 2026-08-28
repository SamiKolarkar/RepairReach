package com.repairreach.backend.review;

import com.repairreach.backend.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PublicReviewControllerIT extends BaseIntegrationTest {

    @Test
    @DisplayName("GET /api/v1/public/testimonials returns curated published testimonials")
    void shouldReturnTestimonials() throws Exception {
        mockMvc.perform(get("/api/v1/public/testimonials")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$[0].customerName", notNullValue()))
            .andExpect(jsonPath("$[0].rating", greaterThanOrEqualTo(4)))
            .andExpect(jsonPath("$[0].reviewText", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/v1/public/reviews returns explicit unconfigured empty state")
    void shouldReturnUnconfiguredReviewsState() throws Exception {
        mockMvc.perform(get("/api/v1/public/reviews")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.configured", is(false)))
            .andExpect(jsonPath("$.totalReviewCount", is(0)))
            .andExpect(jsonPath("$.reviews", hasSize(0)));
    }
}
