package com.repairreach.backend.shared.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Firebase Token Validation Unit Tests")
class FirebaseTokenValidationTest {

    private static final String FIREBASE_PROJECT_ID = "repairreach-dev";
    private static final String VALID_ISSUER = "https://securetoken.google.com/" + FIREBASE_PROJECT_ID;

    private OAuth2TokenValidator<Jwt> validator;

    @BeforeEach
    void setUp() {
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(VALID_ISSUER);
        OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<List<String>>(
            JwtClaimNames.AUD,
            aud -> aud != null && aud.contains(FIREBASE_PROJECT_ID)
        );
        validator = new DelegatingOAuth2TokenValidator<>(withIssuer, audienceValidator);
    }

    private Jwt createTestJwt(String issuer, List<String> audiences, Instant issuedAt, Instant expiresAt, String subject) {
        return new Jwt(
            "test-token-value",
            issuedAt,
            expiresAt,
            Map.of("alg", "RS256", "kid", "google-cert-key-1"),
            Map.of(
                JwtClaimNames.ISS, issuer,
                JwtClaimNames.AUD, audiences != null ? audiences : Collections.emptyList(),
                JwtClaimNames.SUB, subject,
                "phone_number", "+919876543210",
                JwtClaimNames.IAT, issuedAt,
                JwtClaimNames.EXP, expiresAt
            )
        );
    }

    @Test
    @DisplayName("Valid Firebase ID Token: Correct issuer, audience, and timestamps pass validation")
    void shouldAcceptValidFirebaseToken() {
        Instant now = Instant.now();
        Jwt jwt = createTestJwt(
            VALID_ISSUER,
            List.of(FIREBASE_PROJECT_ID),
            now.minusSeconds(60),
            now.plusSeconds(3600),
            "pL4x9ZbqW8Y1Nm2K3"
        );

        OAuth2TokenValidatorResult result = validator.validate(jwt);
        assertThat(result.hasErrors()).isFalse();
        assertThat(jwt.getSubject()).isEqualTo("pL4x9ZbqW8Y1Nm2K3");
    }

    @Test
    @DisplayName("Invalid Issuer: Token issued by different Firebase project is rejected")
    void shouldRejectTokenWithInvalidIssuer() {
        Instant now = Instant.now();
        Jwt jwt = createTestJwt(
            "https://securetoken.google.com/foreign-project-id",
            List.of(FIREBASE_PROJECT_ID),
            now.minusSeconds(60),
            now.plusSeconds(3600),
            "user-123"
        );

        OAuth2TokenValidatorResult result = validator.validate(jwt);
        assertThat(result.hasErrors()).isTrue();
    }

    @Test
    @DisplayName("Invalid Issuer: Token issued by legacy Supabase is rejected")
    void shouldRejectTokenWithLegacySupabaseIssuer() {
        Instant now = Instant.now();
        Jwt jwt = createTestJwt(
            "https://solapur.supabase.co/auth/v1",
            List.of(FIREBASE_PROJECT_ID),
            now.minusSeconds(60),
            now.plusSeconds(3600),
            "user-123"
        );

        OAuth2TokenValidatorResult result = validator.validate(jwt);
        assertThat(result.hasErrors()).isTrue();
    }

    @Test
    @DisplayName("Invalid Audience: Token with mismatched project ID in audience is rejected")
    void shouldRejectTokenWithInvalidAudience() {
        Instant now = Instant.now();
        Jwt jwt = createTestJwt(
            VALID_ISSUER,
            List.of("unauthorized-foreign-project"),
            now.minusSeconds(60),
            now.plusSeconds(3600),
            "user-123"
        );

        OAuth2TokenValidatorResult result = validator.validate(jwt);
        assertThat(result.hasErrors()).isTrue();
    }

    @Test
    @DisplayName("Empty Audience: Token with empty audience is rejected")
    void shouldRejectTokenWithEmptyAudience() {
        Instant now = Instant.now();
        Jwt jwt = createTestJwt(
            VALID_ISSUER,
            Collections.emptyList(),
            now.minusSeconds(60),
            now.plusSeconds(3600),
            "user-123"
        );

        OAuth2TokenValidatorResult result = validator.validate(jwt);
        assertThat(result.hasErrors()).isTrue();
    }

    @Test
    @DisplayName("Expired Token: Token past expiration timestamp is rejected")
    void shouldRejectExpiredToken() {
        Instant now = Instant.now();
        Jwt jwt = createTestJwt(
            VALID_ISSUER,
            List.of(FIREBASE_PROJECT_ID),
            now.minusSeconds(7200),
            now.minusSeconds(3600),
            "user-123"
        );

        OAuth2TokenValidatorResult result = validator.validate(jwt);
        assertThat(result.hasErrors()).isTrue();
    }

    @Test
    @DisplayName("Firebase UID Format: String UID (alphanumeric non-UUID) is preserved without parsing error")
    void shouldSupportAlphanumericFirebaseUid() {
        Instant now = Instant.now();
        String firebaseUid = "1A2b3C4d5E6F7g8H9I0JkLmNoPqR";
        Jwt jwt = createTestJwt(
            VALID_ISSUER,
            List.of(FIREBASE_PROJECT_ID),
            now.minusSeconds(30),
            now.plusSeconds(1800),
            firebaseUid
        );

        OAuth2TokenValidatorResult result = validator.validate(jwt);
        assertThat(result.hasErrors()).isFalse();
        assertThat(jwt.getSubject()).isEqualTo(firebaseUid);
    }
}
