import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/core/theme/app_theme.dart';
import 'package:repairreach_technician/features/profile/data/repositories/mock_profile_repository.dart';
import 'package:repairreach_technician/features/profile/presentation/screens/profile_screen.dart';

void main() {
  Widget createTestWidget({MockProfileRepository? repository}) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: ProfileScreen(repository: repository),
    );
  }

  testWidgets('ProfileScreen renders technician card, availability bento, settings, and logout',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockProfileRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    // Verify Technician Info Card
    expect(find.text('Alex Smith'), findsOneWidget);
    expect(find.text('4.9 stars (124 reviews)'), findsOneWidget);
    expect(find.text('(555) 123-4567'), findsOneWidget);
    expect(find.byIcon(Icons.star), findsOneWidget);
    expect(find.byIcon(Icons.call), findsOneWidget);

    // Verify Availability Summary Bento
    expect(find.text('AVAILABILITY SUMMARY'), findsOneWidget);
    expect(find.text('Next Shift'), findsOneWidget);
    expect(find.text('Tomorrow, 08:00 AM'), findsOneWidget);
    expect(find.text('8 Jobs Scheduled'), findsOneWidget);
    expect(find.text('Adjust'), findsOneWidget);
    expect(find.text('Weekly Hours'), findsOneWidget);
    expect(find.text('38.5h'), findsOneWidget);
    expect(find.text('Status'), findsOneWidget);
    expect(find.text('Online'), findsOneWidget);

    // Verify Account Settings List
    expect(find.text('ACCOUNT SETTINGS'), findsOneWidget);
    expect(find.text('Notification Preferences'), findsOneWidget);
    expect(find.text('Account Security'), findsOneWidget);
    expect(find.text('Help & Support'), findsOneWidget);

    // Verify Logout Button
    expect(find.text('Logout'), findsOneWidget);
    expect(find.byIcon(Icons.logout), findsOneWidget);
  });

  testWidgets('ProfileScreen interaction: Tapping Logout shows confirmation dialog',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockProfileRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    final logoutBtn = find.text('Logout');
    expect(logoutBtn, findsOneWidget);
    await tester.tap(logoutBtn);
    await tester.pumpAndSettle();

    // Verify AlertDialog appears
    expect(find.text('Sign Out?'), findsOneWidget);
    expect(
      find.text('Are you sure you want to sign out of RepairReach Technician?'),
      findsOneWidget,
    );

    // Tap Sign Out button in dialog
    await tester.tap(find.text('Sign Out'));
    await tester.pumpAndSettle();

    expect(find.text('Signed out successfully.'), findsOneWidget);
  });

  testWidgets('ProfileScreen interaction: Tapping account settings items shows feedback',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockProfileRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Notification Preferences'));
    await tester.pumpAndSettle();
    expect(find.text('Opening Notification Preferences...'), findsOneWidget);

    await tester.tap(find.text('Account Security'));
    await tester.pumpAndSettle();
    expect(find.text('Opening Account Security...'), findsOneWidget);

    await tester.tap(find.text('Help & Support'));
    await tester.pumpAndSettle();
    expect(find.text('Opening Help & Support...'), findsOneWidget);
  });
}
