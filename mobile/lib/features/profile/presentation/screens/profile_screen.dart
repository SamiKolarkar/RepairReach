import 'package:flutter/material.dart';
import 'package:repairreach_technician/core/constants/app_constants.dart';
import 'package:repairreach_technician/core/theme/app_colors.dart';
import 'package:repairreach_technician/core/theme/app_radius.dart';
import 'package:repairreach_technician/core/theme/app_spacing.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/technician_profile_entity.dart';
import 'package:repairreach_technician/features/jobs/presentation/widgets/top_app_bar_widget.dart';
import 'package:repairreach_technician/features/profile/data/repositories/mock_profile_repository.dart';
import 'package:repairreach_technician/features/profile/domain/repositories/profile_repository.dart';
import '../widgets/account_settings_list_widget.dart';
import '../widgets/availability_summary_bento_widget.dart';
import '../widgets/logout_button_widget.dart';
import '../widgets/technician_info_card_widget.dart';

/// Screen displaying technician identity, availability summary, account settings, and logout.
class ProfileScreen extends StatefulWidget {
  final ProfileRepository? repository;
  final VoidCallback? onAdjustShift;

  const ProfileScreen({
    super.key,
    this.repository,
    this.onAdjustShift,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final ProfileRepository _repository;
  bool _isLoading = true;

  TechnicianProfileEntity _profile = const TechnicianProfileEntity(
    id: 'tech-001',
    name: 'Alex Smith',
    avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDcDKlEtfF1Y24iRzl1kaJsO--fgbHYV8V-JuPmaiwcXH7hPdJ_qNOyUGsVGcQg3TRUVpV3mUn1ndGMhn5qGrS4CdY5y2QLr9LsB6pGhrSwW4SRe2A7o_kwRDC5WVQqDukQHihZuWQ7annGdGVLy1fuIEkD2BInDOPJnA35MFcpdFQhlDzPQH8lKd2KNyhj4-7pjrnL7-ayeu3oAk22GkkErRwUe1HNJTVMLdaaaYw94TdtZP7o-7YL14YtyosJEPfVbtPX_gzVcsE',
    phone: '(555) 123-4567',
    rating: 4.9,
    reviewCount: 124,
    status: 'Online',
    nextShift: 'Tomorrow, 08:00 AM',
    weeklyHours: 38.5,
  );

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? MockProfileRepository();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    try {
      final profile = await _repository.getProfile();

      if (mounted) {
        setState(() {
          _profile = profile;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load profile: $e')),
        );
      }
    }
  }

  void _handleSettingTap(String settingName) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Opening $settingName...'),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.borderLg),
        title: const Text('Sign Out?'),
        content: const Text(
          'Are you sure you want to sign out of RepairReach Technician?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: AppColors.onError,
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _repository.signOut();
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Signed out successfully.'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: TopAppBarWidget(
        technicianProfile: _profile,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadProfile,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.marginEdge,
                  vertical: AppSpacing.stackLg,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Technician Profile Card
                    TechnicianInfoCardWidget(profile: _profile),
                    const SizedBox(height: AppSpacing.stackLg),

                    // Availability Summary Bento
                    AvailabilitySummaryBentoWidget(
                      profile: _profile,
                      onAdjustShift: widget.onAdjustShift ??
                          () {
                            ScaffoldMessenger.of(context).hideCurrentSnackBar();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Navigate to Availability to adjust shift'),
                                duration: Duration(seconds: 1),
                              ),
                            );
                          },
                    ),
                    const SizedBox(height: AppSpacing.stackLg),

                    // Account Settings Menu List
                    AccountSettingsListWidget(
                      onNotificationsTap: () => _handleSettingTap('Notification Preferences'),
                      onSecurityTap: () => _handleSettingTap('Account Security'),
                      onHelpTap: () => _handleSettingTap('Help & Support'),
                    ),
                    const SizedBox(height: AppSpacing.stackLg),

                    // Logout Button
                    LogoutButtonWidget(
                      onLogout: _handleLogout,
                    ),

                    const SizedBox(height: AppConstants.bottomNavContentClearance),
                  ],
                ),
              ),
            ),
    );
  }
}
