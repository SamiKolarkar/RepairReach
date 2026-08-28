package com.repairreach.backend.shared.security;

import com.repairreach.backend.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Adversarial Security & Configuration Challenger Tests")
class AdversarialSecurityChallengerTest extends BaseIntegrationTest {

    @Autowired
    private Environment environment;

    @Autowired(required = false)
    private JwtDecoder jwtDecoder;

    @Nested
    @DisplayName("1. Public Endpoint & Actuator Accessibility (Unauthenticated)")
    class PublicEndpointAccessibility {

        @Test
        @DisplayName("Public: /api/v1/public/services is publicly accessible without token")
        void shouldAllowPublicServicesEndpoint() throws Exception {
            mockMvc.perform(get("/api/v1/public/services")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Public: /api/v1/public/business is publicly accessible without token")
        void shouldAllowPublicBusinessEndpoint() throws Exception {
            mockMvc.perform(get("/api/v1/public/business")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Public: /api/v1/public/testimonials is publicly accessible without token")
        void shouldAllowPublicTestimonialsEndpoint() throws Exception {
            mockMvc.perform(get("/api/v1/public/testimonials")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Public: /api/v1/public/reviews is publicly accessible without token")
        void shouldAllowPublicReviewsEndpoint() throws Exception {
            mockMvc.perform(get("/api/v1/public/reviews")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Actuator: /actuator/health is publicly accessible without token")
        void shouldAllowActuatorHealth() throws Exception {
            mockMvc.perform(get("/actuator/health")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Actuator: /actuator/info is publicly accessible without token")
        void shouldAllowActuatorInfo() throws Exception {
            mockMvc.perform(get("/actuator/info")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("2. Protected Endpoint Security (Authentication Required)")
    class ProtectedEndpointSecurity {

        @Test
        @DisplayName("Protected: /api/v1/admin/dashboard rejects unauthenticated requests with 401")
        void shouldRejectUnauthenticatedAdminEndpoint() throws Exception {
            mockMvc.perform(get("/api/v1/admin/dashboard")
                    .accept(MediaType.APPLICATION_JSON, MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Protected: /api/v1/technicians rejects unauthenticated requests with 401")
        void shouldRejectUnauthenticatedTechniciansEndpoint() throws Exception {
            mockMvc.perform(get("/api/v1/technicians")
                    .accept(MediaType.APPLICATION_JSON, MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Protected: /api/v1/customers/profile rejects unauthenticated POST with 401")
        void shouldRejectUnauthenticatedCustomersPost() throws Exception {
            mockMvc.perform(post("/api/v1/customers/profile")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\": \"test\"}"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Protected: Request with malformed Bearer token is rejected with 401")
        void shouldRejectMalformedBearerToken() throws Exception {
            mockMvc.perform(get("/api/v1/admin/dashboard")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.jwt.token.payload")
                    .accept(MediaType.APPLICATION_JSON, MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Protected: Request with valid OAuth2 JWT passes authentication filter")
        void shouldAllowAuthenticatedOAuth2Jwt() throws Exception {
            mockMvc.perform(get("/api/v1/admin/dashboard")
                    .with(jwt().jwt(b -> b.subject("user-uuid-12345").claim("email", "test@repairreach.com")))
                    .accept(MediaType.APPLICATION_JSON, MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(status().isNotFound()); // 404 indicates authenticated through security filter chain
        }
    }

    @Nested
    @DisplayName("3. CORS & Preflight Enforcement")
    class CorsEnforcement {

        @Test
        @DisplayName("CORS: OPTIONS preflight request to public endpoint succeeds with CORS headers")
        void shouldAllowPublicOptionsPreflight() throws Exception {
            mockMvc.perform(options("/api/v1/public/services")
                    .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                    .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
        }

        @Test
        @DisplayName("CORS: OPTIONS preflight request to protected endpoint succeeds without auth")
        void shouldAllowProtectedOptionsPreflightWithoutAuth() throws Exception {
            mockMvc.perform(options("/api/v1/admin/dashboard")
                    .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                    .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                    .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Content-Type,Authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
        }
    }

    @Nested
    @DisplayName("4. OAuth2 & Bean Configuration Verification")
    class BeanConfigurationVerification {

        @Test
        @DisplayName("Beans: JwtDecoder bean is registered in ApplicationContext")
        void shouldHaveJwtDecoderBean() {
            assertThat(jwtDecoder).isNotNull();
        }

        @Test
        @DisplayName("Config: Verify active profiles and environment properties")
        void shouldVerifyActiveProfile() {
            assertThat(environment.getActiveProfiles()).contains("test");
        }
    }
}
