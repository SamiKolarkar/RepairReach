package com.repairreach.backend.review.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReviewsResponseDto(
    boolean configured,
    Double averageRating,
    Integer totalReviewCount,
    List<GoogleReviewItemDto> reviews
) {}
