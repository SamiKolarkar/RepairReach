import 'package:equatable/equatable.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/job_status.dart';

/// Pure domain entity representing a scheduled job item in the timeline.
class ScheduleEntryEntity extends Equatable {
  final String id;
  final String customerName;
  final String customerAddress;
  final String timeHour;
  final String timePeriod;
  final JobStatus status;
  final String serviceTitle;
  final DateTime date;
  final String sectionGroup;

  const ScheduleEntryEntity({
    required this.id,
    required this.customerName,
    required this.customerAddress,
    required this.timeHour,
    required this.timePeriod,
    required this.status,
    required this.serviceTitle,
    required this.date,
    required this.sectionGroup,
  });

  @override
  List<Object?> get props => [
        id,
        customerName,
        customerAddress,
        timeHour,
        timePeriod,
        status,
        serviceTitle,
        date,
        sectionGroup,
      ];
}

/// Pure domain entity representing an upcoming summary row item.
class UpcomingScheduleEntity extends Equatable {
  final String id;
  final String day;
  final String month;
  final String customerName;
  final String serviceDetail;
  final DateTime date;

  const UpcomingScheduleEntity({
    required this.id,
    required this.day,
    required this.month,
    required this.customerName,
    required this.serviceDetail,
    required this.date,
  });

  @override
  List<Object?> get props => [
        id,
        day,
        month,
        customerName,
        serviceDetail,
        date,
      ];
}
