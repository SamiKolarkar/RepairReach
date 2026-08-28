import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/features/jobs/data/repositories/mock_job_repository.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/job_status.dart';

void main() {
  group('MockJobRepository', () {
    late MockJobRepository repository;

    setUp(() {
      repository = MockJobRepository();
    });

    test('returns initial jobs fixtures conforming to Stitch design', () async {
      final jobs = await repository.getTodaysJobs();
      expect(jobs.length, 2);

      final job1 = jobs[0];
      expect(job1.id, 'JOB-2023-001');
      expect(job1.customerName, 'John Doe');
      expect(job1.status, JobStatus.accepted);
      expect(job1.serviceTitle, 'AC Repair');
      expect(job1.mapImageUrl, isNotNull);

      final job2 = jobs[1];
      expect(job2.id, 'JOB-2023-002');
      expect(job2.customerName, 'Jane Smith');
      expect(job2.status, JobStatus.pending);
      expect(job2.serviceTitle, 'Pipe Leakage');
    });

    test('returns summary metrics matching initial design state', () async {
      final metrics = await repository.getJobSummary();
      expect(metrics.dateDisplay, 'October 24, 2023');
      expect(metrics.completedCount, 4);
      expect(metrics.remainingCount, 2);
    });

    test('returns technician profile data', () async {
      final profile = await repository.getTechnicianProfile();
      expect(profile.name, 'Alex Smith');
      expect(profile.rating, 4.9);
      expect(profile.status, 'Online');
    });

    test('updates job status and updates summary metrics genuinely', () async {
      await repository.updateJobStatus('JOB-2023-001', JobStatus.completed);

      final updatedJob = await repository.getJobById('JOB-2023-001');
      expect(updatedJob, isNotNull);
      expect(updatedJob!.status, JobStatus.completed);

      final updatedMetrics = await repository.getJobSummary();
      expect(updatedMetrics.completedCount, 5);
      expect(updatedMetrics.remainingCount, 1);
    });
  });
}
