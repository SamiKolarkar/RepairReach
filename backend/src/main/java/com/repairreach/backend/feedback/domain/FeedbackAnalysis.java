package com.repairreach.backend.feedback.domain;

import com.repairreach.backend.shared.domain.BaseAuditableEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "feedback_analysis")
public class FeedbackAnalysis extends BaseAuditableEntity {

    @Column(name = "feedback_id", nullable = false)
    private UUID feedbackId;

    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName = "AI_PROVIDER_ABSTRACTION";

    @Column(name = "model_version", length = 50)
    private String modelVersion;

    @Column(name = "prompt_version", length = 50)
    private String promptVersion = "v1";

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "status", nullable = false)
    private FeedbackAnalysisStatus status = FeedbackAnalysisStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "sentiment")
    private Sentiment sentiment;

    @Column(name = "concern_categories", columnDefinition = "jsonb")
    private String concernCategories = "[]";

    @Column(name = "severity_score", precision = 4, scale = 2)
    private BigDecimal severityScore = BigDecimal.ZERO;

    @Column(name = "is_unhappy_customer", nullable = false)
    private Boolean isUnhappyCustomer = false;

    @Column(name = "analysis_summary")
    private String analysisSummary;

    @Column(name = "raw_provider_payload", columnDefinition = "jsonb")
    private String rawProviderPayload;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    public UUID getFeedbackId() {
        return feedbackId;
    }

    public void setFeedbackId(UUID feedbackId) {
        this.feedbackId = feedbackId;
    }

    public String getProviderName() {
        return providerName;
    }

    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public String getPromptVersion() {
        return promptVersion;
    }

    public void setPromptVersion(String promptVersion) {
        this.promptVersion = promptVersion;
    }

    public FeedbackAnalysisStatus getStatus() {
        return status;
    }

    public void setStatus(FeedbackAnalysisStatus status) {
        this.status = status;
    }

    public Sentiment getSentiment() {
        return sentiment;
    }

    public void setSentiment(Sentiment sentiment) {
        this.sentiment = sentiment;
    }

    public String getConcernCategories() {
        return concernCategories;
    }

    public void setConcernCategories(String concernCategories) {
        this.concernCategories = concernCategories;
    }

    public BigDecimal getSeverityScore() {
        return severityScore;
    }

    public void setSeverityScore(BigDecimal severityScore) {
        this.severityScore = severityScore;
    }

    public Boolean getUnhappyCustomer() {
        return isUnhappyCustomer;
    }

    public void setUnhappyCustomer(Boolean unhappyCustomer) {
        isUnhappyCustomer = unhappyCustomer;
    }

    public String getAnalysisSummary() {
        return analysisSummary;
    }

    public void setAnalysisSummary(String analysisSummary) {
        this.analysisSummary = analysisSummary;
    }

    public String getRawProviderPayload() {
        return rawProviderPayload;
    }

    public void setRawProviderPayload(String rawProviderPayload) {
        this.rawProviderPayload = rawProviderPayload;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public Integer getRetryCount() {
        return retryCount;
    }

    public void setRetryCount(Integer retryCount) {
        this.retryCount = retryCount;
    }
}
