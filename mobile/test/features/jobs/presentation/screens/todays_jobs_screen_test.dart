import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/core/theme/app_theme.dart';
import 'package:repairreach_technician/features/jobs/data/repositories/mock_job_repository.dart';
import 'package:repairreach_technician/features/jobs/presentation/screens/todays_jobs_screen.dart';

void main() {
  Widget createTestWidget({MockJobRepository? repository}) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: TodaysJobsScreen(repository: repository),
    );
  }

  testWidgets('TodaysJobsScreen renders initial jobs and metric counters',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockJobRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    expect(find.text('John Doe'), findsOneWidget);
    expect(find.text('Jane Smith'), findsOneWidget);
    expect(find.text('Mark Completed'), findsOneWidget);
    expect(find.text('Accept'), findsOneWidget);
    expect(find.text('Reject'), findsOneWidget);
    expect(find.text('Call'), findsOneWidget);
    expect(find.text('WhatsApp'), findsOneWidget);
  });

  testWidgets('Tapping Mark Completed updates job and metrics',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockJobRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    final markCompletedBtn = find.text('Mark Completed');
    expect(markCompletedBtn, findsOneWidget);
    await tester.tap(markCompletedBtn);
    await tester.pumpAndSettle();

    expect(find.text('Marked "AC Repair" for John Doe as Completed!'), findsOneWidget);
    expect(find.text('5'), findsOneWidget);
    expect(find.text('1'), findsOneWidget);
  });

  testWidgets('Tapping Accept on pending job updates status',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockJobRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    final acceptBtn = find.text('Accept');
    await tester.ensureVisible(acceptBtn);
    await tester.pumpAndSettle();

    expect(acceptBtn, findsOneWidget);
    await tester.tap(acceptBtn);
    await tester.pumpAndSettle();

    expect(find.text('Accepted job "Pipe Leakage" for Jane Smith!'), findsOneWidget);
  });

  testWidgets('Tapping bottom nav tabs updates active tab state',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockJobRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Schedule'));
    await tester.pumpAndSettle();
    expect(find.text('Schedule tab selected'), findsOneWidget);

    await tester.tap(find.text('Availability'));
    await tester.pumpAndSettle();
    expect(find.text('Availability tab selected'), findsOneWidget);
  });
}
