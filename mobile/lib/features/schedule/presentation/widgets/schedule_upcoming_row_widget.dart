import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/schedule_entry_entity.dart';

/// Row representing a future job in the Upcoming section of the Schedule.
class ScheduleUpcomingRowWidget extends StatelessWidget {
  final UpcomingScheduleEntity item;
  final VoidCallback? onTap;

  const ScheduleUpcomingRowWidget({
    super.key,
    required this.item,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.stackMd),
        child: Row(
          children: [
            // Date column
            SizedBox(
              width: 40.0,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    item.day,
                    style: AppTypography.labelCaps.copyWith(
                      fontSize: 16.0,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                      height: 1.1,
                    ),
                  ),
                  Text(
                    item.month.toUpperCase(),
                    style: AppTypography.labelCaps.copyWith(
                      fontSize: 10.0,
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurfaceVariant,
                      height: 1.1,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.gutter),

            // Customer Name & Service Detail
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.customerName,
                    style: AppTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurface,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2.0),
                  Text(
                    item.serviceDetail,
                    style: AppTypography.bodyMedium.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            // Trailing Chevron Icon
            const Icon(
              Icons.chevron_right,
              color: AppColors.outline,
              size: 20.0,
            ),
          ],
        ),
      ),
    );
  }
}
