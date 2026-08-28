import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/availability_slot_entity.dart';

/// Decorative insight card displaying weekly capacity and remaining hours.
class WeeklyCapacityCardWidget extends StatelessWidget {
  final WeeklyCapacityEntity capacity;
  final VoidCallback? onViewReport;

  const WeeklyCapacityCardWidget({
    super.key,
    required this.capacity,
    this.onViewReport,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: AppRadius.borderXl,
        boxShadow: const [
          BoxShadow(
            color: Color(0x26003D9B),
            blurRadius: 12.0,
            offset: Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Background Decorative Overlays
          Positioned(
            right: -24.0,
            bottom: -24.0,
            child: Container(
              width: 96.0,
              height: 96.0,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.10),
              ),
            ),
          ),
          Positioned(
            right: -12.0,
            top: 16.0,
            child: Container(
              width: 64.0,
              height: 64.0,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.15),
              ),
            ),
          ),
          Positioned(
            right: 8.0,
            top: 12.0,
            child: Transform.rotate(
              angle: 12.0 * math.pi / 180.0,
              child: Icon(
                Icons.insights,
                size: 64.0,
                color: Colors.white.withOpacity(0.20),
              ),
            ),
          ),

          // Foreground Content
          Padding(
            padding: const EdgeInsets.all(AppSpacing.stackLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Weekly Capacity',
                  style: AppTypography.headlineMedium.copyWith(
                    color: AppColors.onPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.unit),
                Text(
                  capacity.description,
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.onPrimary.withOpacity(0.90),
                  ),
                ),
                const SizedBox(height: AppSpacing.stackMd),
                ElevatedButton(
                  onPressed: onViewReport,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: AppRadius.borderFull,
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16.0,
                      vertical: 10.0,
                    ),
                    elevation: 0,
                  ),
                  child: Text(
                    'VIEW REPORT',
                    style: AppTypography.labelCaps.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w700,
                      fontSize: 12.0,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
