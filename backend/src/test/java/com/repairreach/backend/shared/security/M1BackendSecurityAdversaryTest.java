package com.repairreach.backend.shared.security;

import com.repairreach.backend.booking.application.BookingService;
import com.repairreach.backend.booking.web.CustomerBookingController;
import com.repairreach.backend.booking.web.dto.BookingConfirmationResponseDto;
import com.repairreach.backend.booking.web.dto.BookingTrackingResponseDto;
import com.repairreach.backend.booking.web.dto.CancelBookingResponseDto;
import com.repairreach.backend.business.application.BusinessService;
import com.repairreach.backend.business.web.PublicBusinessController;
import com.repairreach.backend.business.web.dto.BusinessProfileDto;
import com.repairreach.backend.catalog.application.CatalogService;
import com.repairreach.backend.catalog.web.PublicCatalogController;
import com.repairreach.backend.customer.application.CustomerOtpService;
import com.repairreach.backend.customer.domain.Customer;
import com.repairreach.backend.customer.web.auth.PublicAuthController;
import com.repairreach.backend.customer.web.auth.SendOtpResponseDto;
import com.repairreach.backend.customer.web.auth.VerifyOtpResponseDto;
import com.repairreach.backend.review.application.ReviewService;
import com.repairreach.backend.review.web.PublicReviewController;
import com.repairreach.backend.review.web.dto.ReviewsResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
    CustomerBookingController.class,
    PublicBusinessController.class,
    PublicCatalogController.class,
    PublicAuthController.class,
    PublicReviewController.class
})
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
    "app.firebase.project-id=repairreach-dev",
    "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    "app.cors.allowed-origins=http://localhost:5173,http://localhost:3000"
})
@DisplayName("M1 Backend Security & Token Claims Adversary Test Suite")
public class M1BackendSecurityAdversaryTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private org.springframework.data.jpa.mapping.JpaMetamodelMappingContext jpaMappingContext;

    @MockBean
    private JwtDecoder jwtDecoder;

    @MockBean
    private BookingService bookingService;

    @MockBean
    private BusinessService businessService;

    @MockBean
    private CatalogService catalogService;

    @MockBean
    private CustomerOtpService customerOtpService;

    @MockBean
    private ReviewService reviewService;

    private static final String FIREBASE_PROJECT_ID = "repairreach-dev";
    private static final String VALID_ISSUER = "https://securetoken.google.com/" + FIREBASE_PROJECT_ID;

    private OAuth2TokenValidator<Jwt> tokenValidator;

    @BeforeEach
    void setUp() {
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(VALID_ISSUER);
        OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<List<String>>(
            JwtClaimNames.AUD,
            aud -> aud != null && aud.contains(FIREBASE_PROJECT_ID)
        );
        tokenValidator = new DelegatingOAuth2TokenValidator<>(withIssuer, audienceValidator);

        // When any unauthenticated/unrecognized bearer token is decoded, NimbusJwtDecoder throws BadJwtException
        when(jwtDecoder.decode(anyString())).thenThrow(new BadJwtException("Invalid JWT token"));
    }

    private Jwt createCustomJwt(String issuer, List<String> audiences, Instant issuedAt, Instant expiresAt, Instant notBefore, String subject) {
        Map<String, Object> claims = new java.util.HashMap<>();
        claims.put(JwtClaimNames.ISS, issuer != null ? issuer : "");
        claims.put(JwtClaimNames.AUD, audiences != null ? audiences : Collections.emptyList());
        claims.put(JwtClaimNames.SUB, subject != null ? subject : "");
        claims.put("phone_number", "+919876543210");
        claims.put(JwtClaimNames.IAT, issuedAt);
        claims.put(JwtClaimNames.EXP, expiresAt);
        if (notBefore != null) {
            claims.put(JwtClaimNames.NBF, notBefore);
        }

        return new Jwt(
            "mock-jwt-token-string",
            issuedAt,
            expiresAt,
            Map.of("alg", "RS256", "kid", "google-jwks-key-1"),
            claims
        );
    }

    // =========================================================================
    // SECTION 1: TOKEN CLAIMS ADVERSARIAL STRESS TESTS
    // =========================================================================
    @Nested
    @DisplayName("1. Token Claims Adversarial Stress Tests")
    class TokenClaimsStressTests {

        @Test
        @DisplayName("Valid Token: Canonical Firebase ID token passes validation")
        void shouldAcceptCanonicalFirebaseToken() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(60),
                now.plusSeconds(3600),
                null,
                "pL4x9ZbqW8Y1Nm2K3"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isFalse();
            assertThat(jwt.getSubject()).isEqualTo("pL4x9ZbqW8Y1Nm2K3");
        }

        @Test
        @DisplayName("Forged Issuer: Foreign Firebase Project ID is rejected")
        void shouldRejectForeignFirebaseProjectIssuer() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                "https://securetoken.google.com/malicious-foreign-project",
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(60),
                now.plusSeconds(3600),
                null,
                "attacker-uid-1"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("Forged Issuer: Arbitrary attacker domain is rejected")
        void shouldRejectArbitraryAttackerIssuerDomain() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                "https://evil-attacker.com/repairreach-dev",
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(60),
                now.plusSeconds(3600),
                null,
                "attacker-uid-2"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("Forged Issuer: Google Accounts OAuth issuer is rejected")
        void shouldRejectGoogleAccountsIssuer() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                "https://accounts.google.com",
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(60),
                now.plusSeconds(3600),
                null,
                "attacker-uid-3"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("Forged Issuer: Insecure HTTP scheme is rejected")
        void shouldRejectInsecureHttpIssuer() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                "http://securetoken.google.com/" + FIREBASE_PROJECT_ID,
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(60),
                now.plusSeconds(3600),
                null,
                "attacker-uid-4"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("Legacy Supabase Issuer: Supabase project URL is rejected")
        void shouldRejectLegacySupabaseProjectIssuer() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                "https://solapur-dev.supabase.co/auth/v1",
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(60),
                now.plusSeconds(3600),
                null,
                "legacy-supabase-user"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("Legacy Supabase Issuer: Generic supabase.com issuer is rejected")
        void shouldRejectGenericSupabaseIssuer() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                "https://supabase.com/auth/v1",
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(60),
                now.plusSeconds(3600),
                null,
                "legacy-supabase-user"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("Mismatched Audience: Foreign audience is rejected")
        void shouldRejectMismatchedAudience() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                List.of("unauthorized-foreign-app-id"),
                now.minusSeconds(60),
                now.plusSeconds(3600),
                null,
                "user-aud-mismatch"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("Empty Audience: Empty audience list is rejected")
        void shouldRejectEmptyAudience() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                Collections.emptyList(),
                now.minusSeconds(60),
                now.plusSeconds(3600),
                null,
                "user-empty-aud"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("Multi-Audience: Audience list containing target project is accepted")
        void shouldAcceptMultiAudienceContainingTargetProject() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                List.of(FIREBASE_PROJECT_ID, "partner-service-client"),
                now.minusSeconds(60),
                now.plusSeconds(3600),
                null,
                "multi-aud-user"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isFalse();
        }

        @Test
        @DisplayName("Multi-Audience: Audience list not containing target project is rejected")
        void shouldRejectMultiAudienceNotContainingTargetProject() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                List.of("foreign-app-1", "foreign-app-2"),
                now.minusSeconds(60),
                now.plusSeconds(3600),
                null,
                "multi-aud-foreign-user"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("Expired Token: Token past expiration timestamp (beyond clock skew) is rejected")
        void shouldRejectExpiredToken() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(7200),
                now.minusSeconds(3600),
                null,
                "expired-user"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("Expired Token: Token expired past 60s clock skew window is rejected")
        void shouldRejectTokenExpiredPastClockSkew() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(3600),
                now.minusSeconds(120), // 2 minutes ago (exceeds default 60s clock skew)
                null,
                "recently-expired-user"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("Future Token: Token with future Not-Before (nbf > now + skew) is rejected")
        void shouldRejectFutureNotBeforeToken() {
            Instant now = Instant.now();
            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                List.of(FIREBASE_PROJECT_ID),
                now,
                now.plusSeconds(7200),
                now.plusSeconds(3600), // nbf is 1 hour in future
                "future-user"
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isTrue();
        }

        @Test
        @DisplayName("UID Formats: 28-char standard Firebase alphanumeric UID is preserved")
        void shouldSupportStandard28CharFirebaseUid() {
            Instant now = Instant.now();
            String uid28 = "pL4x9ZbqW8Y1Nm2K3AbCdEfGhIjK";
            assertThat(uid28.length()).isEqualTo(28);

            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(30),
                now.plusSeconds(1800),
                null,
                uid28
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isFalse();
            assertThat(jwt.getSubject()).isEqualTo(uid28);
        }

        @Test
        @DisplayName("UID Formats: 64-char extended alphanumeric UID is preserved")
        void shouldSupport64CharFirebaseUid() {
            Instant now = Instant.now();
            String uid64 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901";
            assertThat(uid64.length()).isEqualTo(64);

            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(30),
                now.plusSeconds(1800),
                null,
                uid64
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isFalse();
            assertThat(jwt.getSubject()).isEqualTo(uid64);
        }

        @Test
        @DisplayName("UID Formats: 128-char maximum schema length UID is preserved")
        void shouldSupport128CharFirebaseUid() {
            Instant now = Instant.now();
            String uid128 = "A".repeat(128);
            assertThat(uid128.length()).isEqualTo(128);

            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(30),
                now.plusSeconds(1800),
                null,
                uid128
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isFalse();
            assertThat(jwt.getSubject()).isEqualTo(uid128);
        }

        @Test
        @DisplayName("UID Formats: Standard UUID formatted string UID is preserved")
        void shouldSupportUuidFormattedStringUid() {
            Instant now = Instant.now();
            String uuidString = "550e8400-e29b-41d4-a716-446655440000";

            Jwt jwt = createCustomJwt(
                VALID_ISSUER,
                List.of(FIREBASE_PROJECT_ID),
                now.minusSeconds(30),
                now.plusSeconds(1800),
                null,
                uuidString
            );

            OAuth2TokenValidatorResult result = tokenValidator.validate(jwt);
            assertThat(result.hasErrors()).isFalse();
            assertThat(jwt.getSubject()).isEqualTo(uuidString);
        }
    }

    // =========================================================================
    // SECTION 2: UNAUTHENTICATED ACCESS ON PROTECTED ENDPOINTS (/api/v1/customer/**)
    // =========================================================================
    @Nested
    @DisplayName("2. Unauthenticated Access Protection on /api/v1/customer/**")
    class ProtectedCustomerEndpointTests {

        @Test
        @DisplayName("Protected: POST /api/v1/customer/bookings without token returns 401 Unauthorized")
        void shouldRejectUnauthenticatedBookingCreation() throws Exception {
            mockMvc.perform(post("/api/v1/customer/bookings")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"serviceId\":\"" + UUID.randomUUID() + "\",\"customerName\":\"Test Customer\",\"customerPhone\":\"+919876543210\",\"locationAddress\":\"Solapur Main Road\",\"problemDescription\":\"AC cooling issue\",\"requestedDate\":\"2026-08-26\",\"slotId\":\"slot-09-10\"}"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Protected: GET /api/v1/customer/bookings/{ref} without token returns 401 Unauthorized")
        void shouldRejectUnauthenticatedBookingTracking() throws Exception {
            mockMvc.perform(get("/api/v1/customer/bookings/RR-260826-ABCDEF")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Protected: POST /api/v1/customer/bookings/{ref}/cancel without token returns 401 Unauthorized")
        void shouldRejectUnauthenticatedBookingCancellation() throws Exception {
            mockMvc.perform(post("/api/v1/customer/bookings/RR-260826-ABCDEF/cancel")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"cancellationReason\":\"Change of plans\"}"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Protected: Arbitrary subpath under /api/v1/customer/** without token returns 401 Unauthorized")
        void shouldRejectUnauthenticatedArbitraryCustomerSubpath() throws Exception {
            mockMvc.perform(get("/api/v1/customer/profile/addresses")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Protected: Malformed Bearer token on /api/v1/customer/bookings returns 401 Unauthorized")
        void shouldRejectMalformedBearerToken() throws Exception {
            mockMvc.perform(get("/api/v1/customer/bookings/RR-260826-ABCDEF")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.jwt.gibberish.token")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Protected: Basic Auth on /api/v1/customer/bookings returns 401 Unauthorized")
        void shouldRejectBasicAuthOnProtectedEndpoint() throws Exception {
            mockMvc.perform(get("/api/v1/customer/bookings/RR-260826-ABCDEF")
                    .header(HttpHeaders.AUTHORIZATION, "Basic dXNlcjpwYXNzd29yZA==")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Protected: Empty Bearer header returns 401 Unauthorized")
        void shouldRejectEmptyBearerHeader() throws Exception {
            mockMvc.perform(get("/api/v1/customer/bookings/RR-260826-ABCDEF")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer ")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // SECTION 3: PUBLIC ENDPOINT ACCESSIBILITY (NO TOKEN REQUIRED)
    // =========================================================================
    @Nested
    @DisplayName("3. Public Endpoint Accessibility (Unauthenticated Access)")
    class PublicEndpointAccessibilityTests {

        @Test
        @DisplayName("Public: GET /api/v1/public/business is accessible without token (returns 200)")
        void shouldAllowPublicBusinessWithoutToken() throws Exception {
            BusinessProfileDto mockProfile = new BusinessProfileDto(
                UUID.randomUUID(),
                "SOLAPUR_MAIN",
                "RepairReach Solapur",
                "RepairReach Solapur",
                "Fast repairs",
                "Description",
                "Solapur",
                "Maharashtra",
                "+919876543210",
                "+919876543210",
                "+919876543210",
                "info@repairreach.com",
                "Main Road",
                "Asia/Kolkata",
                true,
                null,
                null,
                null,
                null,
                null
            );
            when(businessService.getBusinessProfile()).thenReturn(mockProfile);

            mockMvc.perform(get("/api/v1/public/business")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Public: GET /api/v1/public/services is accessible without token (returns 200)")
        void shouldAllowPublicServicesWithoutToken() throws Exception {
            when(catalogService.getPublishedServices()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/public/services")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Public: GET /api/v1/public/testimonials is accessible without token (returns 200)")
        void shouldAllowPublicTestimonialsWithoutToken() throws Exception {
            when(reviewService.getTestimonials()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/public/testimonials")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Public: GET /api/v1/public/reviews is accessible without token (returns 200)")
        void shouldAllowPublicReviewsWithoutToken() throws Exception {
            ReviewsResponseDto mockReviews = new ReviewsResponseDto(
                true,
                4.8,
                120,
                Collections.emptyList()
            );
            when(reviewService.getGoogleReviews()).thenReturn(mockReviews);

            mockMvc.perform(get("/api/v1/public/reviews")
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Public: POST /api/v1/public/auth/otp/send is accessible without token (returns 200)")
        void shouldAllowPublicOtpSendWithoutToken() throws Exception {
            when(customerOtpService.sendOtp("+919876543210"))
                .thenReturn(new SendOtpResponseDto("SUCCESS", "OTP sent successfully", 300));

            mockMvc.perform(post("/api/v1/public/auth/otp/send")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"phoneNumber\":\"+919876543210\"}"))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Public: POST /api/v1/public/auth/otp/verify is accessible without token (returns 200)")
        void shouldAllowPublicOtpVerifyWithoutToken() throws Exception {
            when(customerOtpService.verifyOtp("+919876543210", "123456", "Solapur User"))
                .thenReturn(new VerifyOtpResponseDto("mock-capability-token", new VerifyOtpResponseDto.CustomerSummaryDto(UUID.randomUUID(), "Solapur User", "+919876543210"), "OTP verified successfully"));

            mockMvc.perform(post("/api/v1/public/auth/otp/verify")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"phoneNumber\":\"+919876543210\",\"otp\":\"123456\",\"fullName\":\"Solapur User\"}"))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("CORS Preflight: OPTIONS on /api/v1/public/services returns 200 and CORS headers")
        void shouldAllowCorsPreflightOnPublicEndpoint() throws Exception {
            mockMvc.perform(options("/api/v1/public/services")
                    .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                    .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
        }

        @Test
        @DisplayName("CORS Preflight: OPTIONS on /api/v1/customer/bookings returns 200 without authentication")
        void shouldAllowCorsPreflightOnProtectedCustomerEndpoint() throws Exception {
            mockMvc.perform(options("/api/v1/customer/bookings")
                    .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                    .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                    .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Content-Type,Authorization,Idempotency-Key"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
        }
    }

    // =========================================================================
    // SECTION 4: AUTHENTICATED ACCESS ON PROTECTED ENDPOINTS WITH FIREBASE JWT
    // =========================================================================
    @Nested
    @DisplayName("4. Authenticated Access with Valid Firebase JWT")
    class AuthenticatedEndpointAccessTests {

        @Test
        @DisplayName("Authenticated: POST /api/v1/customer/bookings with valid Firebase JWT reaches controller")
        void shouldAllowAuthenticatedBookingCreation() throws Exception {
            String firebaseUid = "pL4x9ZbqW8Y1Nm2K3";
            UUID bookingId = UUID.randomUUID();
            UUID serviceId = UUID.randomUUID();

            BookingConfirmationResponseDto mockResponse = new BookingConfirmationResponseDto(
                "RR-260826-XYZ123",
                bookingId,
                "CONFIRMED",
                "Solapur Customer",
                "+919876543210",
                serviceId,
                "AC Deep Cleaning",
                "123 Main Road, Solapur",
                "123 Main Road, Solapur",
                "AC not cooling",
                "2026-08-26",
                "09:00:00",
                "10:00:00",
                null,
                null,
                null,
                null,
                null,
                "SCHEDULED",
                new BigDecimal("299.00"),
                OffsetDateTime.now()
            );

            when(bookingService.createBooking(any(), any(), eq(firebaseUid))).thenReturn(mockResponse);

            mockMvc.perform(post("/api/v1/customer/bookings")
                    .with(jwt().jwt(b -> b
                        .subject(firebaseUid)
                        .issuer(VALID_ISSUER)
                        .audience(List.of(FIREBASE_PROJECT_ID))
                        .claim("phone_number", "+919876543210")
                    ))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"serviceId\":\"" + serviceId + "\",\"customerName\":\"Solapur Customer\",\"customerPhone\":\"+919876543210\",\"locationAddress\":\"123 Main Road, Solapur\",\"problemDescription\":\"AC not cooling\",\"requestedDate\":\"2026-08-26\",\"slotId\":\"slot-09-10\"}"))
                .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("Authenticated: GET /api/v1/customer/bookings/{ref} with valid Firebase JWT returns 200")
        void shouldAllowAuthenticatedBookingTracking() throws Exception {
            String firebaseUid = "1A2b3C4d5E6F7g8H9I0JkLmNoPqR";
            String publicRef = "RR-260826-XYZ123";

            BookingTrackingResponseDto mockTracking = new BookingTrackingResponseDto(
                publicRef,
                UUID.randomUUID(),
                "CONFIRMED",
                "CONFIRMED",
                "SCHEDULED",
                "Solapur Customer",
                "+919876543210",
                "AC Repair",
                "Solapur Address",
                "Solapur Address",
                "AC Issue",
                "2026-08-26",
                "09:00:00",
                "10:00:00",
                "09:00 AM - 10:00 AM",
                null,
                null,
                null,
                null,
                true,
                true,
                new BigDecimal("299.00"),
                null,
                OffsetDateTime.now(),
                OffsetDateTime.now()
            );

            when(bookingService.getBookingTracking(publicRef)).thenReturn(mockTracking);

            mockMvc.perform(get("/api/v1/customer/bookings/" + publicRef)
                    .with(jwt().jwt(b -> b
                        .subject(firebaseUid)
                        .issuer(VALID_ISSUER)
                        .audience(List.of(FIREBASE_PROJECT_ID))
                    ))
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Authenticated: POST /api/v1/customer/bookings/{ref}/cancel with valid Firebase JWT returns 200")
        void shouldAllowAuthenticatedBookingCancellation() throws Exception {
            String firebaseUid = "pL4x9ZbqW8Y1Nm2K3";
            String publicRef = "RR-260826-XYZ123";

            CancelBookingResponseDto mockCancel = new CancelBookingResponseDto(
                publicRef,
                "CANCELLED",
                "PRE_ARRIVAL_NO_VISIT_CHARGE",
                "PRE_ARRIVAL_NO_VISIT_CHARGE",
                false,
                BigDecimal.ZERO,
                OffsetDateTime.now(),
                "Booking successfully cancelled."
            );

            when(bookingService.cancelBooking(eq(publicRef), any(), any())).thenReturn(mockCancel);

            mockMvc.perform(post("/api/v1/customer/bookings/" + publicRef + "/cancel")
                    .with(jwt().jwt(b -> b
                        .subject(firebaseUid)
                        .issuer(VALID_ISSUER)
                        .audience(List.of(FIREBASE_PROJECT_ID))
                    ))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"cancellationReason\":\"Customer changed mind\"}"))
                .andExpect(status().isOk());
        }
    }

    // =========================================================================
    // SECTION 5: DOMAIN & SCHEMA STRING UID INVARIANT CHECKS
    // =========================================================================
    @Nested
    @DisplayName("5. Domain Entity & Schema String UID Invariant Checks")
    class DomainStringUidInvariantTests {

        @Test
        @DisplayName("Customer Entity: authUserId field is String with length 128")
        void shouldHaveStringAuthUserIdInCustomerEntity() throws Exception {
            Customer customer = new Customer();
            String uid = "pL4x9ZbqW8Y1Nm2K3AbCdEfGhIj";
            customer.setAuthUserId(uid);

            assertThat(customer.getAuthUserId()).isEqualTo(uid);
            assertThat(customer.getAuthUserId()).isInstanceOf(String.class);

            // Verify @Column length via reflection
            jakarta.persistence.Column columnAnnotation = Customer.class
                .getDeclaredField("authUserId")
                .getAnnotation(jakarta.persistence.Column.class);

            assertThat(columnAnnotation).isNotNull();
            assertThat(columnAnnotation.length()).isEqualTo(128);
            assertThat(columnAnnotation.name()).isEqualTo("auth_user_id");
            assertThat(columnAnnotation.unique()).isTrue();
        }
    }
}
