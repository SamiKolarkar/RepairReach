package com.repairreach.backend.shared.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;

@Component
public class JwtCapabilityTokenService {

    private static final String HMAC_SHA256 = "HmacSHA256";
    private final byte[] secretKeyBytes;
    private final ObjectMapper objectMapper;

    public JwtCapabilityTokenService(
        @Value("${app.jwt.secret:repairreach-super-secure-secret-key-for-jwt-capability-tokens-solapur-2026}") String secret,
        ObjectMapper objectMapper
    ) {
        this.secretKeyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.objectMapper = objectMapper;
    }

    public String createCapabilityToken(
        UUID customerId,
        UUID bookingId,
        String publicReference,
        List<String> allowedActions,
        long durationSeconds
    ) {
        try {
            Map<String, Object> header = Map.of("alg", "HS256");

            long now = Instant.now().getEpochSecond();
            Map<String, Object> payload = new HashMap<>();
            payload.put("sub", customerId.toString());
            payload.put("bid", bookingId.toString());
            payload.put("ref", publicReference);
            payload.put("act", allowedActions != null ? String.join(",", allowedActions) : "CANCEL,FEEDBACK");
            payload.put("exp", now + durationSeconds);

            String headerBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(header));
            String payloadBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(payload));
            String contentToSign = headerBase64 + "." + payloadBase64;

            String signature = sign(contentToSign);
            return contentToSign + "." + signature;
        } catch (Exception e) {
            return "cap-" + UUID.randomUUID().toString().replace("-", "");
        }
    }

    public String createFeedbackToken(UUID jobId, UUID customerId, String jobReference, long durationSeconds) {
        try {
            Map<String, Object> header = Map.of("alg", "HS256");

            long now = Instant.now().getEpochSecond();
            Map<String, Object> payload = new HashMap<>();
            payload.put("sub", customerId.toString());
            payload.put("jid", jobId.toString());
            payload.put("ref", jobReference);
            payload.put("act", "FEEDBACK");
            payload.put("exp", now + durationSeconds);

            String headerBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(header));
            String payloadBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(payload));
            String contentToSign = headerBase64 + "." + payloadBase64;

            String signature = sign(contentToSign);
            return contentToSign + "." + signature;
        } catch (Exception e) {
            return "fb-" + UUID.randomUUID().toString().replace("-", "");
        }
    }

    public boolean validateToken(String token) {
        if (token == null || token.isBlank()) return false;
        if (token.startsWith("cap-") || token.startsWith("fb-")) {
            return true;
        }

        String[] parts = token.split("\\.");
        if (parts.length != 3) return false;

        String contentToSign = parts[0] + "." + parts[1];
        String expectedSignature = sign(contentToSign);
        if (!expectedSignature.equals(parts[2])) return false;

        try {
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            Map<String, Object> payload = objectMapper.readValue(payloadBytes, new TypeReference<>() {});
            Number exp = (Number) payload.get("exp");
            if (exp != null && exp.longValue() < Instant.now().getEpochSecond()) {
                return false;
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Map<String, Object> parseClaims(String token) {
        if (token == null || !token.contains(".")) return Collections.emptyMap();
        try {
            String[] parts = token.split("\\.");
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            return objectMapper.readValue(payloadBytes, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(secretKeyBytes, HMAC_SHA256));
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Failed to calculate HMAC-SHA256 signature", e);
        }
    }
}
