package com.repairreach.backend.shared.security;

import com.repairreach.backend.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityConfigIT extends BaseIntegrationTest {

    @Test
    @DisplayName("Security: Public business endpoint should be accessible without authentication")
    void shouldAllowPublicEndpointWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/v1/public/business")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Security: Actuator health probe should be accessible without authentication")
    void shouldAllowActuatorHealthWithoutAuth() throws Exception {
        mockMvc.perform(get("/actuator/health")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Security: CORS preflight OPTIONS request should be permitted with proper headers")
    void shouldAllowCorsPreflightRequest() throws Exception {
        mockMvc.perform(options("/api/v1/public/bookings")
                .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Content-Type,Idempotency-Key"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
    }

    @Test
    @DisplayName("Security: Non-public routes should reject unauthenticated requests with 401 Unauthorized")
    void shouldRejectProtectedEndpointWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard")
                .accept(MediaType.APPLICATION_PROBLEM_JSON, MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Security: Non-public routes should accept valid Firebase OAuth2 JWT tokens with string UID")
    void shouldAcceptProtectedEndpointWithValidJwt() throws Exception {
        // Even if no controller exists at /api/v1/admin/dashboard, authentication passes (resulting in 404 instead of 401)
        mockMvc.perform(get("/api/v1/admin/dashboard")
                .with(jwt().jwt(builder -> builder
                    .subject("firebase-user-uid-abc-12345")
                    .issuer("https://securetoken.google.com/repairreach-dev")
                    .audience(List.of("repairreach-dev"))
                    .claim("phone_number", "+919876543210")
                ))
                .accept(MediaType.APPLICATION_PROBLEM_JSON, MediaType.APPLICATION_JSON))
            .andExpect(status().isNotFound()); // 404 indicates authenticated through filter chain, not 401
    }
}
