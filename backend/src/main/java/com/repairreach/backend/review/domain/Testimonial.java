package com.repairreach.backend.review.domain;

import com.repairreach.backend.shared.domain.BaseAuditableEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.util.UUID;

@Entity
@Table(name = "testimonial")
public class Testimonial extends BaseAuditableEntity {

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "review_text", nullable = false)
    private String reviewText;

    @Column(name = "service_type_display", nullable = false, length = 100)
    private String serviceTypeDisplay;

    @Column(name = "location_display", nullable = false, length = 100)
    private String locationDisplay = "Solapur";

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "provenance", nullable = false)
    private TestimonialProvenance provenance = TestimonialProvenance.MANUAL_CURATED;

    @Column(name = "source_feedback_id")
    private UUID sourceFeedbackId;

    @Column(name = "is_published", nullable = false)
    private Boolean isPublished = false;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    public UUID getBusinessId() {
        return businessId;
    }

    public void setBusinessId(UUID businessId) {
        this.businessId = businessId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getReviewText() {
        return reviewText;
    }

    public void setReviewText(String reviewText) {
        this.reviewText = reviewText;
    }

    public String getServiceTypeDisplay() {
        return serviceTypeDisplay;
    }

    public void setServiceTypeDisplay(String serviceTypeDisplay) {
        this.serviceTypeDisplay = serviceTypeDisplay;
    }

    public String getLocationDisplay() {
        return locationDisplay;
    }

    public void setLocationDisplay(String locationDisplay) {
        this.locationDisplay = locationDisplay;
    }

    public TestimonialProvenance getProvenance() {
        return provenance;
    }

    public void setProvenance(TestimonialProvenance provenance) {
        this.provenance = provenance;
    }

    public UUID getSourceFeedbackId() {
        return sourceFeedbackId;
    }

    public void setSourceFeedbackId(UUID sourceFeedbackId) {
        this.sourceFeedbackId = sourceFeedbackId;
    }

    public Boolean getPublished() {
        return isPublished;
    }

    public void setPublished(Boolean published) {
        isPublished = published;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }
}
