import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';

/// 2-Column Bento grid displaying required technician equipment and potential replacement parts.
class EquipmentPartsBentoWidget extends StatelessWidget {
  final List<String> equipment;
  final List<String> potentialParts;

  const EquipmentPartsBentoWidget({
    super.key,
    required this.equipment,
    required this.potentialParts,
  });

  @override
  Widget build(BuildContext context) {
    final equipmentStr =
        equipment.isNotEmpty ? equipment.join(', ') : 'Standard Kit';
    final partsStr =
        potentialParts.isNotEmpty ? potentialParts.join(', ') : 'None reported';

    return Row(
      children: [
        // Equipment Card
        Expanded(
          child: Container(
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
                const Icon(
                  Icons.build,
                  color: AppColors.primary,
                  size: 24.0,
                ),
                const SizedBox(height: 4.0),
                Text(
                  'EQUIPMENT',
                  style: AppTypography.labelCaps.copyWith(
                    color: AppColors.outline,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2.0),
                Text(
                  equipmentStr,
                  style: AppTypography.bodyMedium.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurface,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.gutter),

        // Potential Parts Card
        Expanded(
          child: Container(
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
                const Icon(
                  Icons.inventory_2,
                  color: AppColors.tertiary,
                  size: 24.0,
                ),
                const SizedBox(height: 4.0),
                Text(
                  'POTENTIAL PARTS',
                  style: AppTypography.labelCaps.copyWith(
                    color: AppColors.outline,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2.0),
                Text(
                  partsStr,
                  style: AppTypography.bodyMedium.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurface,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
