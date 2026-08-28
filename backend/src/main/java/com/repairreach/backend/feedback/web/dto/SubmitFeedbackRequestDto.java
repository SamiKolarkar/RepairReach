package com.repairreach.backend.feedback.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SubmitFeedbackRequestDto(
    Integer rating,
    String comment,
    String feedbackToken
) {}
