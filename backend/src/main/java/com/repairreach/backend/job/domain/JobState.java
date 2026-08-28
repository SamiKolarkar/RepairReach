package com.repairreach.backend.job.domain;

public enum JobState {
    ASSIGNMENT_PENDING,
    ASSIGNED,
    SCHEDULED,
    EN_ROUTE,
    ARRIVED,
    DIAGNOSING,
    DEVICE_TRANSFERRED,
    WORKSHOP_REPAIR,
    COMPLETED,
    UNABLE_TO_SERVE
}
