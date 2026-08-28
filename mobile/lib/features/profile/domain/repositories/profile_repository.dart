import 'package:repairreach_technician/features/jobs/domain/entities/technician_profile_entity.dart';

/// Abstract domain repository interface for technician profile operations.
abstract class ProfileRepository {
  Future<TechnicianProfileEntity> getProfile();
  Future<List<String>> getVerifiedSkills();
  Future<void> signOut();
}
