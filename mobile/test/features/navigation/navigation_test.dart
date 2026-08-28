import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/core/navigation/app_routes.dart';
import 'package:repairreach_technician/core/theme/app_theme.dart';
import 'package:repairreach_technician/features/jobs/presentation/screens/job_details_screen.dart';

class _TestHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) => _FakeHttpClient();
}

class _FakeHttpClient implements HttpClient {
  static final List<int> _kTransparentImage = <int>[
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49,
    0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
    0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44,
    0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D,
    0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42,
    0x60, 0x82,
  ];

  @override
  dynamic noSuchMethod(Invocation invocation) {
    if (invocation.memberName == #getUrl ||
        invocation.memberName == #openUrl ||
        invocation.memberName == #open ||
        invocation.memberName == #get) {
      return Future.value(_FakeHttpClientRequest(_kTransparentImage));
    }
    return null;
  }
}

class _FakeHttpClientRequest implements HttpClientRequest {
  final List<int> _data;
  _FakeHttpClientRequest(this._data);

  @override
  dynamic noSuchMethod(Invocation invocation) {
    if (invocation.memberName == #close || invocation.memberName == #done) {
      return Future.value(_FakeHttpClientResponse(_data));
    }
    if (invocation.memberName == #headers) {
      return _FakeHttpHeaders();
    }
    return null;
  }
}

class _FakeHttpClientResponse extends Stream<List<int>> implements HttpClientResponse {
  final List<int> _data;
  _FakeHttpClientResponse(this._data);

  @override
  int get statusCode => 200;

  @override
  int get contentLength => _data.length;

  @override
  HttpClientResponseCompressionState get compressionState =>
      HttpClientResponseCompressionState.notCompressed;

  @override
  HttpHeaders get headers => _FakeHttpHeaders();

  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int> event)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    return Stream<List<int>>.fromIterable([_data]).listen(
      onData,
      onError: onError,
      onDone: onDone,
      cancelOnError: cancelOnError,
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _FakeHttpHeaders implements HttpHeaders {
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

void main() {
  setUpAll(() {
    HttpOverrides.global = _TestHttpOverrides();
  });

  Widget createTestApp({String initialRoute = AppRoutes.root}) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      initialRoute: initialRoute,
      onGenerateRoute: AppRoutes.onGenerateRoute,
    );
  }

  testWidgets('MainNavigationScaffold switches between all 4 tabs smoothly',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(createTestApp());
    await tester.pumpAndSettle();

    // Initial Tab 0: Home / Today's Jobs
    expect(find.text("Today's Jobs"), findsOneWidget);

    // Switch to Tab 1: Schedule
    await tester.tap(find.text('Schedule'));
    await tester.pumpAndSettle();
    expect(find.text('Service Schedule'), findsOneWidget);

    // Switch to Tab 2: Availability
    await tester.tap(find.text('Availability'));
    await tester.pumpAndSettle();
    expect(find.text('Manage Availability'), findsOneWidget);

    // Switch to Tab 3: Profile
    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();
    expect(find.text('Alex Smith'), findsOneWidget);
    expect(find.text('AVAILABILITY SUMMARY'), findsOneWidget);

    // Switch back to Home
    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();
    expect(find.text("Today's Jobs"), findsOneWidget);
  });

  testWidgets('Tapping JobCardWidget navigates to JobDetailsScreen and popping returns to shell',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(createTestApp());
    await tester.pumpAndSettle();

    // Tap on the first Job Card (John Doe)
    final johnDoeCard = find.text('John Doe');
    expect(johnDoeCard, findsOneWidget);
    await tester.tap(johnDoeCard);
    await tester.pumpAndSettle();

    // Verify on JobDetailsScreen
    expect(find.byType(JobDetailsScreen), findsOneWidget);
    expect(find.text('REPORTED PROBLEM'), findsOneWidget);
    expect(find.text('EQUIPMENT'), findsOneWidget);

    // Tap Back Button
    final backBtn = find.byTooltip('Back');
    expect(backBtn, findsOneWidget);
    await tester.tap(backBtn);
    await tester.pumpAndSettle();

    // Verify returned to Today's Jobs
    expect(find.text("Today's Jobs"), findsOneWidget);
  });

  testWidgets('TopAppBar profile avatar tap navigates to Profile tab',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(createTestApp());
    await tester.pumpAndSettle();

    // Tap TopAppBar brand title / profile avatar
    final brandTitle = find.text('RepairReach');
    expect(brandTitle, findsOneWidget);
    await tester.tap(brandTitle);
    await tester.pumpAndSettle();

    // Verify switched to Profile tab
    expect(find.text('Alex Smith'), findsOneWidget);
    expect(find.text('AVAILABILITY SUMMARY'), findsOneWidget);
  });

  testWidgets('Profile Adjust Shift action triggers cross-tab jump to Availability tab',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(createTestApp(initialRoute: AppRoutes.profile));
    await tester.pumpAndSettle();

    // Verify on Profile tab
    expect(find.text('Alex Smith'), findsOneWidget);
    expect(find.text('AVAILABILITY SUMMARY'), findsOneWidget);

    // Tap Adjust button in Next Shift card
    final adjustButton = find.text('Adjust');
    expect(adjustButton, findsOneWidget);
    await tester.tap(adjustButton);
    await tester.pumpAndSettle();

    // Verify switched to Availability tab
    expect(find.text('Manage Availability'), findsOneWidget);
    expect(find.text('AVAILABILITY SLOTS'), findsOneWidget);
  });

  testWidgets('Direct named routes initialize correct tabs in MainNavigationScaffold',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    // Test /schedule route
    await tester.pumpWidget(createTestApp(initialRoute: AppRoutes.schedule));
    await tester.pumpAndSettle();
    expect(find.text('Service Schedule'), findsOneWidget);

    // Test /availability route
    await tester.pumpWidget(createTestApp(initialRoute: AppRoutes.availability));
    await tester.pumpAndSettle();
    expect(find.text('Manage Availability'), findsOneWidget);
  });

  testWidgets('Screens render without overflow on compact 360x640 viewport',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(createTestApp());
    await tester.pumpAndSettle();

    // Tab 0
    expect(find.text("Today's Jobs"), findsOneWidget);
    expect(tester.takeException(), isNull);

    // Tab 1
    await tester.tap(find.text('Schedule'));
    await tester.pumpAndSettle();
    expect(find.text('Service Schedule'), findsOneWidget);
    expect(tester.takeException(), isNull);

    // Tab 2
    await tester.tap(find.text('Availability'));
    await tester.pumpAndSettle();
    expect(find.text('Manage Availability'), findsOneWidget);
    expect(tester.takeException(), isNull);

    // Tab 3
    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();
    expect(find.text('Alex Smith'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
