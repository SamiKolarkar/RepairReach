import 'package:flutter/material.dart';
import 'package:repairreach_technician/core/theme/app_colors.dart';
import 'package:repairreach_technician/core/theme/app_radius.dart';
import 'package:repairreach_technician/core/theme/app_typography.dart';

/// Full-width outline button for technician session logout.
class LogoutButtonWidget extends StatelessWidget {
  final VoidCallback? onLogout;

  const LogoutButtonWidget({
    super.key,
    this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52.0,
      child: OutlinedButton.icon(
        onPressed: onLogout,
        icon: const Icon(
          Icons.logout,
          color: AppColors.error,
          size: 20.0,
        ),
        label: Text(
          'Logout',
          style: AppTypography.titleMedium.copyWith(
            color: AppColors.error,
            fontWeight: FontWeight.w600,
          ),
        ),
        style: OutlinedButton.styleFrom(
          backgroundColor: AppColors.surfaceContainerLowest,
          side: BorderSide(
            color: AppColors.error.withOpacity(0.25),
            width: 1.0,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.borderLg,
          ),
          elevation: 1.0,
          shadowColor: const Color(0x0A000000),
        ),
      ),
    );
  }
}
