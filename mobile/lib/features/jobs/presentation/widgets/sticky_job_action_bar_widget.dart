import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/job_status.dart';

/// Sticky bottom footer bar hosting lifecycle actions: Reject, Accept/En Route/Arrived, and Mark Completed.
class StickyJobActionBarWidget extends StatelessWidget {
  final JobStatus status;
  final VoidCallback? onReject;
  final VoidCallback? onIntermediateAction;
  final VoidCallback? onMarkCompleted;

  const StickyJobActionBarWidget({
    super.key,
    required this.status,
    this.onReject,
    this.onIntermediateAction,
    this.onMarkCompleted,
  });

  String get _intermediateLabel {
    switch (status) {
      case JobStatus.pending:
        return 'Accept';
      case JobStatus.accepted:
        return 'En Route';
      case JobStatus.inProgress:
        return 'Arrived';
      default:
        return 'Accept';
    }
  }

  IconData get _intermediateIcon {
    switch (status) {
      case JobStatus.pending:
        return Icons.check;
      case JobStatus.accepted:
        return Icons.directions_car;
      case JobStatus.inProgress:
        return Icons.location_on;
      default:
        return Icons.check;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isCompleted = status == JobStatus.completed;
    final isUnable = status == JobStatus.unableToServe;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        border: Border(
          top: BorderSide(
            color: Color(0xFFF1F5F9),
            width: 1.0,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x0D000000),
            blurRadius: 12.0,
            offset: Offset(0, -4),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.marginEdge,
        vertical: 12.0,
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isCompleted) ...[
              Container(
                width: double.infinity,
                height: AppConstants.minTouchTarget,
                decoration: BoxDecoration(
                  color: AppColors.statCardCompletedBg,
                  borderRadius: AppRadius.borderMd,
                  border: Border.all(color: AppColors.statCardCompletedBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      color: AppColors.statusAcceptedText,
                      size: 22.0,
                    ),
                    const SizedBox(width: AppSpacing.stackSm),
                    Text(
                      'Job Completed',
                      style: AppTypography.titleMedium.copyWith(
                        color: AppColors.statusAcceptedText,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (isUnable) ...[
              Container(
                width: double.infinity,
                height: AppConstants.minTouchTarget,
                decoration: BoxDecoration(
                  color: AppColors.errorContainer,
                  borderRadius: AppRadius.borderMd,
                  border: Border.all(color: AppColors.error.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.cancel_outlined,
                      color: AppColors.error,
                      size: 22.0,
                    ),
                    const SizedBox(width: AppSpacing.stackSm),
                    Text(
                      'Unable to Serve',
                      style: AppTypography.titleMedium.copyWith(
                        color: AppColors.error,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              // Row of Secondary Actions (Reject + Intermediate)
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: AppConstants.minTouchTarget,
                      child: OutlinedButton.icon(
                        onPressed: onReject,
                        icon: const Icon(
                          Icons.close,
                          color: AppColors.error,
                          size: 18.0,
                        ),
                        label: Text(
                          'Reject',
                          style: AppTypography.titleMedium.copyWith(
                            color: AppColors.error,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.error, width: 1.0),
                          shape: RoundedRectangleBorder(
                            borderRadius: AppRadius.borderMd,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.stackMd),
                  Expanded(
                    child: SizedBox(
                      height: AppConstants.minTouchTarget,
                      child: OutlinedButton.icon(
                        onPressed: onIntermediateAction,
                        icon: Icon(
                          _intermediateIcon,
                          color: AppColors.primary,
                          size: 18.0,
                        ),
                        label: Text(
                          _intermediateLabel,
                          style: AppTypography.titleMedium.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary, width: 1.0),
                          shape: RoundedRectangleBorder(
                            borderRadius: AppRadius.borderMd,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.stackSm),

              // Primary Final Action (Mark Completed)
              SizedBox(
                width: double.infinity,
                height: AppConstants.minTouchTarget,
                child: ElevatedButton.icon(
                  onPressed: onMarkCompleted,
                  icon: const Icon(
                    Icons.task_alt,
                    color: Colors.white,
                    size: 20.0,
                  ),
                  label: Text(
                    'Mark Completed',
                    style: AppTypography.titleMedium.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: AppRadius.borderMd,
                    ),
                    elevation: 2.0,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
