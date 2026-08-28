import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';

/// Bento card presenting customer contact info and direct Call & Chat action buttons.
class CustomerInfoCardWidget extends StatelessWidget {
  final String customerName;
  final String clientType;
  final String customerPhone;
  final VoidCallback? onCall;
  final VoidCallback? onChat;

  const CustomerInfoCardWidget({
    super.key,
    required this.customerName,
    required this.clientType,
    required this.customerPhone,
    this.onCall,
    this.onChat,
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
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Left: Customer Information
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'CUSTOMER',
                  style: AppTypography.labelCaps.copyWith(
                    color: AppColors.outline,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4.0),
                Text(
                  customerName,
                  style: AppTypography.headlineMedium.copyWith(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4.0),
                Text(
                  '$clientType • Priority Service',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.stackSm),

          // Right: Action Buttons (Call + Chat)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Phone Call Circle Button
              InkWell(
                onTap: onCall,
                borderRadius: BorderRadius.circular(24.0),
                child: Container(
                  width: AppConstants.minTouchTarget,
                  height: AppConstants.minTouchTarget,
                  decoration: const BoxDecoration(
                    color: AppColors.primaryFixed,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.call,
                    color: AppColors.onPrimaryFixed,
                    size: 22.0,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.stackSm),

              // Chat Circle Button
              InkWell(
                onTap: onChat,
                borderRadius: BorderRadius.circular(24.0),
                child: Container(
                  width: AppConstants.minTouchTarget,
                  height: AppConstants.minTouchTarget,
                  decoration: const BoxDecoration(
                    color: AppColors.tertiaryFixed,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.chat,
                    color: AppColors.onTertiaryFixed,
                    size: 22.0,
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
