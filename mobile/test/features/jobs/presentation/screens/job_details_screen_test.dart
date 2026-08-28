import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/core/theme/app_theme.dart';
import 'package:repairreach_technician/features/jobs/data/repositories/mock_job_repository.dart';
import 'package:repairreach_technician/features/jobs/domain/entities/job_entity.dart';
import 'package:repairreach_technician/features/jobs/presentation/screens/job_details_screen.dart';

void main() {
  Widget createTestWidget({JobEntity? job, MockJobRepository? repository}) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: JobDetailsScreen(job: job, repository: repository),
    );
  }

  testWidgets('JobDetailsScreen renders customer, location, problem quote, and bento equipment',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockJobRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    // Verify AppBar & Title
    expect(find.text('Job Details'), findsOneWidget);

    // Verify Status & Time Header
    expect(find.text('UPCOMING JOB'), findsOneWidget);
    expect(find.text('09:00 - 11:00 AM'), findsOneWidget);

    // Verify Customer Card
    expect(find.text('CUSTOMER'), findsOneWidget);
    expect(find.text('John Doe'), findsOneWidget);
    expect(find.text('Residential Client • Priority Service'), findsOneWidget);
    expect(find.byIcon(Icons.call), findsOneWidget);
    expect(find.byIcon(Icons.chat), findsOneWidget);

    // Verify Location Card
    expect(find.text('123 Maple St, Springfield'), findsOneWidget);
    expect(find.text('Estimated travel: 12 mins'), findsOneWidget);
    expect(find.text('GET DIRECTIONS'), findsOneWidget);

    // Verify Reported Problem Quote Card
    expect(find.text('REPORTED PROBLEM'), findsOneWidget);
    expect(
      find.text('"The AC is making a loud grinding noise and not cooling properly."'),
      findsOneWidget,
    );
    expect(find.text('HVAC'), findsOneWidget);
    expect(find.text('URGENT'), findsOneWidget);

    // Verify Bento Grid for Equipment and Potential Parts
    expect(find.text('EQUIPMENT'), findsOneWidget);
    expect(find.text('Standard HVAC Kit'), findsOneWidget);
    expect(find.text('POTENTIAL PARTS'), findsOneWidget);
    expect(find.text('Fan Motor, Bearings'), findsOneWidget);

    // Verify Action Bar
    expect(find.text('Reject'), findsOneWidget);
    expect(find.text('En Route'), findsOneWidget);
    expect(find.text('Mark Completed'), findsOneWidget);
  });

  testWidgets('JobDetailsScreen interaction: Call, Chat, and Get Directions provide user feedback',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockJobRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    // Tap Call button
    await tester.tap(find.byIcon(Icons.call));
    await tester.pumpAndSettle();
    expect(find.text('Dialing John Doe (+1 (555) 234-5678)...'), findsOneWidget);

    // Tap Chat button
    await tester.tap(find.byIcon(Icons.chat));
    await tester.pumpAndSettle();
    expect(find.text('Opening chat with John Doe (+1 (555) 234-5678)...'), findsOneWidget);

    // Tap Get Directions
    await tester.tap(find.text('GET DIRECTIONS'));
    await tester.pumpAndSettle();
    expect(find.text('Launching navigation to 123 Maple St, Springfield...'), findsOneWidget);
  });

  testWidgets('JobDetailsScreen lifecycle: Tapping Mark Completed marks job as completed',
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

    expect(
      find.text('Marked "AC Repair" for John Doe as Completed!'),
      findsOneWidget,
    );
    expect(find.text('Job Completed'), findsOneWidget);
  });

  testWidgets('JobDetailsScreen lifecycle: Tapping Reject confirms rejection and updates status',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockJobRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    final rejectBtn = find.text('Reject');
    expect(rejectBtn, findsOneWidget);
    await tester.tap(rejectBtn);
    await tester.pumpAndSettle();

    // Verify dialog appears
    expect(find.text('Reject Job Assignment?'), findsOneWidget);

    // Tap Confirm Reject
    await tester.tap(find.text('Confirm Reject'));
    await tester.pumpAndSettle();

    expect(find.text('Job "AC Repair" rejected.'), findsOneWidget);
    expect(find.text('Unable to Serve'), findsOneWidget);
  });

  testWidgets('JobDetailsScreen lifecycle: Tapping En Route transitions job status to In Progress',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockJobRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    final enRouteBtn = find.text('En Route');
    expect(enRouteBtn, findsOneWidget);
    await tester.tap(enRouteBtn);
    await tester.pumpAndSettle();

    expect(find.text('Status set to En Route.'), findsOneWidget);
    expect(find.text('IN PROGRESS'), findsOneWidget);
    expect(find.text('Arrived'), findsOneWidget);
  });
}
