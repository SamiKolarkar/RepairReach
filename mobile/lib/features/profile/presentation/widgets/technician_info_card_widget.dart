import 'package:flutter/material.dart';
import 'package:repairreach_technician/core/theme/app_colors.dart';
import 'package:repairreach_technician/core/theme/app_radius.dart';
import 'package:repairreach_technician/core/theme/app_spacing.dart';
import 'package:repairreach_technician/core/theme/app_typography.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/technician_profile_entity.dart';

/// Bento card presenting the technician's photo, name, star rating, and contact phone.
class TechnicianInfoCardWidget extends StatelessWidget {
  final TechnicianProfileEntity profile;

  const TechnicianInfoCardWidget({
    super.key,
    required this.profile,
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
        children: [
          // 80x80 Avatar Image
          Container(
            width: 80.0,
            height: 80.0,
            decoration: BoxDecoration(
              borderRadius: AppRadius.borderLg,
              color: AppColors.primaryContainer,
            ),
            clipBehavior: Clip.antiAlias,
            child: profile.avatarUrl.isNotEmpty
                ? Image.network(
                    profile.avatarUrl,
                    width: 80.0,
                    height: 80.0,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => const Center(
                      child: Icon(
                        Icons.person,
                        size: 40.0,
                        color: AppColors.onPrimary,
                      ),
                    ),
                  )
                : const Center(
                    child: Icon(
                      Icons.person,
                      size: 40.0,
                      color: AppColors.onPrimary,
                    ),
                  ),
          ),
          const SizedBox(width: AppSpacing.stackMd),

          // Profile Details Column
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile.name,
                  style: AppTypography.headlineMedium.copyWith(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4.0),
                Row(
                  children: [
                    const Icon(
                      Icons.star,
                      size: 14.0,
                      color: AppColors.starRating,
                    ),
                    const SizedBox(width: 4.0),
                    Text(
                      '${profile.rating} stars (${profile.reviewCount} reviews)',
                      style: AppTypography.labelCaps.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12.0,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6.0),
                Row(
                  children: [
                    const Icon(
                      Icons.call,
                      size: 16.0,
                      color: AppColors.secondary,
                    ),
                    const SizedBox(width: 4.0),
                    Text(
                      profile.phone,
                      style: AppTypography.bodyMedium.copyWith(
                        color: AppColors.secondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
