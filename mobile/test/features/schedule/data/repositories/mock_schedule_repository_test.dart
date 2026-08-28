import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/job_status.dart';
import 'package:repairreach_technician/features/schedule/data/repositories/mock_schedule_repository.dart';

void main() {
  late MockScheduleRepository repository;

  setUp(() {
    repository = MockScheduleRepository();
  });

  test('MockScheduleRepository returns today schedule items matching Stitch design',
      () async {
    final today = await repository.getTodaySchedule();
    expect(today.length, equals(2));
    expect(today[0].customerName, equals('Eleanor Shellstrop'));
    expect(today[0].timeHour, equals('09'));
    expect(today[0].timePeriod, equals('AM'));
    expect(today[0].status, equals(JobStatus.inProgress));

    expect(today[1].customerName, equals('Chidi Anagonye'));
    expect(today[1].timeHour, equals('01'));
    expect(today[1].timePeriod, equals('PM'));
    expect(today[1].status, equals(JobStatus.pending));
  });

  test('MockScheduleRepository returns tomorrow schedule item', () async {
    final tomorrow = await repository.getTomorrowSchedule();
    expect(tomorrow.length, equals(1));
    expect(tomorrow[0].customerName, equals('Tahani Al-Jamil'));
    expect(tomorrow[0].status, equals(JobStatus.scheduled));
    expect(tomorrow[0].customerAddress, equals('Highgate Mansion Estate'));
  });

  test('MockScheduleRepository returns upcoming schedule items', () async {
    final upcoming = await repository.getUpcomingSchedule();
    expect(upcoming.length, equals(2));
    expect(upcoming[0].customerName, equals('Jason Mendoza'));
    expect(upcoming[0].day, equals('16'));
    expect(upcoming[0].month, equals('May'));

    expect(upcoming[1].customerName, equals('Michael Realman'));
    expect(upcoming[1].day, equals('17'));
    expect(upcoming[1].month, equals('May'));
  });
}
