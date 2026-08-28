import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/availability_slot_entity.dart';

/// Bento card representing a single availability shift slot with toggle.
class AvailabilitySlotCardWidget extends StatelessWidget {
  final AvailabilitySlotEntity slot;
  final ValueChanged<bool> onToggle;

  const AvailabilitySlotCardWidget({
    super.key,
    required this.slot,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final isAvailable = slot.isAvailable;
    final isBreak = slot.isBreak;

    final containerBg = (!isAvailable || isBreak)
        ? AppColors.surfaceContainerLow
        : AppColors.surfaceContainerLowest;

    final iconColor = (!isAvailable || isBreak)
        ? AppColors.onSurfaceVariant.withOpacity(0.6)
        : AppColors.primary;

    final textOpacity = (!isAvailable || isBreak) ? 0.6 : 1.0;

    return Container(
      decoration: BoxDecoration(
        color: containerBg,
        borderRadius: AppRadius.borderLg,
        border: Border.all(
          color: AppColors.outlineVariant,
          width: 1.0,
        ),
        boxShadow: isAvailable && !isBreak
            ? const [
                BoxShadow(
                  color: Color(0x0A000000),
                  blurRadius: 2.0,
                  offset: Offset(0, 1),
                ),
              ]
            : null,
      ),
      padding: const EdgeInsets.all(AppSpacing.stackMd),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Icon + Shift Details
          Expanded(
            child: Row(
              children: [
                Icon(
                  slot.icon,
                  color: iconColor,
                  size: 24.0,
                ),
                const SizedBox(width: AppSpacing.gutter),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Opacity(
                        opacity: textOpacity,
                        child: Text(
                          slot.timeRange,
                          style: AppTypography.titleMedium.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurface,
                          ),
                        ),
                      ),
                      const SizedBox(height: 2.0),
                      Opacity(
                        opacity: textOpacity,
                        child: Text(
                          slot.shiftName,
                          style: AppTypography.bodyMedium.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Right: Toggle Switch & Status Pill Label
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(
                  minWidth: AppConstants.minTouchTarget,
                  minHeight: 32.0,
                ),
                child: Switch(
                  value: slot.isAvailable,
                  onChanged: onToggle,
                  activeColor: AppColors.primary,
                  activeTrackColor: AppColors.primaryContainer.withOpacity(0.4),
                ),
              ),
              const SizedBox(height: 2.0),
              Text(
                slot.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
                style: AppTypography.badgeSmall.copyWith(
                  fontSize: 10.0,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                  color: slot.isAvailable
                      ? AppColors.primary
                      : AppColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
