import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/features/jobs/data/models/job_model.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/job_entity.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/job_status.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/job_summary_metrics_entity.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/technician_profile_entity.dart';

void main() {
  group('Domain Entities & Models', () {
    test('JobStatus display names are uppercase matching design pills', () {
      expect(JobStatus.accepted.displayName, 'ACCEPTED');
      expect(JobStatus.pending.displayName, 'PENDING');
      expect(JobStatus.inProgress.displayName, 'IN PROGRESS');
      expect(JobStatus.scheduled.displayName, 'SCHEDULED');
      expect(JobStatus.completed.displayName, 'COMPLETED');
      expect(JobStatus.unableToServe.displayName, 'UNABLE TO SERVE');
    });

    test('TechnicianProfileEntity value equality', () {
      const profile1 = TechnicianProfileEntity(
        id: 't-1',
        name: 'Alex',
        avatarUrl: 'url',
        phone: '123',
        rating: 4.9,
        reviewCount: 10,
        status: 'Online',
        nextShift: 'Tomorrow',
        weeklyHours: 40.0,
      );

      const profile2 = TechnicianProfileEntity(
        id: 't-1',
        name: 'Alex',
        avatarUrl: 'url',
        phone: '123',
        rating: 4.9,
        reviewCount: 10,
        status: 'Online',
        nextShift: 'Tomorrow',
        weeklyHours: 40.0,
      );

      expect(profile1, equals(profile2));
    });

    test('JobSummaryMetricsEntity value equality', () {
      const m1 = JobSummaryMetricsEntity(
        dateDisplay: 'Oct 24',
        completedCount: 4,
        remainingCount: 2,
        totalAssigned: 6,
      );
      const m2 = JobSummaryMetricsEntity(
        dateDisplay: 'Oct 24',
        completedCount: 4,
        remainingCount: 2,
        totalAssigned: 6,
      );
      expect(m1, equals(m2));
    });

    test('JobModel serialization and entity conversion roundtrip', () {
      const entity = JobEntity(
        id: 'JOB-100',
        customerName: 'Alice',
        customerPhone: '+1999999999',
        timeWindow: '08:00 - 10:00 AM',
        status: JobStatus.accepted,
        serviceCategory: ServiceCategory.hvac,
        serviceTitle: 'Heater Maintenance',
        address: '789 Pine Rd',
        city: 'Metropolis',
        mapImageUrl: 'https://example.com/map.png',
        description: 'Check furnace ignition',
        priority: 'Normal',
        clientType: 'Residential',
        equipment: ['Tool A'],
        potentialParts: ['Sensor X'],
        estimatedTravelTime: '15 mins',
      );

      final model = JobModel.fromEntity(entity);
      final json = model.toJson();
      final deserialized = JobModel.fromJson(json);

      expect(deserialized.id, entity.id);
      expect(deserialized.customerName, entity.customerName);
      expect(deserialized.status, entity.status);
      expect(deserialized.serviceCategory, entity.serviceCategory);
    });
  });
}
