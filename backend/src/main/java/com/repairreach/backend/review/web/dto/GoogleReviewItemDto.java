package com.repairreach.backend.review.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GoogleReviewItemDto(
    String authorName,
    Integer rating,
    String reviewText,
    String reviewDate,
    String authorPhotoUrl
) {}
