import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';

/// Card displaying customer reported problem callout with 4px left border and trade tags.
class ProblemQuoteCardWidget extends StatelessWidget {
  final String description;
  final String categoryName;
  final String priority;

  const ProblemQuoteCardWidget({
    super.key,
    required this.description,
    required this.categoryName,
    required this.priority,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: AppRadius.borderLg,
        border: Border.all(
          color: AppColors.outlineVariant.withOpacity(0.30),
          width: 1.0,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 3.0,
            offset: Offset(0, 1),
          ),
        ],
      ),
      padding: const EdgeInsets.all(AppSpacing.stackMd),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Label
          Text(
            'REPORTED PROBLEM',
            style: AppTypography.labelCaps.copyWith(
              color: AppColors.outline,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppSpacing.stackSm),

          // Styled Quote Box with 4px Left Border
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.stackMd),
            decoration: const BoxDecoration(
              color: AppColors.surfaceContainerLow,
              borderRadius: BorderRadius.only(
                topRight: Radius.circular(8.0),
                bottomRight: Radius.circular(8.0),
              ),
              border: Border(
                left: BorderSide(
                  color: AppColors.primary,
                  width: 4.0,
                ),
              ),
            ),
            child: Text(
              '"$description"',
              style: AppTypography.bodyLarge.copyWith(
                fontStyle: FontStyle.italic,
                color: AppColors.onSurface,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.stackMd),

          // Trade Category & Priority Chips Row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12.0,
                  vertical: 4.0,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHigh,
                  borderRadius: AppRadius.borderFull,
                ),
                child: Text(
                  categoryName.toUpperCase(),
                  style: AppTypography.labelCaps.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.stackSm),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12.0,
                  vertical: 4.0,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerHigh,
                  borderRadius: AppRadius.borderFull,
                ),
                child: Text(
                  priority.toUpperCase(),
                  style: AppTypography.labelCaps.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
