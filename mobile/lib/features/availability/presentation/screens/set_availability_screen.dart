import 'package:flutter/material.dart';
import 'package:repairreach_technician/core/constants/app_constants.dart';
import 'package:repairreach_technician/core/theme/app_colors.dart';
import 'package:repairreach_technician/core/theme/app_spacing.dart';
import 'package:repairreach_technician/core/theme/app_typography.dart';
import 'package:repairreach_technician/features/availability/data/repositories/mock_availability_repository.dart';
import 'package:repairreach_technician/features/availability/domain/entities/availability_slot_entity.dart';
import 'package:repairreach_technician/features/availability/domain/repositories/availability_repository.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/technician_profile_entity.dart';
import 'package:repairreach_technician/features/jobs/presentation/widgets/top_app_bar_widget.dart';
import '../widgets/availability_slot_card_widget.dart';
import '../widgets/block_day_card_widget.dart';
import '../widgets/date_selector_strip_widget.dart';
import '../widgets/weekly_capacity_card_widget.dart';

/// Screen allowing technicians to manage daily shift availability and block entire days.
class SetAvailabilityScreen extends StatefulWidget {
  final AvailabilityRepository? repository;
  final TechnicianProfileEntity? profile;
  final VoidCallback? onProfileTap;

  const SetAvailabilityScreen({
    super.key,
    this.repository,
    this.profile,
    this.onProfileTap,
  });

  @override
  State<SetAvailabilityScreen> createState() => _SetAvailabilityScreenState();
}

class _SetAvailabilityScreenState extends State<SetAvailabilityScreen> {
  late final AvailabilityRepository _repository;
  bool _isLoading = true;

  List<AvailabilityDayEntity> _days = [];
  DateTime _selectedDate = DateTime(2023, 10, 23);
  bool _isFullDayBlocked = false;
  List<AvailabilitySlotEntity> _slots = [];
  WeeklyCapacityEntity _capacity = const WeeklyCapacityEntity(
    availableHours: 32,
    description: 'You have 32 available hours remaining this week.',
  );

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? MockAvailabilityRepository();
    _loadAvailability();
  }

  Future<void> _loadAvailability() async {
    setState(() => _isLoading = true);
    try {
      final days = await _repository.getWeekDays();
      final slots = await _repository.getSlotsForDay(_selectedDate);
      final blocked = await _repository.isFullDayBlocked(_selectedDate);
      final capacity = await _repository.getWeeklyCapacity();

      if (mounted) {
        setState(() {
          _days = days;
          _slots = slots;
          _isFullDayBlocked = blocked;
          _capacity = capacity;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load availability: $e')),
        );
      }
    }
  }

  Future<void> _handleDateSelected(DateTime date) async {
    setState(() {
      _selectedDate = date;
      _isLoading = true;
    });

    final slots = await _repository.getSlotsForDay(date);
    final blocked = await _repository.isFullDayBlocked(date);

    if (mounted) {
      setState(() {
        _slots = slots;
        _isFullDayBlocked = blocked;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleBlockFullDayToggle(bool value) async {
    await _repository.toggleBlockFullDay(_selectedDate, value);
    final updatedSlots = await _repository.getSlotsForDay(_selectedDate);
    final updatedDays = await _repository.getWeekDays();

    if (mounted) {
      setState(() {
        _isFullDayBlocked = value;
        _slots = updatedSlots;
        _days = updatedDays;
      });

      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            value
                ? 'Full day marked as unavailable'
                : 'Full day unblocked',
          ),
          backgroundColor: value ? AppColors.error : AppColors.primary,
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  Future<void> _handleSlotToggle(AvailabilitySlotEntity slot, bool value) async {
    await _repository.toggleSlotAvailability(_selectedDate, slot.id, value);
    final updatedSlots = await _repository.getSlotsForDay(_selectedDate);

    if (mounted) {
      setState(() {
        _slots = updatedSlots;
      });

      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${slot.shiftName} set to ${value ? "Available" : "Unavailable"}',
          ),
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  void _handleMonthPickerTap() {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Select Month: October 2023'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  void _handleViewReport() {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Opening Weekly Capacity Report...'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: TopAppBarWidget(
        technicianProfile: widget.profile,
        onProfileTap: widget.onProfileTap,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadAvailability,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.marginEdge,
                  vertical: AppSpacing.stackLg,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header: Title & Month Picker Button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            'Manage Availability',
                            style: AppTypography.headlineMedium,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.stackSm),
                        InkWell(
                          onTap: _handleMonthPickerTap,
                          borderRadius: BorderRadius.circular(8.0),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6.0,
                              vertical: 4.0,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.calendar_month,
                                  size: 18.0,
                                  color: AppColors.primary,
                                ),
                                const SizedBox(width: 4.0),
                                Text(
                                  'October 2023',
                                  style: AppTypography.labelCaps.copyWith(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.stackMd),

                    // Horizontal Date Selector Strip
                    DateSelectorStripWidget(
                      days: _days,
                      selectedDate: _selectedDate,
                      onDateSelected: _handleDateSelected,
                    ),
                    const SizedBox(height: AppSpacing.stackLg),

                    // Block Full Day Card
                    BlockDayCardWidget(
                      isBlocked: _isFullDayBlocked,
                      onToggle: _handleBlockFullDayToggle,
                    ),
                    const SizedBox(height: AppSpacing.stackLg),

                    // Availability Slots Section
                    Text(
                      'AVAILABILITY SLOTS',
                      style: AppTypography.labelCaps.copyWith(
                        color: AppColors.onSurfaceVariant,
                        letterSpacing: 1.2,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.stackMd),

                    // Slots list
                    ..._slots.map(
                      (slot) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.stackMd),
                        child: AvailabilitySlotCardWidget(
                          slot: slot,
                          onToggle: (val) => _handleSlotToggle(slot, val),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.stackMd),

                    // Weekly Capacity Card
                    WeeklyCapacityCardWidget(
                      capacity: _capacity,
                      onViewReport: _handleViewReport,
                    ),

                    const SizedBox(height: AppConstants.bottomNavContentClearance),
                  ],
                ),
              ),
            ),
    );
  }
}
