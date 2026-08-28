import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/navigation/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../data/repositories/mock_job_repository.dart';
import '../../domain/entities/job_entity.dart';
import '../../domain/entities/job_status.dart';
import '../../domain/entities/job_summary_metrics_entity.dart';
import '../../domain/entities/technician_profile_entity.dart';
import '../../domain/repositories/job_repository.dart';
import '../widgets/bottom_nav_bar_widget.dart';
import '../widgets/date_header_widget.dart';
import '../widgets/job_card_widget.dart';
import '../widgets/summary_metrics_widget.dart';
import '../widgets/top_app_bar_widget.dart';

/// Primary screen displaying today's assigned jobs and technician summary metrics.
class TodaysJobsScreen extends StatefulWidget {
  final JobRepository? repository;
  final bool showBottomNav;
  final VoidCallback? onProfileTap;

  const TodaysJobsScreen({
    super.key,
    this.repository,
    this.showBottomNav = true,
    this.onProfileTap,
  });

  @override
  State<TodaysJobsScreen> createState() => _TodaysJobsScreenState();
}

class _TodaysJobsScreenState extends State<TodaysJobsScreen> {
  late final JobRepository _repository;
  bool _isLoading = true;
  int _currentTabIndex = 0;

  TechnicianProfileEntity? _profile;
  JobSummaryMetricsEntity _metrics = const JobSummaryMetricsEntity(
    dateDisplay: 'October 24, 2023',
    completedCount: 4,
    remainingCount: 2,
    totalAssigned: 6,
  );
  List<JobEntity> _jobs = [];

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? MockJobRepository();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final profile = await _repository.getTechnicianProfile();
      final metrics = await _repository.getJobSummary();
      final jobs = await _repository.getTodaysJobs();

      if (mounted) {
        setState(() {
          _profile = profile;
          _metrics = metrics;
          _jobs = jobs;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load jobs: $e')),
        );
      }
    }
  }

  Future<void> _handleMarkCompleted(JobEntity job) async {
    await _repository.updateJobStatus(job.id, JobStatus.completed);
    final updatedJobs = await _repository.getTodaysJobs();
    final updatedMetrics = await _repository.getJobSummary();

    if (mounted) {
      setState(() {
        _jobs = updatedJobs;
        _metrics = updatedMetrics;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Marked "${job.serviceTitle}" for ${job.customerName} as Completed!'),
          backgroundColor: AppColors.statusAcceptedText,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _handleAcceptJob(JobEntity job) async {
    await _repository.updateJobStatus(job.id, JobStatus.accepted);
    final updatedJobs = await _repository.getTodaysJobs();
    final updatedMetrics = await _repository.getJobSummary();

    if (mounted) {
      setState(() {
        _jobs = updatedJobs;
        _metrics = updatedMetrics;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Accepted job "${job.serviceTitle}" for ${job.customerName}!'),
          backgroundColor: AppColors.primary,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _handleRejectJob(JobEntity job) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.borderLg),
        title: const Text('Reject Job Assignment?'),
        content: Text(
          'Are you sure you want to report unable to serve for "${job.serviceTitle}" (${job.customerName})?',
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
            child: const Text('Confirm Reject'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _repository.updateJobStatus(job.id, JobStatus.unableToServe);
      final updatedJobs = await _repository.getTodaysJobs();
      final updatedMetrics = await _repository.getJobSummary();

      if (mounted) {
        setState(() {
          _jobs = updatedJobs;
          _metrics = updatedMetrics;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Reported unable to serve for "${job.serviceTitle}".'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  void _handleCall(String phone, String customerName) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Dialing $customerName ($phone)...'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _handleWhatsApp(String phone, String customerName) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Opening WhatsApp chat with $customerName ($phone)...'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _handleTabSelected(int index) {
    setState(() => _currentTabIndex = index);

    final tabNames = ['Home', 'Schedule', 'Availability', 'Profile'];
    if (index != 0) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${tabNames[index]} tab selected'),
          duration: const Duration(milliseconds: 1000),
        ),
      );
    }
  }

  void _handleFabTap() {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('New Job / Quick Task action triggered'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: TopAppBarWidget(
        technicianProfile: _profile,
        onProfileTap: widget.onProfileTap ?? () => _handleTabSelected(3),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.marginEdge,
                  vertical: AppSpacing.stackLg,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Section Title & Date Subtitle
                    DateHeaderWidget(
                      title: "Today's Jobs",
                      dateDisplay: _metrics.dateDisplay,
                    ),
                    const SizedBox(height: AppSpacing.stackMd),

                    // Job Cards List
                    if (_jobs.isEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(AppSpacing.stackLg),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerLowest,
                          borderRadius: AppRadius.borderLg,
                          border: Border.all(color: AppColors.outlineVariant),
                        ),
                        child: const Column(
                          children: [
                            Icon(
                              Icons.assignment_turned_in_outlined,
                              size: 48.0,
                              color: AppColors.outline,
                            ),
                            SizedBox(height: AppSpacing.stackSm),
                            Text(
                              'No jobs assigned for today',
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 16.0,
                                fontWeight: FontWeight.w600,
                                color: AppColors.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      ..._jobs.map((job) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.stackMd),
                          child: JobCardWidget(
                            job: job,
                            onTap: () {
                              Navigator.of(context).pushNamed(
                                AppRoutes.jobDetails,
                                arguments: job,
                              );
                            },
                            onMarkCompleted: () => _handleMarkCompleted(job),
                            onAccept: () => _handleAcceptJob(job),
                            onReject: () => _handleRejectJob(job),
                            onCall: () => _handleCall(job.customerPhone, job.customerName),
                            onWhatsApp: () => _handleWhatsApp(job.customerPhone, job.customerName),
                          ),
                        );
                      }),
                    ],

                    // Summary Stats Section
                    SummaryMetricsWidget(metrics: _metrics),

                    // Bottom padding to clear FAB and persistent bottom nav
                    const SizedBox(height: AppConstants.bottomNavContentClearance),
                  ],
                ),
              ),
            ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'todays_jobs_fab',
        onPressed: _handleFabTap,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.borderLg,
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        child: const Icon(Icons.add, size: 28.0),
      ),
      bottomNavigationBar: widget.showBottomNav
          ? BottomNavBarWidget(
              selectedIndex: _currentTabIndex,
              onTabSelected: _handleTabSelected,
            )
          : null,
    );
  }
}
