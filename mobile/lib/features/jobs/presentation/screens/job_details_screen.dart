import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/repositories/mock_job_repository.dart';
import '../../domain/entities/job_entity.dart';
import '../../domain/entities/job_status.dart';
import '../../domain/entities/technician_profile_entity.dart';
import '../../domain/repositories/job_repository.dart';
import '../widgets/customer_info_card_widget.dart';
import '../widgets/equipment_parts_bento_widget.dart';
import '../widgets/job_details_app_bar_widget.dart';
import '../widgets/location_map_card_widget.dart';
import '../widgets/problem_quote_card_widget.dart';
import '../widgets/sticky_job_action_bar_widget.dart';

/// Screen displaying comprehensive job details, location map preview, reported problem, and action footer.
class JobDetailsScreen extends StatefulWidget {
  final JobEntity? job;
  final String? jobId;
  final JobRepository? repository;

  const JobDetailsScreen({
    super.key,
    this.job,
    this.jobId,
    this.repository,
  });

  @override
  State<JobDetailsScreen> createState() => _JobDetailsScreenState();
}

class _JobDetailsScreenState extends State<JobDetailsScreen> {
  late final JobRepository _repository;
  bool _isLoading = true;

  JobEntity? _currentJob;
  TechnicianProfileEntity? _profile;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? MockJobRepository();
    _initJob();
  }

  Future<void> _initJob() async {
    setState(() => _isLoading = true);
    try {
      final profile = await _repository.getTechnicianProfile();

      JobEntity? job = widget.job;
      if (job == null) {
        final id = widget.jobId ?? 'JOB-2023-001';
        job = await _repository.getJobById(id);
        if (job == null) {
          final allJobs = await _repository.getTodaysJobs();
          if (allJobs.isNotEmpty) {
            job = allJobs.first;
          }
        }
      }

      if (mounted) {
        setState(() {
          _profile = profile;
          _currentJob = job;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load job details: $e')),
        );
      }
    }
  }

  Future<void> _handleReject() async {
    if (_currentJob == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.borderLg),
        title: const Text('Reject Job Assignment?'),
        content: Text(
          'Are you sure you want to report unable to serve for "${_currentJob!.serviceTitle}" (${_currentJob!.customerName})?',
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
      await _repository.updateJobStatus(_currentJob!.id, JobStatus.unableToServe);
      final updated = await _repository.getJobById(_currentJob!.id);

      if (mounted) {
        setState(() {
          if (updated != null) {
            _currentJob = updated;
          }
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Job "${_currentJob!.serviceTitle}" rejected.'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Future<void> _handleIntermediateAction() async {
    if (_currentJob == null) return;

    JobStatus nextStatus;
    String actionMessage;

    switch (_currentJob!.status) {
      case JobStatus.pending:
        nextStatus = JobStatus.accepted;
        actionMessage = 'Job accepted!';
        break;
      case JobStatus.accepted:
        nextStatus = JobStatus.inProgress;
        actionMessage = 'Status set to En Route.';
        break;
      case JobStatus.inProgress:
        nextStatus = JobStatus.inProgress;
        actionMessage = 'Technician arrived on site.';
        break;
      default:
        nextStatus = JobStatus.accepted;
        actionMessage = 'Job updated.';
        break;
    }

    await _repository.updateJobStatus(_currentJob!.id, nextStatus);
    final updated = await _repository.getJobById(_currentJob!.id);

    if (mounted) {
      setState(() {
        if (updated != null) {
          _currentJob = updated;
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(actionMessage),
          backgroundColor: AppColors.primary,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _handleMarkCompleted() async {
    if (_currentJob == null) return;

    await _repository.updateJobStatus(_currentJob!.id, JobStatus.completed);
    final updated = await _repository.getJobById(_currentJob!.id);

    if (mounted) {
      setState(() {
        if (updated != null) {
          _currentJob = updated;
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Marked "${_currentJob!.serviceTitle}" for ${_currentJob!.customerName} as Completed!',
          ),
          backgroundColor: AppColors.statusAcceptedText,
          duration: const Duration(seconds: 2),
        ),
      );
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

  void _handleChat(String phone, String customerName) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Opening chat with $customerName ($phone)...'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _handleGetDirections(String address) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Launching navigation to $address...'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: JobDetailsAppBarWidget(
        technicianProfile: _profile,
      ),
      body: _isLoading || _currentJob == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.marginEdge,
                vertical: AppSpacing.stackLg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status & Time Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12.0,
                          vertical: 4.0,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.secondaryContainer,
                          borderRadius: AppRadius.borderFull,
                        ),
                        child: Text(
                          _currentJob!.status == JobStatus.inProgress
                              ? 'IN PROGRESS'
                              : 'UPCOMING JOB',
                          style: AppTypography.labelCaps.copyWith(
                            color: AppColors.onSecondaryContainer,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.schedule,
                            size: 16.0,
                            color: AppColors.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4.0),
                          Text(
                            _currentJob!.timeWindow,
                            style: AppTypography.labelCaps.copyWith(
                              color: AppColors.onSurfaceVariant,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.stackMd),

                  // Customer Card
                  CustomerInfoCardWidget(
                    customerName: _currentJob!.customerName,
                    clientType: _currentJob!.clientType,
                    customerPhone: _currentJob!.customerPhone,
                    onCall: () => _handleCall(
                      _currentJob!.customerPhone,
                      _currentJob!.customerName,
                    ),
                    onChat: () => _handleChat(
                      _currentJob!.customerPhone,
                      _currentJob!.customerName,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.stackMd),

                  // Location Card with Map Preview
                  LocationMapCardWidget(
                    address: _currentJob!.address,
                    city: _currentJob!.city,
                    mapImageUrl: _currentJob!.mapImageUrl,
                    estimatedTravelTime: _currentJob!.estimatedTravelTime,
                    onGetDirections: () => _handleGetDirections(
                      '${_currentJob!.address}, ${_currentJob!.city}',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.stackMd),

                  // Reported Problem Card
                  ProblemQuoteCardWidget(
                    description: _currentJob!.description,
                    categoryName: _currentJob!.serviceCategory.displayName,
                    priority: _currentJob!.priority,
                  ),
                  const SizedBox(height: AppSpacing.stackMd),

                  // Equipment & Parts Bento
                  EquipmentPartsBentoWidget(
                    equipment: _currentJob!.equipment,
                    potentialParts: _currentJob!.potentialParts,
                  ),

                  // Bottom Clearance for Sticky Action Bar
                  const SizedBox(height: 120.0),
                ],
              ),
            ),
      bottomNavigationBar: _currentJob != null
          ? StickyJobActionBarWidget(
              status: _currentJob!.status,
              onReject: _handleReject,
              onIntermediateAction: _handleIntermediateAction,
              onMarkCompleted: _handleMarkCompleted,
            )
          : null,
    );
  }
}
