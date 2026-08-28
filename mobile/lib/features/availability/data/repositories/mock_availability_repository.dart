import 'package:flutter/material.dart';
import '../../domain/entities/availability_slot_entity.dart';
import '../../domain/repositories/availability_repository.dart';

/// In-memory mock repository populated with authentic Stitch availability fixtures.
class MockAvailabilityRepository implements AvailabilityRepository {
  final List<AvailabilityDayEntity> _weekDays = [
    AvailabilityDayEntity(
      date: DateTime(2023, 10, 23),
      dayOfWeek: 'MON',
      dayNumber: '23',
    ),
    AvailabilityDayEntity(
      date: DateTime(2023, 10, 24),
      dayOfWeek: 'TUE',
      dayNumber: '24',
    ),
    AvailabilityDayEntity(
      date: DateTime(2023, 10, 25),
      dayOfWeek: 'WED',
      dayNumber: '25',
    ),
    AvailabilityDayEntity(
      date: DateTime(2023, 10, 26),
      dayOfWeek: 'THU',
      dayNumber: '26',
    ),
    AvailabilityDayEntity(
      date: DateTime(2023, 10, 27),
      dayOfWeek: 'FRI',
      dayNumber: '27',
    ),
    AvailabilityDayEntity(
      date: DateTime(2023, 10, 28),
      dayOfWeek: 'SAT',
      dayNumber: '28',
    ),
  ];

  final Map<String, List<AvailabilitySlotEntity>> _daySlots = {};
  final Map<String, bool> _blockedDays = {};

  MockAvailabilityRepository() {
    _initDefaultSlots();
  }

  void _initDefaultSlots() {
    for (final day in _weekDays) {
      final key = _dayKey(day.date);
      _blockedDays[key] = false;
      _daySlots[key] = [
        const AvailabilitySlotEntity(
          id: 'SLOT-1',
          timeRange: '09:00 AM - 11:00 AM',
          shiftName: 'Morning Shift',
          icon: Icons.wb_sunny,
          isAvailable: true,
        ),
        const AvailabilitySlotEntity(
          id: 'SLOT-2',
          timeRange: '11:00 AM - 01:00 PM',
          shiftName: 'Midday Shift',
          icon: Icons.light_mode,
          isAvailable: true,
        ),
        const AvailabilitySlotEntity(
          id: 'SLOT-3',
          timeRange: '01:00 PM - 02:00 PM',
          shiftName: 'Lunch Break',
          icon: Icons.restaurant,
          isAvailable: false,
          isBreak: true,
        ),
        const AvailabilitySlotEntity(
          id: 'SLOT-4',
          timeRange: '02:00 PM - 04:00 PM',
          shiftName: 'Afternoon Shift',
          icon: Icons.wb_twilight,
          isAvailable: true,
        ),
        const AvailabilitySlotEntity(
          id: 'SLOT-5',
          timeRange: '04:00 PM - 06:00 PM',
          shiftName: 'Evening Shift',
          icon: Icons.bedtime,
          isAvailable: true,
        ),
      ];
    }
  }

  String _dayKey(DateTime date) => '${date.year}-${date.month}-${date.day}';

  @override
  Future<List<AvailabilityDayEntity>> getWeekDays() async {
    return _weekDays.map((d) {
      final isBlocked = _blockedDays[_dayKey(d.date)] ?? false;
      return d.copyWith(isBlocked: isBlocked);
    }).toList();
  }

  @override
  Future<List<AvailabilitySlotEntity>> getSlotsForDay(DateTime date) async {
    final key = _dayKey(date);
    final slots = _daySlots[key];
    if (slots != null) {
      return List<AvailabilitySlotEntity>.from(slots);
    }
    return [
      const AvailabilitySlotEntity(
        id: 'SLOT-1',
        timeRange: '09:00 AM - 11:00 AM',
        shiftName: 'Morning Shift',
        icon: Icons.wb_sunny,
        isAvailable: true,
      ),
      const AvailabilitySlotEntity(
        id: 'SLOT-2',
        timeRange: '11:00 AM - 01:00 PM',
        shiftName: 'Midday Shift',
        icon: Icons.light_mode,
        isAvailable: true,
      ),
      const AvailabilitySlotEntity(
        id: 'SLOT-3',
        timeRange: '01:00 PM - 02:00 PM',
        shiftName: 'Lunch Break',
        icon: Icons.restaurant,
        isAvailable: false,
        isBreak: true,
      ),
      const AvailabilitySlotEntity(
        id: 'SLOT-4',
        timeRange: '02:00 PM - 04:00 PM',
        shiftName: 'Afternoon Shift',
        icon: Icons.wb_twilight,
        isAvailable: true,
      ),
      const AvailabilitySlotEntity(
        id: 'SLOT-5',
        timeRange: '04:00 PM - 06:00 PM',
        shiftName: 'Evening Shift',
        icon: Icons.bedtime,
        isAvailable: true,
      ),
    ];
  }

  @override
  Future<WeeklyCapacityEntity> getWeeklyCapacity() async {
    return const WeeklyCapacityEntity(
      availableHours: 32,
      description: 'You have 32 available hours remaining this week.',
    );
  }

  @override
  Future<bool> isFullDayBlocked(DateTime date) async {
    return _blockedDays[_dayKey(date)] ?? false;
  }

  @override
  Future<void> toggleSlotAvailability(DateTime date, String slotId, bool isAvailable) async {
    final key = _dayKey(date);
    final slots = _daySlots[key];
    if (slots != null) {
      final index = slots.indexWhere((s) => s.id == slotId);
      if (index != -1) {
        slots[index] = slots[index].copyWith(isAvailable: isAvailable);
      }
    }
  }

  @override
  Future<void> toggleBlockFullDay(DateTime date, bool isBlocked) async {
    final key = _dayKey(date);
    _blockedDays[key] = isBlocked;
    final slots = _daySlots[key];
    if (slots != null) {
      for (int i = 0; i < slots.length; i++) {
        // If blocked, set isAvailable to false; if unblocked, restore default availability
        if (isBlocked) {
          slots[i] = slots[i].copyWith(isAvailable: false);
        } else {
          slots[i] = slots[i].copyWith(isAvailable: !slots[i].isBreak);
        }
      }
    }
  }
}
