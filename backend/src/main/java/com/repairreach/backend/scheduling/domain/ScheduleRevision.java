package com.repairreach.backend.scheduling.domain;

import com.repairreach.backend.shared.domain.BaseCreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "schedule_revision")
public class ScheduleRevision extends BaseCreatedEntity {

    @Column(name = "schedule_entry_id", nullable = false)
    private UUID scheduleEntryId;

    @Column(name = "command_name", nullable = false, length = 100)
    private String commandName;

    @Column(name = "old_start_time", nullable = false)
    private OffsetDateTime oldStartTime;

    @Column(name = "old_end_time", nullable = false)
    private OffsetDateTime oldEndTime;

    @Column(name = "new_start_time", nullable = false)
    private OffsetDateTime newStartTime;

    @Column(name = "new_end_time", nullable = false)
    private OffsetDateTime newEndTime;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "actor_type", nullable = false, length = 50)
    private String actorType = "SYSTEM";

    @Column(name = "change_reason")
    private String changeReason;

    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @Column(name = "affected_entries_summary", columnDefinition = "jsonb")
    private String affectedEntriesSummary = "[]";

    public UUID getScheduleEntryId() {
        return scheduleEntryId;
    }

    public void setScheduleEntryId(UUID scheduleEntryId) {
        this.scheduleEntryId = scheduleEntryId;
    }

    public String getCommandName() {
        return commandName;
    }

    public void setCommandName(String commandName) {
        this.commandName = commandName;
    }

    public OffsetDateTime getOldStartTime() {
        return oldStartTime;
    }

    public void setOldStartTime(OffsetDateTime oldStartTime) {
        this.oldStartTime = oldStartTime;
    }

    public OffsetDateTime getOldEndTime() {
        return oldEndTime;
    }

    public void setOldEndTime(OffsetDateTime oldEndTime) {
        this.oldEndTime = oldEndTime;
    }

    public OffsetDateTime getNewStartTime() {
        return newStartTime;
    }

    public void setNewStartTime(OffsetDateTime newStartTime) {
        this.newStartTime = newStartTime;
    }

    public OffsetDateTime getNewEndTime() {
        return newEndTime;
    }

    public void setNewEndTime(OffsetDateTime newEndTime) {
        this.newEndTime = newEndTime;
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

    public String getChangeReason() {
        return changeReason;
    }

    public void setChangeReason(String changeReason) {
        this.changeReason = changeReason;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getAffectedEntriesSummary() {
        return affectedEntriesSummary;
    }

    public void setAffectedEntriesSummary(String affectedEntriesSummary) {
        this.affectedEntriesSummary = affectedEntriesSummary;
    }
}
