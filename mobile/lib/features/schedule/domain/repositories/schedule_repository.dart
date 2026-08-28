import '../entities/schedule_entry_entity.dart';

/// Abstract domain repository interface for technician schedule operations.
abstract class ScheduleRepository {
  Future<List<ScheduleEntryEntity>> getTodaySchedule();
  Future<List<ScheduleEntryEntity>> getTomorrowSchedule();
  Future<List<UpcomingScheduleEntity>> getUpcomingSchedule();
}
