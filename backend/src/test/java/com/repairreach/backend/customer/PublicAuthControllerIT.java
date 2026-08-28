package com.repairreach.backend.customer;

import com.repairreach.backend.BaseIntegrationTest;
import com.repairreach.backend.customer.web.auth.SendOtpRequestDto;
import com.repairreach.backend.customer.web.auth.VerifyOtpRequestDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicAuthControllerIT extends BaseIntegrationTest {

    @Test
    @DisplayName("POST /api/v1/public/auth/otp/send and verify delivers verified customer JWT token")
    void shouldSendAndVerifyOtp() throws Exception {
        SendOtpRequestDto sendReq = new SendOtpRequestDto("+91 99887 66554");

        // 1. Send OTP
        mockMvc.perform(post("/api/v1/public/auth/otp/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(sendReq))
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status", is("SENT")))
            .andExpect(jsonPath("$.expiresInSeconds", is(300)));

        // 2. Verify OTP
        VerifyOtpRequestDto verifyReq = new VerifyOtpRequestDto(
            "+91 99887 66554",
            "123456",
            "Suresh Raina"
        );

        mockMvc.perform(post("/api/v1/public/auth/otp/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(verifyReq))
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token", notNullValue()))
            .andExpect(jsonPath("$.customer.phoneNumber", is("+919988766554")))
            .andExpect(jsonPath("$.customer.fullName", is("Suresh Raina")));
    }
}
