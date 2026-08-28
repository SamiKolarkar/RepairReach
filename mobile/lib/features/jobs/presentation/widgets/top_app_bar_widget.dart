import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/entities/technician_profile_entity.dart';

/// Sticky Top App Bar displaying technician profile thumbnail, branding and notifications.
class TopAppBarWidget extends StatelessWidget implements PreferredSizeWidget {
  final TechnicianProfileEntity? technicianProfile;
  final VoidCallback? onNotificationTap;
  final VoidCallback? onProfileTap;

  const TopAppBarWidget({
    super.key,
    this.technicianProfile,
    this.onNotificationTap,
    this.onProfileTap,
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
            // Left: Technician Avatar & App Title
            InkWell(
              onTap: onProfileTap,
              borderRadius: BorderRadius.circular(20.0),
              child: Row(
                children: [
                  Container(
                    width: 40.0,
                    height: 40.0,
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.outlineVariant,
                        width: 1.0,
                      ),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: technicianProfile?.avatarUrl.isNotEmpty == true
                        ? Image.network(
                            technicianProfile!.avatarUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                const Icon(
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
                  const SizedBox(width: 12.0),
                  const Text(
                    AppConstants.appName,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 20.0,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.5,
                      color: Color(0xFF1D4ED8),
                    ),
                  ),
                ],
              ),
            ),

            // Right: Notification Bell Button (>= 48x48 hit target)
            SizedBox(
              width: AppConstants.minTouchTarget,
              height: AppConstants.minTouchTarget,
              child: IconButton(
                onPressed: onNotificationTap ??
                    () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('No new notifications'),
                          duration: Duration(seconds: 1),
                        ),
                      );
                    },
                icon: const Icon(
                  Icons.notifications_none,
                  color: AppColors.outline,
                  size: 24.0,
                ),
                tooltip: 'Notifications',
                splashRadius: 24.0,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
