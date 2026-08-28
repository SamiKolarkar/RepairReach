import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/features/availability/data/repositories/mock_availability_repository.dart';

void main() {
  late MockAvailabilityRepository repository;

  setUp(() {
    repository = MockAvailabilityRepository();
  });

  test('MockAvailabilityRepository returns week days from Mon 23 to Sat 28', () async {
    final days = await repository.getWeekDays();
    expect(days.length, equals(6));
    expect(days[0].dayOfWeek, equals('MON'));
    expect(days[0].dayNumber, equals('23'));
    expect(days[5].dayOfWeek, equals('SAT'));
    expect(days[5].dayNumber, equals('28'));
  });

  test('MockAvailabilityRepository returns 5 shift slots for default date', () async {
    final date = DateTime(2023, 10, 23);
    final slots = await repository.getSlotsForDay(date);
    expect(slots.length, equals(5));

    expect(slots[0].shiftName, equals('Morning Shift'));
    expect(slots[0].isAvailable, isTrue);

    expect(slots[1].shiftName, equals('Midday Shift'));
    expect(slots[1].isAvailable, isTrue);

    expect(slots[2].shiftName, equals('Lunch Break'));
    expect(slots[2].isAvailable, isFalse);
    expect(slots[2].isBreak, isTrue);

    expect(slots[3].shiftName, equals('Afternoon Shift'));
    expect(slots[3].isAvailable, isTrue);

    expect(slots[4].shiftName, equals('Evening Shift'));
    expect(slots[4].isAvailable, isTrue);
  });

  test('MockAvailabilityRepository toggleSlotAvailability updates slot state', () async {
    final date = DateTime(2023, 10, 23);
    await repository.toggleSlotAvailability(date, 'SLOT-1', false);
    final slots = await repository.getSlotsForDay(date);
    expect(slots[0].isAvailable, isFalse);
  });

  test('MockAvailabilityRepository toggleBlockFullDay blocks all slots', () async {
    final date = DateTime(2023, 10, 23);
    await repository.toggleBlockFullDay(date, true);
    final isBlocked = await repository.isFullDayBlocked(date);
    expect(isBlocked, isTrue);

    final slots = await repository.getSlotsForDay(date);
    for (final slot in slots) {
      expect(slot.isAvailable, isFalse);
    }
  });

  test('MockAvailabilityRepository returns weekly capacity entity', () async {
    final capacity = await repository.getWeeklyCapacity();
    expect(capacity.availableHours, equals(32));
    expect(capacity.description, contains('32 available hours remaining'));
  });
}
