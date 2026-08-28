package com.repairreach.backend.review.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TestimonialDto(
    UUID id,
    String customerName,
    Integer rating,
    String comment,
    String reviewText,
    String serviceName,
    String serviceType,
    String location,
    String locationDisplay,
    String source,
    Integer displayOrder,
    String date
) {}
