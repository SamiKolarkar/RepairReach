import 'package:flutter/material.dart';
import 'package:repairreach_technician/core/constants/app_constants.dart';
import 'package:repairreach_technician/core/theme/app_colors.dart';
import 'package:repairreach_technician/core/theme/app_radius.dart';
import 'package:repairreach_technician/core/theme/app_spacing.dart';
import 'package:repairreach_technician/core/theme/app_typography.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/technician_profile_entity.dart';
import 'package:repairreach_technician/features/jobs/presentation/widgets/top_app_bar_widget.dart';
import 'package:repairreach_technician/features/schedule/data/repositories/mock_schedule_repository.dart';
import 'package:repairreach_technician/features/schedule/domain/entities/schedule_entry_entity.dart';
import 'package:repairreach_technician/features/schedule/domain/repositories/schedule_repository.dart';
import '../widgets/schedule_job_card_widget.dart';
import '../widgets/schedule_section_header_widget.dart';
import '../widgets/schedule_upcoming_row_widget.dart';

/// Screen displaying chronological service schedule grouped by Today, Tomorrow, and Upcoming.
class ScheduleScreen extends StatefulWidget {
  final ScheduleRepository? repository;
  final TechnicianProfileEntity? profile;
  final VoidCallback? onProfileTap;

  const ScheduleScreen({
    super.key,
    this.repository,
    this.profile,
    this.onProfileTap,
  });

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  late final ScheduleRepository _repository;
  bool _isLoading = true;

  List<ScheduleEntryEntity> _todayJobs = [];
  List<ScheduleEntryEntity> _tomorrowJobs = [];
  List<UpcomingScheduleEntity> _upcomingJobs = [];

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? MockScheduleRepository();
    _loadSchedule();
  }

  Future<void> _loadSchedule() async {
    setState(() => _isLoading = true);
    try {
      final today = await _repository.getTodaySchedule();
      final tomorrow = await _repository.getTomorrowSchedule();
      final upcoming = await _repository.getUpcomingSchedule();

      if (mounted) {
        setState(() {
          _todayJobs = today;
          _tomorrowJobs = tomorrow;
          _upcomingJobs = upcoming;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load schedule: $e')),
        );
      }
    }
  }

  void _handleJobTap(String title, String customerName) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Selected schedule item: $customerName ($title)'),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  void _handleViewAllUpcoming() {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Viewing all upcoming schedule items'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  void _handleFabTap() {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Add New Schedule Entry'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = _todayJobs.length + _tomorrowJobs.length + 1; // 4 active jobs

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: TopAppBarWidget(
        technicianProfile: widget.profile,
        onProfileTap: widget.onProfileTap,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadSchedule,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.marginEdge,
                  vertical: AppSpacing.stackLg,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Screen Header
                    Text(
                      'Service Schedule',
                      style: AppTypography.displayLarge,
                    ),
                    const SizedBox(height: AppSpacing.unit),
                    Text(
                      '$activeCount active jobs assigned for today',
                      style: AppTypography.bodyMedium,
                    ),
                    const SizedBox(height: AppSpacing.stackLg),

                    // Today Section
                    const ScheduleSectionHeaderWidget(
                      title: 'Today',
                      subtitle: 'May 14, 2024',
                      isPrimaryTitle: true,
                    ),
                    if (_todayJobs.isEmpty)
                      _buildEmptyState('No jobs scheduled for today')
                    else
                      ..._todayJobs.map(
                        (entry) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.stackSm),
                          child: ScheduleJobCardWidget(
                            entry: entry,
                            onTap: () => _handleJobTap(entry.serviceTitle, entry.customerName),
                          ),
                        ),
                      ),
                    const SizedBox(height: AppSpacing.stackMd),

                    // Tomorrow Section
                    const ScheduleSectionHeaderWidget(
                      title: 'Tomorrow',
                      subtitle: 'May 15, 2024',
                    ),
                    if (_tomorrowJobs.isEmpty)
                      _buildEmptyState('No jobs scheduled for tomorrow')
                    else
                      ..._tomorrowJobs.map(
                        (entry) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.stackSm),
                          child: ScheduleJobCardWidget(
                            entry: entry,
                            onTap: () => _handleJobTap(entry.serviceTitle, entry.customerName),
                          ),
                        ),
                      ),
                    const SizedBox(height: AppSpacing.stackMd),

                    // Upcoming Section
                    ScheduleSectionHeaderWidget(
                      title: 'Upcoming',
                      trailing: TextButton(
                        onPressed: _handleViewAllUpcoming,
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: const Size(50, 30),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          'View All',
                          style: AppTypography.labelCaps.copyWith(
                            color: const Color(0xFF2563EB),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerLowest,
                        borderRadius: AppRadius.borderLg,
                        border: Border.all(
                          color: AppColors.outlineVariant,
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
                          for (int i = 0; i < _upcomingJobs.length; i++) ...[
                            if (i > 0)
                              Divider(
                                height: 1.0,
                                thickness: 1.0,
                                color: AppColors.outlineVariant.withOpacity(0.3),
                              ),
                            ScheduleUpcomingRowWidget(
                              item: _upcomingJobs[i],
                              onTap: () => _handleJobTap(
                                _upcomingJobs[i].serviceDetail,
                                _upcomingJobs[i].customerName,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(height: AppConstants.bottomNavContentClearance),
                  ],
                ),
              ),
            ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'schedule_screen_fab',
        onPressed: _handleFabTap,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.borderLg,
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        child: const Icon(Icons.add, size: 28.0),
      ),
    );
  }

  Widget _buildEmptyState(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.stackMd),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: AppRadius.borderLg,
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Center(
        child: Text(
          message,
          style: AppTypography.bodyMedium,
        ),
      ),
    );
  }
}
