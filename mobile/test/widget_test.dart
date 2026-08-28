import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/main.dart';

void main() {
  testWidgets('App root boots with RepairReach brand and Today\'s Jobs headline',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(const RepairReachTechnicianApp());
    await tester.pumpAndSettle();

    // Verify brand header
    expect(find.text('RepairReach'), findsOneWidget);

    // Verify screen title and date
    expect(find.text("Today's Jobs"), findsOneWidget);
    expect(find.text('October 24, 2023'), findsOneWidget);

    // Verify job cards rendered
    expect(find.text('John Doe'), findsOneWidget);
    expect(find.text('AC Repair'), findsOneWidget);
    expect(find.text('ACCEPTED'), findsOneWidget);

    expect(find.text('Jane Smith'), findsOneWidget);
    expect(find.text('Pipe Leakage'), findsOneWidget);
    expect(find.text('PENDING'), findsOneWidget);

    // Verify summary metrics
    expect(find.text('COMPLETED'), findsOneWidget);
    expect(find.text('4'), findsOneWidget);
    expect(find.text('REMAINING'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);

    // Verify bottom navigation bar tabs
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Schedule'), findsOneWidget);
    expect(find.text('Availability'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);

    // Verify FAB
    expect(find.byType(FloatingActionButton), findsOneWidget);
  });
}
