import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

/// Pure domain entity representing an availability time slot.
class AvailabilitySlotEntity extends Equatable {
  final String id;
  final String timeRange;
  final String shiftName;
  final IconData icon;
  final bool isAvailable;
  final bool isBreak;

  const AvailabilitySlotEntity({
    required this.id,
    required this.timeRange,
    required this.shiftName,
    required this.icon,
    required this.isAvailable,
    this.isBreak = false,
  });

  AvailabilitySlotEntity copyWith({
    String? id,
    String? timeRange,
    String? shiftName,
    IconData? icon,
    bool? isAvailable,
    bool? isBreak,
  }) {
    return AvailabilitySlotEntity(
      id: id ?? this.id,
      timeRange: timeRange ?? this.timeRange,
      shiftName: shiftName ?? this.shiftName,
      icon: icon ?? this.icon,
      isAvailable: isAvailable ?? this.isAvailable,
      isBreak: isBreak ?? this.isBreak,
    );
  }

  @override
  List<Object?> get props => [
        id,
        timeRange,
        shiftName,
        icon,
        isAvailable,
        isBreak,
      ];
}

/// Pure domain entity representing a day in the weekly availability calendar.
class AvailabilityDayEntity extends Equatable {
  final DateTime date;
  final String dayOfWeek;
  final String dayNumber;
  final bool isBlocked;

  const AvailabilityDayEntity({
    required this.date,
    required this.dayOfWeek,
    required this.dayNumber,
    this.isBlocked = false,
  });

  AvailabilityDayEntity copyWith({
    DateTime? date,
    String? dayOfWeek,
    String? dayNumber,
    bool? isBlocked,
  }) {
    return AvailabilityDayEntity(
      date: date ?? this.date,
      dayOfWeek: dayOfWeek ?? this.dayOfWeek,
      dayNumber: dayNumber ?? this.dayNumber,
      isBlocked: isBlocked ?? this.isBlocked,
    );
  }

  @override
  List<Object?> get props => [
        date,
        dayOfWeek,
        dayNumber,
        isBlocked,
      ];
}

/// Pure domain entity representing weekly capacity statistics.
class WeeklyCapacityEntity extends Equatable {
  final int availableHours;
  final String description;

  const WeeklyCapacityEntity({
    required this.availableHours,
    required this.description,
  });

  @override
  List<Object?> get props => [availableHours, description];
}
