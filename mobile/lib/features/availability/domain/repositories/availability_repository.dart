import '../entities/availability_slot_entity.dart';

/// Abstract domain repository interface for technician availability operations.
abstract class AvailabilityRepository {
  Future<List<AvailabilityDayEntity>> getWeekDays();
  Future<List<AvailabilitySlotEntity>> getSlotsForDay(DateTime date);
  Future<WeeklyCapacityEntity> getWeeklyCapacity();
  Future<bool> isFullDayBlocked(DateTime date);
  Future<void> toggleSlotAvailability(DateTime date, String slotId, bool isAvailable);
  Future<void> toggleBlockFullDay(DateTime date, bool isBlocked);
}
