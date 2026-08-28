import 'package:flutter/material.dart';
import 'package:repairreach_technician/core/theme/app_colors.dart';
import 'package:repairreach_technician/core/theme/app_radius.dart';
import 'package:repairreach_technician/core/theme/app_spacing.dart';
import 'package:repairreach_technician/core/theme/app_typography.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/job_status.dart';
import 'package:repairreach_technician/features/schedule/domain/entities/schedule_entry_entity.dart';

/// Schedule job card with custom time badge, customer name, status chip, and address.
class ScheduleJobCardWidget extends StatelessWidget {
  final ScheduleEntryEntity entry;
  final VoidCallback? onTap;

  const ScheduleJobCardWidget({
    super.key,
    required this.entry,
    this.onTap,
  });

  Color _getStatusBg(JobStatus status) {
    switch (status) {
      case JobStatus.inProgress:
        return AppColors.statusInProgressBg;
      case JobStatus.pending:
        return AppColors.statusPendingBg;
      case JobStatus.scheduled:
        return AppColors.surfaceContainerHigh;
      case JobStatus.accepted:
      case JobStatus.completed:
        return AppColors.statusAcceptedBg;
      default:
        return AppColors.surfaceContainerHigh;
    }
  }

  Color _getStatusTextColor(JobStatus status) {
    switch (status) {
      case JobStatus.inProgress:
        return AppColors.statusInProgressText;
      case JobStatus.pending:
        return AppColors.statusPendingText;
      case JobStatus.scheduled:
        return AppColors.onSurfaceVariant;
      case JobStatus.accepted:
      case JobStatus.completed:
        return AppColors.statusAcceptedText;
      default:
        return AppColors.onSurfaceVariant;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isInProgress = entry.status == JobStatus.inProgress;

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.borderLg,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLowest,
          borderRadius: AppRadius.borderLg,
          border: Border.all(
            color: AppColors.outlineVariant,
            width: 1.0,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x14000000),
              blurRadius: 3.0,
              offset: Offset(0, 1),
            ),
          ],
        ),
        padding: const EdgeInsets.all(AppSpacing.stackMd),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Time Pill Badge
            Container(
              width: 56.0,
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              decoration: BoxDecoration(
                color: isInProgress
                    ? AppColors.primaryContainer
                    : AppColors.surfaceVariant,
                borderRadius: AppRadius.borderDefault,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    entry.timeHour,
                    style: AppTypography.headlineMedium.copyWith(
                      color: isInProgress
                          ? AppColors.onPrimaryContainer
                          : AppColors.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                      height: 1.1,
                    ),
                  ),
                  Text(
                    entry.timePeriod.toUpperCase(),
                    style: AppTypography.labelCaps.copyWith(
                      fontSize: 10.0,
                      fontWeight: FontWeight.w700,
                      color: isInProgress
                          ? AppColors.onPrimaryContainer
                          : AppColors.onSurfaceVariant,
                      height: 1.1,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.gutter),

            // Details Column
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Customer Name & Status Badge Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          entry.customerName,
                          style: AppTypography.titleMedium.copyWith(
                            color: AppColors.onSurface,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.stackSm),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8.0,
                          vertical: 2.0,
                        ),
                        decoration: BoxDecoration(
                          color: _getStatusBg(entry.status),
                          borderRadius: AppRadius.borderFull,
                        ),
                        child: Text(
                          entry.status.displayName,
                          style: AppTypography.badgeSmall.copyWith(
                            fontSize: 10.0,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                            color: _getStatusTextColor(entry.status),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.unit),

                  // Address Row
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on,
                        size: 16.0,
                        color: AppColors.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4.0),
                      Expanded(
                        child: Text(
                          entry.customerAddress,
                          style: AppTypography.bodyMedium.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
