import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';

/// Grouped list of technician account settings with navigation chevrons.
class AccountSettingsListWidget extends StatelessWidget {
  final VoidCallback? onNotificationsTap;
  final VoidCallback? onSecurityTap;
  final VoidCallback? onHelpTap;

  const AccountSettingsListWidget({
    super.key,
    this.onNotificationsTap,
    this.onSecurityTap,
    this.onHelpTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0),
          child: Text(
            'ACCOUNT SETTINGS',
            style: AppTypography.labelCaps.copyWith(
              color: AppColors.secondary,
              letterSpacing: 0.8,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.stackSm),

        // Settings Card Group
        Container(
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerLowest,
            borderRadius: AppRadius.borderLg,
            border: Border.all(
              color: AppColors.outlineVariant.withOpacity(0.3),
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
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              _buildSettingItem(
                icon: Icons.notifications,
                iconBg: const Color(0xFFEFF6FF), // blue-50
                iconColor: const Color(0xFF2563EB), // blue-600
                title: 'Notification Preferences',
                onTap: onNotificationsTap,
              ),
              Divider(
                height: 1.0,
                thickness: 1.0,
                indent: 16.0,
                endIndent: 16.0,
                color: AppColors.outlineVariant.withOpacity(0.3),
              ),
              _buildSettingItem(
                icon: Icons.security,
                iconBg: const Color(0xFFF8FAFC), // slate-50
                iconColor: const Color(0xFF475569), // slate-600
                title: 'Account Security',
                onTap: onSecurityTap,
              ),
              Divider(
                height: 1.0,
                thickness: 1.0,
                indent: 16.0,
                endIndent: 16.0,
                color: AppColors.outlineVariant.withOpacity(0.3),
              ),
              _buildSettingItem(
                icon: Icons.help_outline,
                iconBg: const Color(0xFFF8FAFC), // slate-50
                iconColor: const Color(0xFF475569), // slate-600
                title: 'Help & Support',
                onTap: onHelpTap,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSettingItem({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: AppConstants.minTouchTarget),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.stackMd,
            vertical: 12.0,
          ),
          child: Row(
            children: [
              Container(
                width: 40.0,
                height: 40.0,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: AppRadius.borderDefault,
                ),
                child: Icon(
                  icon,
                  color: iconColor,
                  size: 22.0,
                ),
              ),
              const SizedBox(width: AppSpacing.stackMd),
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.titleMedium.copyWith(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const Icon(
                Icons.chevron_right,
                color: AppColors.outline,
                size: 20.0,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
