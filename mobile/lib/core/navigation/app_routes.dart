import 'package:flutter/material.dart';
import '../../features/jobs/domain/entities/job_entity.dart';
import '../../features/jobs/presentation/screens/job_details_screen.dart';
import 'main_navigation_scaffold.dart';

/// Centralized route definitions and generator for the application.
abstract class AppRoutes {
  static const String root = '/';
  static const String home = '/home';
  static const String schedule = '/schedule';
  static const String availability = '/availability';
  static const String profile = '/profile';
  static const String jobDetails = '/job-details';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case root:
      case home:
        return MaterialPageRoute(
          builder: (_) => const MainNavigationScaffold(initialTabIndex: 0),
          settings: settings,
        );
      case schedule:
        return MaterialPageRoute(
          builder: (_) => const MainNavigationScaffold(initialTabIndex: 1),
          settings: settings,
        );
      case availability:
        return MaterialPageRoute(
          builder: (_) => const MainNavigationScaffold(initialTabIndex: 2),
          settings: settings,
        );
      case profile:
        return MaterialPageRoute(
          builder: (_) => const MainNavigationScaffold(initialTabIndex: 3),
          settings: settings,
        );
      case jobDetails:
        final job = settings.arguments as JobEntity?;
        return MaterialPageRoute(
          builder: (_) => JobDetailsScreen(job: job),
          settings: settings,
        );
      default:
        return MaterialPageRoute(
          builder: (_) => const MainNavigationScaffold(initialTabIndex: 0),
          settings: settings,
        );
    }
  }
}
