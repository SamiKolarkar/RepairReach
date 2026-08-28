package com.repairreach.backend.review.web;

import com.repairreach.backend.review.application.ReviewService;
import com.repairreach.backend.review.web.dto.ReviewsResponseDto;
import com.repairreach.backend.review.web.dto.TestimonialDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public")
public class PublicReviewController {

    private final ReviewService reviewService;

    public PublicReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/testimonials")
    public ResponseEntity<List<TestimonialDto>> getTestimonials(
        @org.springframework.web.bind.annotation.RequestParam(value = "limit", required = false) Integer limit,
        @org.springframework.web.bind.annotation.RequestParam(value = "offset", required = false) Integer offset
    ) {
        List<TestimonialDto> testimonials = reviewService.getTestimonials();
        if (offset != null && offset > 0) {
            if (offset < testimonials.size()) {
                testimonials = testimonials.subList(offset, testimonials.size());
            } else {
                testimonials = List.of();
            }
        }
        if (limit != null && limit >= 0) {
            testimonials = testimonials.stream().limit(limit).toList();
        }
        return ResponseEntity.ok(testimonials);
    }

    @GetMapping("/reviews")
    public ResponseEntity<ReviewsResponseDto> getGoogleReviews() {
        ReviewsResponseDto response = reviewService.getGoogleReviews();
        return ResponseEntity.ok(response);
    }
}
