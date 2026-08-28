import '../../domain/entities/job_entity.dart';
import '../../domain/entities/job_status.dart';
import '../../domain/entities/job_summary_metrics_entity.dart';
import '../../domain/entities/technician_profile_entity.dart';
import '../../domain/repositories/job_repository.dart';

/// In-memory mock repository populated with authentic Stitch screen fixtures.
class MockJobRepository implements JobRepository {
  TechnicianProfileEntity _profile = const TechnicianProfileEntity(
    id: 'tech-001',
    name: 'Alex Smith',
    avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCrSUbrMVQn_00ZQ8z0NfA6ONVG8H79NqrTiXQt-gdZtLhE6C0wEzweYPb80xX6LfTXU0hj9Iib1Xwz5a6Jcz1Os_mjxg-X_aopPgGDuZR0ciqXmIPIvcFmUen_Wn8tj34qrYt-LUcETTFc-ZpW8oea-v8XmXFmSK9xlgN6UirnZDeh3pMMatLpBqIEBXJztjEuTeaCL1w5f10iqzSRvbcUSO5IJFOmIF-7nd4j-ILX4o3ewcgFOXpJFo2fsVaEm8uyj_lYfZLJ3Eo',
    phone: '(555) 123-4567',
    rating: 4.9,
    reviewCount: 124,
    status: 'Online',
    nextShift: 'Tomorrow, 08:30 AM',
    weeklyHours: 38.5,
  );

  JobSummaryMetricsEntity _metrics = const JobSummaryMetricsEntity(
    dateDisplay: 'October 24, 2023',
    completedCount: 4,
    remainingCount: 2,
    totalAssigned: 6,
  );

  final List<JobEntity> _jobs = [
    const JobEntity(
      id: 'JOB-2023-001',
      customerName: 'John Doe',
      customerPhone: '+1 (555) 234-5678',
      timeWindow: '09:00 - 11:00 AM',
      status: JobStatus.accepted,
      serviceCategory: ServiceCategory.hvac,
      serviceTitle: 'AC Repair',
      address: '123 Maple St',
      city: 'Springfield',
      mapImageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBaP-wmg4_UjiL8VtWKEZEbvreEsm4mQ51tKzND3T2iBSDh3_AscXlqt0Vw_opZqm91v3XgJKDZ3j6G0aY3_9LJ0I84-eXahAWqYbST_Q8_OFOfhj7ETnZpe6GoA4KZVIIw5HpZin4KjsJ9RuKQWk9LqUTCm2Zd6DunIpUSaqgEePkChReHbdllEdhDuQgb-nmuiTmOtxz2Dw9bXeJCqd0z8j8Sr5g3tiTakur5HT2jl-VVB1ZgW4nDoNRVm-AhZZFyqocYJ17yYRQ',
      description:
          'The AC is making a loud grinding noise and not cooling properly.',
      priority: 'URGENT',
      clientType: 'Residential Client',
      equipment: ['Standard HVAC Kit'],
      potentialParts: ['Fan Motor', 'Bearings'],
      estimatedTravelTime: '12 mins',
    ),
    const JobEntity(
      id: 'JOB-2023-002',
      customerName: 'Jane Smith',
      customerPhone: '+1 (555) 876-5432',
      timeWindow: '01:00 - 03:00 PM',
      status: JobStatus.pending,
      serviceCategory: ServiceCategory.plumbing,
      serviceTitle: 'Pipe Leakage',
      address: '456 Oak Ave',
      city: 'Springfield',
      mapImageUrl: null,
      description:
          'Major pipe leak under the kitchen sink causing water pooling.',
      priority: 'Standard',
      clientType: 'Residential Client',
      equipment: ['Plumbing Snake', 'Pipe Wrench'],
      potentialParts: ['PVC Joint 2-inch', 'Teflon Tape'],
      estimatedTravelTime: '20 mins',
    ),
  ];

  @override
  Future<List<JobEntity>> getTodaysJobs() async {
    // Return a copy to avoid external accidental mutation
    return List<JobEntity>.from(_jobs);
  }

  @override
  Future<JobSummaryMetricsEntity> getJobSummary() async {
    return _metrics;
  }

  @override
  Future<TechnicianProfileEntity> getTechnicianProfile() async {
    return _profile;
  }

  @override
  Future<JobEntity?> getJobById(String id) async {
    final match = _jobs.where((j) => j.id == id);
    if (match.isEmpty) return null;
    return match.first;
  }

  @override
  Future<void> updateJobStatus(String id, JobStatus newStatus) async {
    final index = _jobs.indexWhere((j) => j.id == id);
    if (index != -1) {
      final current = _jobs[index];
      _jobs[index] = JobEntity(
        id: current.id,
        customerName: current.customerName,
        customerPhone: current.customerPhone,
        timeWindow: current.timeWindow,
        status: newStatus,
        serviceCategory: current.serviceCategory,
        serviceTitle: current.serviceTitle,
        address: current.address,
        city: current.city,
        mapImageUrl: current.mapImageUrl,
        description: current.description,
        priority: current.priority,
        clientType: current.clientType,
        equipment: current.equipment,
        potentialParts: current.potentialParts,
        estimatedTravelTime: current.estimatedTravelTime,
      );

      // Recompute metrics genuinely
      int completed = _jobs.where((j) => j.status == JobStatus.completed).length + 4; // base 4 prior
      int remaining = _jobs.where((j) => j.status != JobStatus.completed).length;
      _metrics = JobSummaryMetricsEntity(
        dateDisplay: _metrics.dateDisplay,
        completedCount: completed,
        remainingCount: remaining,
        totalAssigned: _metrics.totalAssigned,
      );
    }
  }

  void updateProfile(TechnicianProfileEntity updated) {
    _profile = updated;
  }
}
