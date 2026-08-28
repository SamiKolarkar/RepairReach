package com.repairreach.backend.job.domain;

import com.repairreach.backend.shared.domain.BaseCreatedEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.util.UUID;

@Entity
@Table(name = "job_event")
public class JobEvent extends BaseCreatedEntity {

    @Column(name = "job_id", nullable = false)
    private UUID jobId;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "from_state")
    private JobState fromState;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "to_state", nullable = false)
    private JobState toState;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "actor_type", nullable = false, length = 50)
    private String actorType = "SYSTEM";

    @Column(name = "reason")
    private String reason;

    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata = "{}";

    public UUID getJobId() {
        return jobId;
    }

    public void setJobId(UUID jobId) {
        this.jobId = jobId;
    }

    public JobState getFromState() {
        return fromState;
    }

    public void setFromState(JobState fromState) {
        this.fromState = fromState;
    }

    public JobState getToState() {
        return toState;
    }

    public void setToState(JobState toState) {
        this.toState = toState;
    }

    public UUID getActorId() {
        return actorId;
    }

    public void setActorId(UUID actorId) {
        this.actorId = actorId;
    }

    public String getActorType() {
        return actorType;
    }

    public void setActorType(String actorType) {
        this.actorType = actorType;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }
}
