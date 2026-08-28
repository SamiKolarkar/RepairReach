import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_custom_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/job_entity.dart';
import '../../domain/entities/job_status.dart';
import 'status_badge_widget.dart';

/// Bento-styled job card representing single assigned task with contextual actions.
class JobCardWidget extends StatelessWidget {
  final JobEntity job;
  final VoidCallback? onMarkCompleted;
  final VoidCallback? onCall;
  final VoidCallback? onWhatsApp;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;
  final VoidCallback? onTap;

  const JobCardWidget({
    super.key,
    required this.job,
    this.onMarkCompleted,
    this.onCall,
    this.onWhatsApp,
    this.onAccept,
    this.onReject,
    this.onTap,
  });

  IconData _getServiceIcon(ServiceCategory category) {
    switch (category) {
      case ServiceCategory.hvac:
        return Icons.air;
      case ServiceCategory.plumbing:
        return Icons.water_drop;
      case ServiceCategory.electrical:
        return Icons.bolt;
      case ServiceCategory.appliance:
        return Icons.home_repair_service;
    }
  }

  Color _getServiceIconBg(ServiceCategory category, AppCustomColors? customColors) {
    switch (category) {
      case ServiceCategory.hvac:
        return customColors?.primaryFixed ?? AppColors.primaryFixed;
      case ServiceCategory.plumbing:
        return customColors?.secondaryFixed ?? AppColors.secondaryFixed;
      case ServiceCategory.electrical:
        return customColors?.tertiaryFixed ?? AppColors.tertiaryFixed;
      case ServiceCategory.appliance:
        return AppColors.surfaceContainerHigh;
    }
  }

  Color _getServiceIconColor(ServiceCategory category) {
    switch (category) {
      case ServiceCategory.hvac:
        return AppColors.primary;
      case ServiceCategory.plumbing:
        return AppColors.secondary;
      case ServiceCategory.electrical:
        return AppColors.tertiary;
      case ServiceCategory.appliance:
        return AppColors.onSurface;
    }
  }

