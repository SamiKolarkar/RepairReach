package com.repairreach.backend.feedback.domain;

import com.repairreach.backend.shared.domain.BaseAuditableEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "escalation")
public class Escalation extends BaseAuditableEntity {

    @Column(name = "feedback_id", nullable = false)
    private UUID feedbackId;

    @Column(name = "job_id", nullable = false)
    private UUID jobId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "status", nullable = false)
    private EscalationStatus status = EscalationStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "priority", nullable = false)
    private EscalationPriority priority = EscalationPriority.MEDIUM;

    @Column(name = "trigger_source", nullable = false, length = 50)
    private String triggerSource = "AI_ANALYSIS";

    @Column(name = "assigned_to_user_id")
    private UUID assignedToUserId;

    @Column(name = "owner_notes")
    private String ownerNotes;

    @Column(name = "resolution_summary")
    private String resolutionSummary;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    public UUID getFeedbackId() {
        return feedbackId;
    }

    public void setFeedbackId(UUID feedbackId) {
        this.feedbackId = feedbackId;
    }

    public UUID getJobId() {
        return jobId;
    }

    public void setJobId(UUID jobId) {
        this.jobId = jobId;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public void setCustomerId(UUID customerId) {
        this.customerId = customerId;
    }

    public EscalationStatus getStatus() {
        return status;
    }

    public void setStatus(EscalationStatus status) {
        this.status = status;
    }

    public EscalationPriority getPriority() {
        return priority;
    }

    public void setPriority(EscalationPriority priority) {
        this.priority = priority;
    }

    public String getTriggerSource() {
        return triggerSource;
    }

    public void setTriggerSource(String triggerSource) {
        this.triggerSource = triggerSource;
    }

    public UUID getAssignedToUserId() {
        return assignedToUserId;
    }

    public void setAssignedToUserId(UUID assignedToUserId) {
        this.assignedToUserId = assignedToUserId;
    }

    public String getOwnerNotes() {
        return ownerNotes;
    }

    public void setOwnerNotes(String ownerNotes) {
        this.ownerNotes = ownerNotes;
    }

    public String getResolutionSummary() {
        return resolutionSummary;
    }

    public void setResolutionSummary(String resolutionSummary) {
        this.resolutionSummary = resolutionSummary;
    }

    public OffsetDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(OffsetDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }
}
