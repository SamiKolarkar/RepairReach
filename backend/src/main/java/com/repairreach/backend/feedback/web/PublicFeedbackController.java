package com.repairreach.backend.feedback.web;

import com.repairreach.backend.feedback.application.FeedbackService;
import com.repairreach.backend.feedback.web.dto.FeedbackResponseDto;
import com.repairreach.backend.feedback.web.dto.SubmitFeedbackRequestDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/public/jobs")
public class PublicFeedbackController {

    private final FeedbackService feedbackService;

    public PublicFeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping("/{jobReference}/feedback")
    public ResponseEntity<FeedbackResponseDto> submitFeedback(
        @PathVariable("jobReference") String jobReference,
        @RequestBody SubmitFeedbackRequestDto request,
        @RequestHeader(value = "X-Feedback-Token", required = false) String tokenHeader,
        HttpServletRequest httpRequest
    ) {
        String clientIp = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");

        FeedbackResponseDto response = feedbackService.submitFeedback(
            jobReference,
            request,
            tokenHeader,
            clientIp,
            userAgent
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
