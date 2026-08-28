package com.repairreach.backend.review.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "review_sync_record",
    uniqueConstraints = @UniqueConstraint(name = "uk_review_sync_provider_external_id", columnNames = {"provider", "external_review_id"})
)
public class ReviewSyncRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "provider", nullable = false, length = 50)
    private String provider = "GOOGLE_REVIEWS";

    @Column(name = "external_review_id", nullable = false)
    private String externalReviewId;

    @Column(name = "author_name", nullable = false)
    private String authorName;

    @Column(name = "author_photo_url")
    private String authorPhotoUrl;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "review_text")
    private String reviewText;

    @Column(name = "review_timestamp", nullable = false)
    private OffsetDateTime reviewTimestamp;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "sync_status", nullable = false)
    private ReviewSyncStatus syncStatus = ReviewSyncStatus.SYNCED;

    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public void setBusinessId(UUID businessId) {
        this.businessId = businessId;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getExternalReviewId() {
        return externalReviewId;
    }

    public void setExternalReviewId(String externalReviewId) {
        this.externalReviewId = externalReviewId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
    }

    public String getAuthorPhotoUrl() {
        return authorPhotoUrl;
    }

    public void setAuthorPhotoUrl(String authorPhotoUrl) {
        this.authorPhotoUrl = authorPhotoUrl;
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

    public OffsetDateTime getReviewTimestamp() {
        return reviewTimestamp;
    }

    public void setReviewTimestamp(OffsetDateTime reviewTimestamp) {
        this.reviewTimestamp = reviewTimestamp;
    }

    public String getContentHash() {
        return contentHash;
    }

    public void setContentHash(String contentHash) {
        this.contentHash = contentHash;
    }

    public ReviewSyncStatus getSyncStatus() {
        return syncStatus;
    }

    public void setSyncStatus(ReviewSyncStatus syncStatus) {
        this.syncStatus = syncStatus;
    }

    public OffsetDateTime getFetchedAt() {
        return fetchedAt;
    }

    public void setFetchedAt(OffsetDateTime fetchedAt) {
        this.fetchedAt = fetchedAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
