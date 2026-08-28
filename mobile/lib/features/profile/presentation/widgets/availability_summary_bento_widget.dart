import 'package:flutter/material.dart';
import 'package:repairreach_technician/core/theme/app_colors.dart';
import 'package:repairreach_technician/core/theme/app_radius.dart';
import 'package:repairreach_technician/core/theme/app_spacing.dart';
import 'package:repairreach_technician/core/theme/app_typography.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/technician_profile_entity.dart';

/// Bento grid displaying technician availability metrics: Next Shift, Weekly Hours, Online Status.
class AvailabilitySummaryBentoWidget extends StatelessWidget {
  final TechnicianProfileEntity profile;
  final VoidCallback? onAdjustShift;

  const AvailabilitySummaryBentoWidget({
    super.key,
    required this.profile,
    this.onAdjustShift,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0),
          child: Text(
            'AVAILABILITY SUMMARY',
            style: AppTypography.labelCaps.copyWith(
              color: AppColors.secondary,
              letterSpacing: 0.8,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.stackSm),

        // Bento Top Tile: Next Shift
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppColors.primaryContainer,
            borderRadius: AppRadius.borderLg,
            boxShadow: const [
              BoxShadow(
                color: Color(0x1A0052CC),
                blurRadius: 4.0,
                offset: Offset(0, 2),
              ),
            ],
          ),
          padding: const EdgeInsets.all(AppSpacing.stackMd),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Next Shift',
                        style: AppTypography.labelCaps.copyWith(
                          color: AppColors.onPrimaryContainer.withOpacity(0.80),
                          fontSize: 12.0,
                        ),
                      ),
                      const SizedBox(height: 4.0),
                      Text(
                        profile.nextShift,
                        style: AppTypography.headlineMedium.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const Icon(
                    Icons.event_available,
                    color: Colors.white,
                    size: 32.0,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.stackMd),
              Container(
                height: 1.0,
                color: Colors.white.withOpacity(0.15),
              ),
              const SizedBox(height: AppSpacing.stackSm),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '8 Jobs Scheduled',
                    style: AppTypography.bodyMedium.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  InkWell(
                    onTap: onAdjustShift,
                    borderRadius: BorderRadius.circular(8.0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12.0,
                        vertical: 6.0,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.20),
                        borderRadius: BorderRadius.circular(8.0),
                      ),
                      child: Text(
                        'Adjust',
                        style: AppTypography.bodyMedium.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 13.0,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.stackSm),

        // Bento Bottom Row: Weekly Hours & Status
        Row(
          children: [
            // Weekly Hours Card
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainer,
                  borderRadius: AppRadius.borderLg,
                  border: Border.all(
                    color: AppColors.outlineVariant.withOpacity(0.3),
                    width: 1.0,
                  ),
                ),
                padding: const EdgeInsets.all(AppSpacing.stackMd),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Weekly Hours',
                      style: AppTypography.labelCaps.copyWith(
                        color: AppColors.onSecondaryContainer,
                        fontSize: 12.0,
                      ),
                    ),
                    const SizedBox(height: 4.0),
                    Text(
                      '${profile.weeklyHours}h',
                      style: AppTypography.headlineMedium.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.stackSm),

            // Status Card
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainer,
                  borderRadius: AppRadius.borderLg,
                  border: Border.all(
                    color: AppColors.outlineVariant.withOpacity(0.3),
                    width: 1.0,
                  ),
                ),
                padding: const EdgeInsets.all(AppSpacing.stackMd),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Status',
                      style: AppTypography.labelCaps.copyWith(
                        color: AppColors.onSecondaryContainer,
                        fontSize: 12.0,
                      ),
                    ),
                    const SizedBox(height: 6.0),
                    Row(
                      children: [
                        Container(
                          width: 10.0,
                          height: 10.0,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.statusOnlineDot,
                          ),
                        ),
                        const SizedBox(width: 6.0),
                        Text(
                          profile.status,
                          style: AppTypography.headlineMedium.copyWith(
                            color: AppColors.onSurface,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
