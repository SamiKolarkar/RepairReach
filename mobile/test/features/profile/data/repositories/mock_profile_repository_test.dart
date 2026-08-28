import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/features/profile/data/repositories/mock_profile_repository.dart';

void main() {
  late MockProfileRepository repository;

  setUp(() {
    repository = MockProfileRepository();
  });

  test('MockProfileRepository returns technician profile matching Stitch design', () async {
    final profile = await repository.getProfile();
    expect(profile.name, equals('Alex Smith'));
    expect(profile.phone, equals('(555) 123-4567'));
    expect(profile.rating, equals(4.9));
    expect(profile.reviewCount, equals(124));
    expect(profile.status, equals('Online'));
    expect(profile.nextShift, equals('Tomorrow, 08:00 AM'));
    expect(profile.weeklyHours, equals(38.5));
  });

  test('MockProfileRepository returns verified skills list', () async {
    final skills = await repository.getVerifiedSkills();
    expect(skills.length, equals(3));
    expect(skills[0], contains('HVAC'));
    expect(skills[1], contains('Plumbing'));
    expect(skills[2], contains('Electrical'));
  });
}
