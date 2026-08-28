package com.repairreach.backend.catalog;

import com.repairreach.backend.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PublicCatalogControllerIT extends BaseIntegrationTest {

    @Test
    @DisplayName("GET /api/v1/public/services returns published services excluding mobile phones")
    void shouldReturnPublishedServices() throws Exception {
        mockMvc.perform(get("/api/v1/public/services")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$", hasSize(5)))
            .andExpect(jsonPath("$[*].code", hasItems(
                "WASHING_MACHINE_REPAIR",
                "REFRIGERATOR_REPAIR",
                "MICROWAVE_REPAIR",
                "AC_REPAIR",
                "TV_REPAIR"
            )))
            .andExpect(jsonPath("$[*].code", not(hasItem(containsStringIgnoringCase("MOBILE")))))
            .andExpect(jsonPath("$[*].name", not(hasItem(containsStringIgnoringCase("SMARTPHONE")))))
            .andExpect(jsonPath("$[0].baseVisitingCharge", is(299.00)));
    }
}
