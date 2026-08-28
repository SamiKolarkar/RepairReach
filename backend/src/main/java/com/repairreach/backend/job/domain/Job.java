package com.repairreach.backend.job.domain;

import com.repairreach.backend.shared.domain.BaseAuditableEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "job")
public class Job extends BaseAuditableEntity {

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "booking_id", nullable = false, unique = true)
    private UUID bookingId;

    @Column(name = "job_reference", nullable = false, unique = true, length = 64)
    private String jobReference;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "state", nullable = false)
    private JobState state = JobState.ASSIGNMENT_PENDING;

    @Column(name = "planned_start_time", nullable = false)
    private OffsetDateTime plannedStartTime;

    @Column(name = "planned_end_time", nullable = false)
    private OffsetDateTime plannedEndTime;

    @Column(name = "actual_en_route_at")
    private OffsetDateTime actualEnRouteAt;

    @Column(name = "actual_arrived_at")
    private OffsetDateTime actualArrivedAt;

    @Column(name = "actual_started_at")
    private OffsetDateTime actualStartedAt;

    @Column(name = "actual_completed_at")
    private OffsetDateTime actualCompletedAt;

    @Column(name = "completion_notes")
    private String completionNotes;

    @Column(name = "diagnosis_notes")
    private String diagnosisNotes;

    @Column(name = "workshop_notes")
    private String workshopNotes;

    @Column(name = "inability_reason")
    private String inabilityReason;

    @Column(name = "unable_to_serve_at")
    private OffsetDateTime unableToServeAt;

    @Column(name = "feedback_capability_token", unique = true)
    private String feedbackCapabilityToken;

    @Column(name = "feedback_token_expires_at")
    private OffsetDateTime feedbackTokenExpiresAt;

    public UUID getBusinessId() {
        return businessId;
    }

    public void setBusinessId(UUID businessId) {
        this.businessId = businessId;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public void setBookingId(UUID bookingId) {
        this.bookingId = bookingId;
    }

    public String getJobReference() {
        return jobReference;
    }

    public void setJobReference(String jobReference) {
        this.jobReference = jobReference;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public void setCustomerId(UUID customerId) {
        this.customerId = customerId;
    }

    public JobState getState() {
        return state;
    }

    public void setState(JobState state) {
        this.state = state;
    }

    public OffsetDateTime getPlannedStartTime() {
        return plannedStartTime;
    }

    public void setPlannedStartTime(OffsetDateTime plannedStartTime) {
        this.plannedStartTime = plannedStartTime;
    }

    public OffsetDateTime getPlannedEndTime() {
        return plannedEndTime;
    }

    public void setPlannedEndTime(OffsetDateTime plannedEndTime) {
        this.plannedEndTime = plannedEndTime;
    }

    public OffsetDateTime getActualEnRouteAt() {
        return actualEnRouteAt;
    }

    public void setActualEnRouteAt(OffsetDateTime actualEnRouteAt) {
        this.actualEnRouteAt = actualEnRouteAt;
    }

    public OffsetDateTime getActualArrivedAt() {
        return actualArrivedAt;
    }

    public void setActualArrivedAt(OffsetDateTime actualArrivedAt) {
        this.actualArrivedAt = actualArrivedAt;
    }

    public OffsetDateTime getActualStartedAt() {
        return actualStartedAt;
    }

    public void setActualStartedAt(OffsetDateTime actualStartedAt) {
        this.actualStartedAt = actualStartedAt;
    }

    public OffsetDateTime getActualCompletedAt() {
        return actualCompletedAt;
    }

    public void setActualCompletedAt(OffsetDateTime actualCompletedAt) {
        this.actualCompletedAt = actualCompletedAt;
    }

    public String getCompletionNotes() {
        return completionNotes;
    }

    public void setCompletionNotes(String completionNotes) {
        this.completionNotes = completionNotes;
    }

    public String getDiagnosisNotes() {
        return diagnosisNotes;
    }

    public void setDiagnosisNotes(String diagnosisNotes) {
        this.diagnosisNotes = diagnosisNotes;
    }

    public String getWorkshopNotes() {
        return workshopNotes;
    }

    public void setWorkshopNotes(String workshopNotes) {
        this.workshopNotes = workshopNotes;
    }

    public String getInabilityReason() {
        return inabilityReason;
    }

    public void setInabilityReason(String inabilityReason) {
        this.inabilityReason = inabilityReason;
    }

    public OffsetDateTime getUnableToServeAt() {
        return unableToServeAt;
    }

    public void setUnableToServeAt(OffsetDateTime unableToServeAt) {
        this.unableToServeAt = unableToServeAt;
    }

    public String getFeedbackCapabilityToken() {
        return feedbackCapabilityToken;
    }

    public void setFeedbackCapabilityToken(String feedbackCapabilityToken) {
        this.feedbackCapabilityToken = feedbackCapabilityToken;
    }

    public OffsetDateTime getFeedbackTokenExpiresAt() {
        return feedbackTokenExpiresAt;
    }

    public void setFeedbackTokenExpiresAt(OffsetDateTime feedbackTokenExpiresAt) {
        this.feedbackTokenExpiresAt = feedbackTokenExpiresAt;
    }
}
