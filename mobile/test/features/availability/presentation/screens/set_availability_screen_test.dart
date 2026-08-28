import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/core/theme/app_theme.dart';
import 'package:repairreach_technician/features/availability/data/repositories/mock_availability_repository.dart';
import 'package:repairreach_technician/features/availability/presentation/screens/set_availability_screen.dart';

void main() {
  Widget createTestWidget({MockAvailabilityRepository? repository}) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: SetAvailabilityScreen(repository: repository),
    );
  }

  testWidgets('SetAvailabilityScreen renders date strip, block card, shift slots, and capacity card',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockAvailabilityRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    // Verify Title & Month
    expect(find.text('Manage Availability'), findsOneWidget);
    expect(find.text('October 2023'), findsOneWidget);

    // Verify Date Carousel Strip
    expect(find.text('MON'), findsOneWidget);
    expect(find.text('23'), findsOneWidget);
    expect(find.text('TUE'), findsOneWidget);
    expect(find.text('24'), findsOneWidget);

    // Verify Block Full Day Card
    expect(find.text('Block Full Day'), findsOneWidget);
    expect(find.text('Set entire day as unavailable'), findsOneWidget);
    expect(find.byIcon(Icons.block), findsOneWidget);

    // Verify Availability Slots Section
    expect(find.text('AVAILABILITY SLOTS'), findsOneWidget);
    expect(find.text('Morning Shift'), findsOneWidget);
    expect(find.text('09:00 AM - 11:00 AM'), findsOneWidget);

    expect(find.text('Midday Shift'), findsOneWidget);
    expect(find.text('11:00 AM - 01:00 PM'), findsOneWidget);

    expect(find.text('Lunch Break'), findsOneWidget);
    expect(find.text('01:00 PM - 02:00 PM'), findsOneWidget);

    expect(find.text('Afternoon Shift'), findsOneWidget);
    expect(find.text('02:00 PM - 04:00 PM'), findsOneWidget);

    expect(find.text('Evening Shift'), findsOneWidget);
    expect(find.text('04:00 PM - 06:00 PM'), findsOneWidget);

    // Verify Weekly Capacity Card
    expect(find.text('Weekly Capacity'), findsOneWidget);
    expect(
      find.text('You have 32 available hours remaining this week.'),
      findsOneWidget,
    );
    expect(find.text('VIEW REPORT'), findsOneWidget);
  });

  testWidgets('SetAvailabilityScreen interaction: Toggling Block Full Day marks day unavailable',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockAvailabilityRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    // Toggle Block Full Day switch (first Switch widget on screen)
    final switches = find.byType(Switch);
    expect(switches, findsNWidgets(6)); // 1 block day + 5 slots

    await tester.tap(switches.first);
    await tester.pumpAndSettle();

    expect(find.text('Full day marked as unavailable'), findsOneWidget);
  });

  testWidgets('SetAvailabilityScreen interaction: Selecting another date changes active date',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockAvailabilityRepository();
    await tester.pumpWidget(createTestWidget(repository: repo));
    await tester.pumpAndSettle();

    // Tap TUE 24
    await tester.tap(find.text('TUE'));
    await tester.pumpAndSettle();

    expect(find.text('Morning Shift'), findsOneWidget);
  });
}
