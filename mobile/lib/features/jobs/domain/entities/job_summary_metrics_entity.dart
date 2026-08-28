import 'package:equatable/equatable.dart';

/// Pure domain entity representing daily job summary counts.
class JobSummaryMetricsEntity extends Equatable {
  final String dateDisplay;
  final int completedCount;
  final int remainingCount;
  final int totalAssigned;

  const JobSummaryMetricsEntity({
    required this.dateDisplay,
    required this.completedCount,
    required this.remainingCount,
    required this.totalAssigned,
  });

  @override
  List<Object?> get props => [
        dateDisplay,
        completedCount,
        remainingCount,
        totalAssigned,
      ];
}
