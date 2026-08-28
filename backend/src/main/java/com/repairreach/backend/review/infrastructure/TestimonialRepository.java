package com.repairreach.backend.review.infrastructure;

import com.repairreach.backend.review.domain.Testimonial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TestimonialRepository extends JpaRepository<Testimonial, UUID> {
    List<Testimonial> findByBusinessIdAndIsPublishedTrueOrderByDisplayOrderAsc(UUID businessId);
}
