package com.repairreach.backend.review.application;

import com.repairreach.backend.review.domain.Testimonial;
import com.repairreach.backend.review.infrastructure.ReviewSyncRecordRepository;
import com.repairreach.backend.review.infrastructure.TestimonialRepository;
import com.repairreach.backend.review.web.dto.ReviewsResponseDto;
import com.repairreach.backend.review.web.dto.TestimonialDto;
import com.repairreach.backend.shared.domain.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ReviewService {

    private final TestimonialRepository testimonialRepository;
    private final ReviewSyncRecordRepository reviewSyncRecordRepository;

    public ReviewService(
        TestimonialRepository testimonialRepository,
        ReviewSyncRecordRepository reviewSyncRecordRepository
    ) {
        this.testimonialRepository = testimonialRepository;
        this.reviewSyncRecordRepository = reviewSyncRecordRepository;
    }

    public List<TestimonialDto> getTestimonials() {
        UUID businessId = TenantContext.getBusinessId();
        List<Testimonial> testimonials = testimonialRepository.findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(businessId);

        return testimonials.stream()
            .map(t -> new TestimonialDto(
                t.getId(),
                t.getCustomerName(),
                t.getRating(),
                t.getReviewText(),
                t.getReviewText(),
                t.getServiceTypeDisplay(),
                t.getServiceTypeDisplay(),
                t.getLocationDisplay(),
                t.getLocationDisplay(),
                t.getProvenance().name(),
                t.getDisplayOrder(),
                t.getCreatedAt() != null ? t.getCreatedAt().toLocalDate().toString() : "2026-08-10"
            ))
            .toList();
    }

    public ReviewsResponseDto getGoogleReviews() {
        // Google reviews integration adapter: returns explicit unconfigured state if no external provider connected
        return new ReviewsResponseDto(
            false,
            null,
            0,
            Collections.emptyList()
        );
    }
}
