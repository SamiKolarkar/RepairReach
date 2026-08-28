package com.repairreach.backend.customer.web.auth;

import com.repairreach.backend.customer.application.CustomerOtpService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/auth")
public class PublicAuthController {

    private final CustomerOtpService customerOtpService;

    public PublicAuthController(CustomerOtpService customerOtpService) {
        this.customerOtpService = customerOtpService;
    }

    @PostMapping("/otp/send")
    public ResponseEntity<SendOtpResponseDto> sendOtp(@RequestBody SendOtpRequestDto request) {
        SendOtpResponseDto response = customerOtpService.sendOtp(request.phoneNumber());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<VerifyOtpResponseDto> verifyOtp(@RequestBody VerifyOtpRequestDto request) {
        VerifyOtpResponseDto response = customerOtpService.verifyOtp(
            request.phoneNumber(),
            request.otp(),
            request.fullName()
        );
        return ResponseEntity.ok(response);
    }
}