  @override
  Widget build(BuildContext context) {
    final customColors = Theme.of(context).extension<AppCustomColors>();
    final isAccepted = job.status == JobStatus.accepted;

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
              color: Color(0x0A000000),
              blurRadius: 4.0,
              offset: Offset(0, 1),
            ),
          ],
        ),
        padding: const EdgeInsets.all(AppSpacing.stackMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row: Time Window & Customer Name + Status Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        job.timeWindow,
                        style: AppTypography.labelCaps.copyWith(
                          color: isAccepted ? AppColors.primary : AppColors.secondary,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.unit),
                      Text(
                        job.customerName,
                        style: AppTypography.headlineMedium,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.stackSm),
                StatusBadgeWidget(status: job.status),
              ],
            ),
            const SizedBox(height: AppSpacing.stackSm),

            // Service & Location Row
            Row(
              children: [
                Container(
                  width: 40.0,
                  height: 40.0,
                  decoration: BoxDecoration(
                    color: _getServiceIconBg(job.serviceCategory, customColors),
                    borderRadius: AppRadius.borderDefault,
                  ),
                  child: Icon(
                    _getServiceIcon(job.serviceCategory),
                    color: _getServiceIconColor(job.serviceCategory),
                    size: 22.0,
                  ),
                ),
                const SizedBox(width: AppSpacing.stackSm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        job.serviceTitle,
                        style: AppTypography.titleMedium,
                      ),
                      Row(
                        children: [
                          const Icon(
                            Icons.location_on,
                            size: 16.0,
                            color: AppColors.onSurfaceVariant,
                          ),
                          const SizedBox(width: 2.0),
                          Expanded(
                            child: Text(
                              job.address,
                              style: AppTypography.bodyMedium,
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

            // Map Preview Mockup (if present)
            if (job.mapImageUrl != null) ...[
              const SizedBox(height: AppSpacing.stackMd),
              Container(
                width: double.infinity,
                height: 96.0,
                decoration: BoxDecoration(
                  borderRadius: AppRadius.borderDefault,
                  color: AppColors.surfaceVariant,
                ),
                clipBehavior: Clip.antiAlias,
                child: Stack(
                  children: [
                    Image.network(
                      job.mapImageUrl!,
                      width: double.infinity,
                      height: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        color: AppColors.surfaceVariant,
                        child: const Center(
                          child: Icon(
                            Icons.map_outlined,
                            color: AppColors.outline,
                            size: 32.0,
                          ),
                        ),
                      ),
                    ),
                    Container(
                      color: Colors.black.withOpacity(0.12),
                    ),
                    const Center(
                      child: Icon(
                        Icons.location_on,
                        color: AppColors.primary,
                        size: 32.0,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: AppSpacing.stackMd),

            // Action Buttons
            _buildActionButtons(context),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    if (job.status == JobStatus.accepted) {
      return Column(
        children: [
          // Primary "Mark Completed" Button
          SizedBox(
            width: double.infinity,
            height: AppConstants.minTouchTarget,
            child: ElevatedButton.icon(
              onPressed: onMarkCompleted,
              icon: const Icon(Icons.check_circle, size: 18.0),
              label: const Text('Mark Completed'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.onPrimary,
                shape: RoundedRectangleBorder(
                  borderRadius: AppRadius.borderMd,
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.stackSm),
          // Call & WhatsApp Secondary Buttons Row
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: AppConstants.minTouchTarget,
                  child: OutlinedButton.icon(
                    onPressed: onCall,
                    icon: const Icon(
                      Icons.call,
                      color: AppColors.callAction,
                      size: 18.0,
                    ),
                    label: Text(
                      'Call',
                      style: AppTypography.bodyMedium.copyWith(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.outline, width: 1.0),
                      shape: RoundedRectangleBorder(
                        borderRadius: AppRadius.borderMd,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.stackSm),
              Expanded(
                child: SizedBox(
                  height: AppConstants.minTouchTarget,
                  child: OutlinedButton.icon(
                    onPressed: onWhatsApp,
                    icon: const Icon(
                      Icons.chat,
                      color: AppColors.whatsappAction,
                      size: 18.0,
                    ),
                    label: Text(
                      'WhatsApp',
                      style: AppTypography.bodyMedium.copyWith(
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.outline, width: 1.0),
                      shape: RoundedRectangleBorder(
                        borderRadius: AppRadius.borderMd,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      );
    } else if (job.status == JobStatus.pending) {
      return Row(
        children: [
          // Accept Button
          Expanded(
            child: SizedBox(
              height: AppConstants.minTouchTarget,
              child: ElevatedButton.icon(
                onPressed: onAccept,
                icon: const Icon(Icons.check, size: 18.0),
                label: const Text('Accept'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryContainer,
                  foregroundColor: AppColors.onPrimaryContainer,
                  elevation: 1.0,
                  shape: RoundedRectangleBorder(
                    borderRadius: AppRadius.borderMd,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.gutter),
          // Reject Button
          Expanded(
            child: SizedBox(
              height: AppConstants.minTouchTarget,
              child: ElevatedButton.icon(
                onPressed: onReject,
                icon: const Icon(Icons.close, size: 18.0),
                label: const Text('Reject'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.errorContainer,
                  foregroundColor: AppColors.onErrorContainer,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: AppRadius.borderMd,
                  ),
                ),
              ),
            ),
          ),
        ],
      );
    } else if (job.status == JobStatus.completed) {
      return Container(
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
            const Icon(Icons.check_circle_outline, color: AppColors.statusAcceptedText, size: 20.0),
            const SizedBox(width: AppSpacing.stackSm),
            Text(
              'Job Completed',
              style: AppTypography.titleMedium.copyWith(
                color: AppColors.statusAcceptedText,
              ),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }
}
