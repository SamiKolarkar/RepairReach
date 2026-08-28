import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';

/// Header section displaying the screen title and current date subtitle.
class DateHeaderWidget extends StatelessWidget {
  final String title;
  final String dateDisplay;

  const DateHeaderWidget({
    super.key,
    this.title = "Today's Jobs",
    required this.dateDisplay,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: AppTypography.displayLarge,
        ),
        const SizedBox(height: AppSpacing.unit),
        Row(
          children: [
            const Icon(
              Icons.calendar_today,
              size: 18.0,
              color: AppColors.secondary,
            ),
            const SizedBox(width: AppSpacing.stackSm),
            Text(
              dateDisplay,
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.secondary,
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
