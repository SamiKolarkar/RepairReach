import 'package:repairreach_technician/features/jobs/domain/entities/job_status.dart';
import 'package:repairreach_technician/features/schedule/domain/entities/schedule_entry_entity.dart';
import 'package:repairreach_technician/features/schedule/domain/repositories/schedule_repository.dart';

/// In-memory mock repository populated with authentic Stitch schedule fixtures.
class MockScheduleRepository implements ScheduleRepository {
  final List<ScheduleEntryEntity> _todaySchedule = [
    ScheduleEntryEntity(
      id: 'SCHED-TODAY-001',
      customerName: 'Eleanor Shellstrop',
      customerAddress: '742 Evergreen Terrace',
      timeHour: '09',
      timePeriod: 'AM',
      status: JobStatus.inProgress,
      serviceTitle: 'HVAC Maintenance',
      date: DateTime(2024, 5, 14, 9, 0),
      sectionGroup: 'Today',
    ),
    ScheduleEntryEntity(
      id: 'SCHED-TODAY-002',
      customerName: 'Chidi Anagonye',
      customerAddress: '123 Fake Street, Apt 4B',
      timeHour: '01',
      timePeriod: 'PM',
      status: JobStatus.pending,
      serviceTitle: 'Plumbing Diagnosis',
      date: DateTime(2024, 5, 14, 13, 0),
      sectionGroup: 'Today',
    ),
  ];

  final List<ScheduleEntryEntity> _tomorrowSchedule = [
    ScheduleEntryEntity(
      id: 'SCHED-TOMORROW-001',
      customerName: 'Tahani Al-Jamil',
      customerAddress: 'Highgate Mansion Estate',
      timeHour: '10',
      timePeriod: 'AM',
      status: JobStatus.scheduled,
      serviceTitle: 'Electrical Panel Inspection',
      date: DateTime(2024, 5, 15, 10, 0),
      sectionGroup: 'Tomorrow',
    ),
  ];

  final List<UpcomingScheduleEntity> _upcomingSchedule = [
    UpcomingScheduleEntity(
      id: 'SCHED-UPCOMING-001',
      day: '16',
      month: 'May',
      customerName: 'Jason Mendoza',
      serviceDetail: '03:00 PM • Maintenance',
      date: DateTime(2024, 5, 16, 15, 0),
    ),
    UpcomingScheduleEntity(
      id: 'SCHED-UPCOMING-002',
      day: '17',
      month: 'May',
      customerName: 'Michael Realman',
      serviceDetail: '11:30 AM • Diagnosis',
      date: DateTime(2024, 5, 17, 11, 30),
    ),
  ];

  @override
  Future<List<ScheduleEntryEntity>> getTodaySchedule() async {
    return List<ScheduleEntryEntity>.from(_todaySchedule);
  }

  @override
  Future<List<ScheduleEntryEntity>> getTomorrowSchedule() async {
    return List<ScheduleEntryEntity>.from(_tomorrowSchedule);
  }

  @override
  Future<List<UpcomingScheduleEntity>> getUpcomingSchedule() async {
    return List<UpcomingScheduleEntity>.from(_upcomingSchedule);
  }
}
