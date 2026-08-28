import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/core/theme/app_theme.dart';
import 'package:repairreach_technician/features/schedule/data/repositories/mock_schedule_repository.dart';
import 'package:repairreach_technician/features/schedule/presentation/screens/schedule_screen.dart';

void main() {
  Widget createTestWidget({MockScheduleRepository? repository}) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: ScheduleScreen(repository: repository),
    );
  }

  testWidgets('ScheduleScreen renders timeline sections, badges, and upcoming list',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockScheduleRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    // Verify Title & Subtitle
    expect(find.text('Service Schedule'), findsOneWidget);
    expect(find.text('4 active jobs assigned for today'), findsOneWidget);

    // Verify Today Section
    expect(find.text('TODAY'), findsOneWidget);
    expect(find.text('May 14, 2024'), findsOneWidget);
    expect(find.text('Eleanor Shellstrop'), findsOneWidget);
    expect(find.text('09'), findsOneWidget);
    expect(find.text('IN PROGRESS'), findsOneWidget);
    expect(find.text('742 Evergreen Terrace'), findsOneWidget);

    expect(find.text('Chidi Anagonye'), findsOneWidget);
    expect(find.text('01'), findsOneWidget);
    expect(find.text('PENDING'), findsOneWidget);
    expect(find.text('123 Fake Street, Apt 4B'), findsOneWidget);

    // Verify Tomorrow Section
    expect(find.text('TOMORROW'), findsOneWidget);
    expect(find.text('May 15, 2024'), findsOneWidget);
    expect(find.text('Tahani Al-Jamil'), findsOneWidget);
    expect(find.text('10'), findsOneWidget);
    expect(find.text('SCHEDULED'), findsOneWidget);
    expect(find.text('Highgate Mansion Estate'), findsOneWidget);

    // Verify Upcoming Section
    expect(find.text('UPCOMING'), findsOneWidget);
    expect(find.text('View All'), findsOneWidget);
    expect(find.text('Jason Mendoza'), findsOneWidget);
    expect(find.text('03:00 PM • Maintenance'), findsOneWidget);
    expect(find.text('Michael Realman'), findsOneWidget);
    expect(find.text('11:30 AM • Diagnosis'), findsOneWidget);

    // Verify FAB
    expect(find.byType(FloatingActionButton), findsOneWidget);
  });

  testWidgets('ScheduleScreen interactions: Tapping FAB and items provide feedback',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockScheduleRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    // Tap FAB
    await tester.tap(find.byType(FloatingActionButton));
    await tester.pumpAndSettle();
    expect(find.text('Add New Schedule Entry'), findsOneWidget);

    // Tap on a Job Card
    await tester.tap(find.text('Eleanor Shellstrop'));
    await tester.pumpAndSettle();
    expect(
      find.text('Selected schedule item: Eleanor Shellstrop (HVAC Maintenance)'),
      findsOneWidget,
    );

    // Tap View All
    await tester.tap(find.text('View All'));
    await tester.pumpAndSettle();
    expect(find.text('Viewing all upcoming schedule items'), findsOneWidget);
  });
}
