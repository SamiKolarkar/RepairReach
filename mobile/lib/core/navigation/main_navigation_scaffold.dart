import 'package:flutter/material.dart';
import '../../features/availability/presentation/screens/set_availability_screen.dart';
import '../../features/jobs/presentation/screens/todays_jobs_screen.dart';
import '../../features/jobs/presentation/widgets/bottom_nav_bar_widget.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/schedule/presentation/screens/schedule_screen.dart';
import '../theme/app_colors.dart';

/// Root navigation shell managing persistent 4-tab bottom navigation with IndexedStack.
class MainNavigationScaffold extends StatefulWidget {
  final int initialTabIndex;

  const MainNavigationScaffold({
    super.key,
    this.initialTabIndex = 0,
  });

  @override
  State<MainNavigationScaffold> createState() => _MainNavigationScaffoldState();
}

class _MainNavigationScaffoldState extends State<MainNavigationScaffold> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTabIndex;
  }

  void _onTabSelected(int index) {
    if (_currentIndex != index) {
      setState(() {
        _currentIndex = index;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          TodaysJobsScreen(
            showBottomNav: false,
            onProfileTap: () => _onTabSelected(3),
          ),
          ScheduleScreen(
            onProfileTap: () => _onTabSelected(3),
          ),
          SetAvailabilityScreen(
            onProfileTap: () => _onTabSelected(3),
          ),
          ProfileScreen(
            onAdjustShift: () => _onTabSelected(2),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavBarWidget(
        selectedIndex: _currentIndex,
        onTabSelected: _onTabSelected,
      ),
    );
  }
}
