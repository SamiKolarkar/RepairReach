package com.repairreach.backend.feedback.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.OffsetDateTime;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FeedbackResponseDto(
    UUID feedbackId,
    String status,
    Integer rating,
    String comment,
    OffsetDateTime submittedAt,
    String message,
    String googleReviewUrl
) {}
