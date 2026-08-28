import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/technician_profile_entity.dart';

/// Top App Bar for the Job Details screen with back navigation and technician avatar.
class JobDetailsAppBarWidget extends StatelessWidget implements PreferredSizeWidget {
  final TechnicianProfileEntity? technicianProfile;
  final VoidCallback? onBack;

  const JobDetailsAppBarWidget({
    super.key,
    this.technicianProfile,
    this.onBack,
  });

  @override
  Size get preferredSize => const Size.fromHeight(64.0);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64.0,
      decoration: const BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        border: Border(
          bottom: BorderSide(
            color: Color(0xFFF1F5F9),
            width: 1.0,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x0D000000),
            blurRadius: 2.0,
            offset: Offset(0, 1),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Left: Back button & Title
            Row(
              children: [
                ConstrainedBox(
                  constraints: const BoxConstraints(
                    minWidth: AppConstants.minTouchTarget,
                    minHeight: AppConstants.minTouchTarget,
                  ),
                  child: IconButton(
                    onPressed: onBack ?? () => Navigator.of(context).maybePop(),
                    icon: const Icon(
                      Icons.arrow_back,
                      color: AppColors.outline,
                      size: 24.0,
                    ),
                    tooltip: 'Back',
                  ),
                ),
                const SizedBox(width: 8.0),
                Text(
                  'Job Details',
                  style: AppTypography.headlineMedium.copyWith(
                    color: const Color(0xFF1D4ED8),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),

            // Right: Technician Avatar Thumbnail
            Container(
              width: 40.0,
              height: 40.0,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primaryContainer,
                border: Border.all(
                  color: AppColors.primaryFixed,
                  width: 2.0,
                ),
              ),
              clipBehavior: Clip.antiAlias,
              child: technicianProfile?.avatarUrl.isNotEmpty == true
                  ? Image.network(
                      technicianProfile!.avatarUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => const Icon(
                        Icons.person,
                        color: AppColors.onPrimary,
                        size: 22.0,
                      ),
                    )
                  : const Icon(
                      Icons.person,
                      color: AppColors.onPrimary,
                      size: 22.0,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
