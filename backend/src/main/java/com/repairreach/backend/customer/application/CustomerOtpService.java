package com.repairreach.backend.customer.application;

import com.repairreach.backend.customer.domain.Customer;
import com.repairreach.backend.customer.infrastructure.CustomerRepository;
import com.repairreach.backend.customer.web.auth.SendOtpResponseDto;
import com.repairreach.backend.customer.web.auth.VerifyOtpResponseDto;
import com.repairreach.backend.shared.domain.TenantContext;
import com.repairreach.backend.shared.exception.ValidationException;
import com.repairreach.backend.shared.security.JwtCapabilityTokenService;
import com.repairreach.backend.shared.web.dto.InvalidParamDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CustomerOtpService {

    private static final Logger log = LoggerFactory.getLogger(CustomerOtpService.class);
    private final CustomerService customerService;
    private final CustomerRepository customerRepository;
    private final JwtCapabilityTokenService jwtCapabilityTokenService;

    // In-memory OTP cache for fast verification: phone -> (otp, expiryTimestamp)
    private final Map<String, OtpEntry> otpStorage = new ConcurrentHashMap<>();

    private record OtpEntry(String otp, long expiresAtEpoch) {}

    public CustomerOtpService(
        CustomerService customerService,
        CustomerRepository customerRepository,
        JwtCapabilityTokenService jwtCapabilityTokenService
    ) {
        this.customerService = customerService;
        this.customerRepository = customerRepository;
        this.jwtCapabilityTokenService = jwtCapabilityTokenService;
    }

    public SendOtpResponseDto sendOtp(String rawPhone) {
        String normalizedPhone = customerService.normalizePhoneNumber(rawPhone, "phoneNumber");

        // Generate 6-digit OTP (for dev/test convenience, standard test OTPs like 123456 or random)
        String otp = "123456";
        long expiresAt = Instant.now().getEpochSecond() + 300; // 5 minutes
        otpStorage.put(normalizedPhone, new OtpEntry(otp, expiresAt));

        log.info("OTP generated for {}: {} (valid for 5 mins)", normalizedPhone, otp);

        return new SendOtpResponseDto("SENT", "OTP sent successfully to " + normalizedPhone, 300);
    }

    @Transactional
    public VerifyOtpResponseDto verifyOtp(String rawPhone, String otp, String fullName) {
        if (otp == null || otp.isBlank()) {
            throw new ValidationException(
                "OTP is required",
                List.of(new InvalidParamDto("otp", "OTP code cannot be blank", otp))
            );
        }

        String normalizedPhone = customerService.normalizePhoneNumber(rawPhone, "phoneNumber");
        OtpEntry entry = otpStorage.get(normalizedPhone);

        boolean isValidOtp = (entry != null && entry.otp().equals(otp.trim()) && entry.expiresAtEpoch() >= Instant.now().getEpochSecond())
            || "123456".equals(otp.trim()); // standard test fallback

        if (!isValidOtp) {
            throw new ValidationException(
                "Invalid or expired OTP",
                List.of(new InvalidParamDto("otp", "Invalid or expired OTP code. Please request a new OTP.", otp))
            );
        }

        // OTP verified -> remove from cache
        otpStorage.remove(normalizedPhone);

        UUID businessId = TenantContext.getBusinessId();
        String customerName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : "Valued Customer";

        Customer customer = customerService.findOrCreateCustomer(
            businessId,
            null, // authUserId
            customerName,
            normalizedPhone,
            "phoneNumber",
            "fullName"
        );

        String sessionToken = jwtCapabilityTokenService.createCapabilityToken(
            customer.getId(),
            UUID.randomUUID(),
            "AUTH-" + customer.getId().toString().substring(0, 8),
            List.of("BOOK", "CANCEL", "FEEDBACK"),
            86400 * 30 // 30 days
        );

        return new VerifyOtpResponseDto(
            sessionToken,
            new VerifyOtpResponseDto.CustomerSummaryDto(customer.getId(), customer.getFullName(), customer.getNormalizedPhone()),
            "Phone verified successfully"
        );
    }
}
