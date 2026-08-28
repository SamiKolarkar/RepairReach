/// Lifecycle statuses for technician jobs.
enum JobStatus {
  accepted,
  pending,
  inProgress,
  scheduled,
  completed,
  unableToServe,
  onHold,
  cancelled;

  String get displayName {
    switch (this) {
      case JobStatus.accepted:
        return 'ACCEPTED';
      case JobStatus.pending:
        return 'PENDING';
      case JobStatus.inProgress:
        return 'IN PROGRESS';
      case JobStatus.scheduled:
        return 'SCHEDULED';
      case JobStatus.completed:
        return 'COMPLETED';
      case JobStatus.unableToServe:
        return 'UNABLE TO SERVE';
      case JobStatus.onHold:
        return 'ON HOLD';
      case JobStatus.cancelled:
        return 'CANCELLED';
    }
  }
}

/// Service categories representing trade domains.
enum ServiceCategory {
  hvac,
  plumbing,
  electrical,
  appliance;

  String get displayName {
    switch (this) {
      case ServiceCategory.hvac:
        return 'HVAC';
      case ServiceCategory.plumbing:
        return 'Plumbing';
      case ServiceCategory.electrical:
        return 'Electrical';
      case ServiceCategory.appliance:
        return 'Appliance';
    }
  }
}
