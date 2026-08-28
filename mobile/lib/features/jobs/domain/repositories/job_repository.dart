import '../entities/job_entity.dart';
import '../entities/job_status.dart';
import '../entities/job_summary_metrics_entity.dart';
import '../entities/technician_profile_entity.dart';

/// Abstract repository contract for technician jobs and profile.
abstract class JobRepository {
  Future<List<JobEntity>> getTodaysJobs();
  Future<JobSummaryMetricsEntity> getJobSummary();
  Future<TechnicianProfileEntity> getTechnicianProfile();
  Future<JobEntity?> getJobById(String id);
  Future<void> updateJobStatus(String id, JobStatus newStatus);
}
