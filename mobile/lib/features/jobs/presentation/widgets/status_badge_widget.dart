import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_custom_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/job_status.dart';

/// Renders a high-contrast traffic-light status pill matching Stitch design tokens.
class StatusBadgeWidget extends StatelessWidget {
  final JobStatus status;

  const StatusBadgeWidget({
    super.key,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final customColors = Theme.of(context).extension<AppCustomColors>();

    Color bg;
    Color text;

    switch (status) {
      case JobStatus.accepted:
        bg = customColors?.statusAcceptedBg ?? AppColors.statusAcceptedBg;
        text = customColors?.statusAcceptedText ?? AppColors.statusAcceptedText;
        break;
      case JobStatus.pending:
        bg = customColors?.statusPendingBg ?? AppColors.statusPendingBg;
        text = customColors?.statusPendingText ?? AppColors.statusPendingText;
        break;
      case JobStatus.inProgress:
        bg = customColors?.statusInProgressBg ?? AppColors.statusInProgressBg;
        text = customColors?.statusInProgressText ?? AppColors.statusInProgressText;
        break;
      case JobStatus.scheduled:
        bg = AppColors.surfaceContainerHigh;
        text = AppColors.onSurfaceVariant;
        break;
      case JobStatus.completed:
        bg = customColors?.statCardCompletedBg ?? AppColors.statCardCompletedBg;
        text = customColors?.statCardCompletedText ?? AppColors.statCardCompletedText;
        break;
      case JobStatus.unableToServe:
      case JobStatus.cancelled:
        bg = AppColors.errorContainer;
        text = AppColors.onErrorContainer;
        break;
      case JobStatus.onHold:
        bg = AppColors.secondaryContainer;
        text = AppColors.onSecondaryContainer;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 4.0),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(9999.0),
      ),
      child: Text(
        status.displayName,
        style: AppTypography.badgeSmall.copyWith(
          color: text,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
