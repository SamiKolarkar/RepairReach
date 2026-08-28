import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/job_summary_metrics_entity.dart';

/// Bento-styled 2-column metrics summary showing completed & remaining jobs.
class SummaryMetricsWidget extends StatelessWidget {
  final JobSummaryMetricsEntity metrics;

  const SummaryMetricsWidget({
    super.key,
    required this.metrics,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Completed Metric Card
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(AppSpacing.stackMd),
            decoration: BoxDecoration(
              color: AppColors.statCardCompletedBg,
              borderRadius: AppRadius.borderLg,
              border: Border.all(
                color: AppColors.statCardCompletedBorder,
                width: 1.0,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'COMPLETED',
                  style: AppTypography.labelCaps.copyWith(
                    color: AppColors.statCardCompletedText,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: AppSpacing.unit),
                Text(
                  '${metrics.completedCount}',
                  style: AppTypography.displayLarge.copyWith(
                    color: AppColors.statCardCompletedNum,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.stackMd),
        // Remaining Metric Card
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(AppSpacing.stackMd),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHigh,
              borderRadius: AppRadius.borderLg,
              border: Border.all(
                color: AppColors.outlineVariant,
                width: 1.0,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'REMAINING',
                  style: AppTypography.labelCaps.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: AppSpacing.unit),
                Text(
                  '${metrics.remainingCount}',
                  style: AppTypography.displayLarge.copyWith(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
