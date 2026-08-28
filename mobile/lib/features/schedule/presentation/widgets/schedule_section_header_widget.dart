import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';

/// Section header for grouped date sections in the Service Schedule.
class ScheduleSectionHeaderWidget extends StatelessWidget {
  final String title;
  final String? subtitle;
  final bool isPrimaryTitle;
  final Widget? trailing;

  const ScheduleSectionHeaderWidget({
    super.key,
    required this.title,
    this.subtitle,
    this.isPrimaryTitle = false,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.stackSm),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title.toUpperCase(),
            style: AppTypography.labelCaps.copyWith(
              color: isPrimaryTitle ? AppColors.primary : AppColors.onSurfaceVariant,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
            ),
          ),
          if (trailing != null)
            trailing!
          else if (subtitle != null)
            Text(
              subtitle!,
              style: AppTypography.labelCaps.copyWith(
                color: AppColors.onSurfaceVariant,
                fontWeight: FontWeight.w500,
              ),
            ),
        ],
      ),
    );
  }
}
