import 'package:repairreach_technician/features/jobs/domain/entities/technician_profile_entity.dart';
import 'package:repairreach_technician/features/profile/domain/repositories/profile_repository.dart';

/// In-memory mock repository populated with authentic Stitch profile fixtures.
class MockProfileRepository implements ProfileRepository {
  final TechnicianProfileEntity _profile = const TechnicianProfileEntity(
    id: 'tech-001',
    name: 'Alex Smith',
    avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDcDKlEtfF1Y24iRzl1kaJsO--fgbHYV8V-JuPmaiwcXH7hPdJ_qNOyUGsVGcQg3TRUVpV3mUn1ndGMhn5qGrS4CdY5y2QLr9LsB6pGhrSwW4SRe2A7o_kwRDC5WVQqDukQHihZuWQ7annGdGVLy1fuIEkD2BInDOPJnA35MFcpdFQhlDzPQH8lKd2KNyhj4-7pjrnL7-ayeu3oAk22GkkErRwUe1HNJTVMLdaaaYw94TdtZP7o-7YL14YtyosJEPfVbtPX_gzVcsE',
    phone: '(555) 123-4567',
    rating: 4.9,
    reviewCount: 124,
    status: 'Online',
    nextShift: 'Tomorrow, 08:00 AM',
    weeklyHours: 38.5,
  );

  final List<String> _skills = [
    'HVAC Diagnostic & Repair (Certified Senior Tech)',
    'Plumbing (Level 2 Field Specialist)',
    'Electrical (Appliance & Fixture Repair)',
  ];

  @override
  Future<TechnicianProfileEntity> getProfile() async {
    return _profile;
  }

  @override
  Future<List<String>> getVerifiedSkills() async {
    return List<String>.from(_skills);
  }

  @override
  Future<void> signOut() async {
    // Simulated sign-out behavior
  }
}
