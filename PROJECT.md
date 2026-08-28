# Project: RepairReach Technician Mobile App (Static Screens & Routing)

## Architecture
The application follows Clean Architecture organized into vertical slices by feature:
- `lib/core/`: Centralized design system (`theme/`), constants (`constants/`), and routing & persistent shell navigation (`navigation/`).
- `lib/features/<feature>/`: Feature modules (`jobs`, `schedule`, `availability`, `profile`) separated into `domain/` (entities, repository contracts), `data/` (mock repositories, models), and `presentation/` (screens, widgets).
- `lib/shared/`: Shared cross-cutting presentation utilities (`touch_target_padding.dart`).
- `lib/main.dart`: Root widget initializing `MaterialApp` with `AppTheme.lightTheme` and `AppRoutes`.

### Navigation Architecture
- **Persistent Bottom Shell**: `MainNavigationScaffold` implements a 4-tab `IndexedStack` hosting:
  - Tab 0: `TodaysJobsScreen` (Home)
  - Tab 1: `ScheduleScreen` (Schedule)
  - Tab 2: `SetAvailabilityScreen` (Availability)
  - Tab 3: `ProfileScreen` (Profile)
- **Deep Routing**: `AppRoutes.jobDetails` is pushed onto the root navigator stack over the shell.
- **Cross-Tab Deep Linking**:
  - TopAppBar avatar tap routes to Profile (Tab 3).
  - Profile "Adjust Shift" action routes to Availability (Tab 2).

### Controlled Mock Infrastructure (R5)
All features use in-memory deterministic mock repositories (`MockJobRepository`, `MockScheduleRepository`, `MockAvailabilityRepository`, `MockProfileRepository`). No external Firebase or Spring Boot backend connectivity is enabled during this milestone.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Persistent 4-Tab Bottom Nav | Bottom navigation bar hosting Home, Schedule, Availability, Profile tabs with active pill styling | M1 | Stitch survey / ORIGINAL_REQUEST R1 |
| 2 | Route-Based Job Details Navigation | Navigates from job cards on Home/Schedule to full Job Details screen with back stack | M1 | Stitch survey / ORIGINAL_REQUEST R1 |
| 3 | Cross-Tab Deep Navigation | TopAppBar avatar routes to Profile; Profile Adjust Shift routes to Availability | M1 | Stitch survey / ORIGINAL_REQUEST R1 |
| 4 | Job Details Lifecycle Action Bar | Sticky footer with Reject confirmation, intermediate action (Accept/En Route/Arrived), and Mark Completed | M2 | Stitch survey / ORIGINAL_REQUEST R2 |
| 5 | Job Details Customer Quick Contact | Call and Chat direct buttons in Customer Bento card | M2 | Stitch survey / ORIGINAL_REQUEST R2 |
| 6 | Job Details Location Map Card | Top-down map preview with address pin, travel time, and Directions trigger | M2 | Stitch survey / ORIGINAL_REQUEST R2 |
| 7 | Job Details Equipment & Parts Bento | 2-column bento card for required tools and potential replacement parts | M2 | Stitch survey / ORIGINAL_REQUEST R2 |
| 8 | Job Details Problem Quote Card | Accent-bordered quote block with customer's problem description, category, and urgency pills | M2 | Stitch survey / ORIGINAL_REQUEST R2 |
| 9 | Schedule Chronological Timeline | Timeline breakdown into Today, Tomorrow, and Upcoming sections with status chips | M3 | Stitch survey / ORIGINAL_REQUEST R3 |
| 10 | Schedule Upcoming Divided List Card | Compact list card with date badge, customer name, time/type subtext, and chevron | M3 | Stitch survey / ORIGINAL_REQUEST R3 |
| 11 | Schedule Floating Action Button | Primary FAB for quick creation / actions | M3 | Stitch survey / ORIGINAL_REQUEST R3 |
| 12 | Availability 7-Day Date Strip | Horizontally scrolling date pills showing day of week and date number with active indicator | M3 | Stitch survey / ORIGINAL_REQUEST R3 |
| 13 | Availability Block Full Day Toggle | Switch to mark the entire selected date as unavailable with visual error feedback | M3 | Stitch survey / ORIGINAL_REQUEST R3 |
| 14 | Availability Shift Slot Toggles | Bento list of shift time windows (Morning, Midday, Lunch, Afternoon, Evening) with toggles | M3 | Stitch survey / ORIGINAL_REQUEST R3 |
| 15 | Availability Weekly Capacity Card | High-contrast bento card displaying remaining available hours for the week and report action | M3 | Stitch survey / ORIGINAL_REQUEST R3 |
| 16 | Profile Technician Identity Card | Profile card with photo avatar, technician name, star rating, reviews count, and phone | M4 | Stitch survey / ORIGINAL_REQUEST R4 |
| 17 | Profile Availability Summary Bento | Bento grid with Next Shift card (with Adjust action), Weekly Hours, and Online Status dot | M4 | Stitch survey / ORIGINAL_REQUEST R4 |
| 18 | Profile Account Settings Menu | Grouped card with chevron rows for Notifications, Security, and Help & Support | M4 | Stitch survey / ORIGINAL_REQUEST R4 |
| 19 | Profile Mock Sign-Out Flow | Red outline/text logout button with confirmation dialog and session cleanup | M4 | Stitch survey / ORIGINAL_REQUEST R4 |
| 20 | Static Analysis & Lint Verification | Zero issues reported by `flutter analyze` | M5 | ORIGINAL_REQUEST Acceptance Criteria |
| 21 | Automated Test Suite Verification | 100% passing tests across unit, widget, and navigation suites | M5 | ORIGINAL_REQUEST Acceptance Criteria |
| 22 | Android Debug APK Build Verification | Successful compilation with `flutter build apk --debug` using system JDK | M5 | ORIGINAL_REQUEST Acceptance Criteria |
| 23 | Forensic Integrity Verification | Clean audit verification confirming genuine implementations without cheating or hardcoded bypasses | M5 | Forensic Audit requirement |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Survey & Architecture Mapping | Survey Stitch designs, codebase, and routing architecture | none | DONE |
| M1 | Navigation & Routing System | Implement & verify persistent bottom navigation shell (`IndexedStack`), `AppRoutes`, tab switching, deep navigation to `JobDetailsScreen`, cross-tab jumps | M0 | IN_PROGRESS |
| M2 | Job Details Screen & Lifecycle Actions | Implement & verify `JobDetailsScreen`, sticky action footer, customer contact, map preview, problem quote, equipment/parts bento | M1 | PLANNED |
| M3 | Schedule & Set Availability Screens | Implement & verify `ScheduleScreen` (timeline, upcoming rows) and `SetAvailabilityScreen` (date strip, full-day block, shift toggles, capacity card) | M1 | PLANNED |
| M4 | Profile Screen & Session Management | Implement & verify `ProfileScreen`, technician info card, availability summary bento, settings menu, mock sign-out dialog | M1 | PLANNED |
| M5 | Full Verification, Adversarial Testing & Forensic Audit | Run full test suite, widget validation, `flutter analyze`, `flutter build apk --debug`, challenger validation, and forensic integrity audit | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### Navigation Contracts (`lib/core/navigation/`)
- `AppRoutes`:
  - `static const String root = '/'`
  - `static const String home = '/home'`
  - `static const String schedule = '/schedule'`
  - `static const String availability = '/availability'`
  - `static const String profile = '/profile'`
  - `static const String jobDetails = '/job-details'`
  - `static Route<dynamic> onGenerateRoute(RouteSettings settings)`
- `MainNavigationScaffold`:
  - `const MainNavigationScaffold({super.key, this.initialTabIndex = 0})`
  - Manages persistent `IndexedStack` of `[TodaysJobsScreen, ScheduleScreen, SetAvailabilityScreen, ProfileScreen]`.

### Job Details Contracts (`lib/features/jobs/`)
- `JobEntity`:
  - Properties: `id`, `customerName`, `customerPhone`, `address`, `city`, `distance`, `category`, `status`, `isUrgent`, `timeWindow`, `scheduledTime`, `priceEstimate`, `equipment`, `potentialParts`, `reportedProblem`, `mapImageUrl`, `latitude`, `longitude`.
- `JobRepository`:
  - `Future<List<JobEntity>> getTodaysJobs()`
  - `Future<JobEntity?> getJobById(String id)`
  - `Future<JobSummaryMetricsEntity> getSummaryMetrics()`
  - `Future<void> updateJobStatus(String jobId, JobStatus status)`

### Schedule Contracts (`lib/features/schedule/`)
- `ScheduleEntryEntity`:
  - Properties: `id`, `timeBlock`, `timeRange`, `customerName`, `serviceCategory`, `address`, `status`, `scheduledDate`.
- `UpcomingScheduleEntity`:
  - Properties: `id`, `dayNumber`, `monthAbbreviation`, `customerName`, `timeAndService`, `scheduledDate`.
- `ScheduleRepository`:
  - `Future<List<ScheduleEntryEntity>> getTodaySchedule()`
  - `Future<List<ScheduleEntryEntity>> getTomorrowSchedule()`
  - `Future<List<UpcomingScheduleEntity>> getUpcomingSchedule()`
  - `Future<int> getActiveJobCount()`

### Availability Contracts (`lib/features/availability/`)
- `AvailabilitySlotEntity`:
  - Properties: `id`, `name`, `timeRange`, `isAvailable`, `isBreak`, `iconName`.
- `AvailabilityDayEntity`:
  - Properties: `date`, `dayOfWeek`, `dayNumber`, `isFullyBlocked`, `slots`.
- `WeeklyCapacityEntity`:
  - Properties: `availableHoursRemaining`, `totalWeeklyCapacityHours`.
- `AvailabilityRepository`:
  - `Future<List<DateTime>> getWeekDates({DateTime? anchorDate})`
  - `Future<AvailabilityDayEntity> getAvailabilityForDate(DateTime date)`
  - `Future<void> setFullDayBlocked(DateTime date, bool blocked)`
  - `Future<void> toggleSlotAvailability(DateTime date, String slotId, bool available)`
  - `Future<WeeklyCapacityEntity> getWeeklyCapacity()`

### Profile Contracts (`lib/features/profile/`)
- `TechnicianProfileEntity`:
  - Properties: `id`, `name`, `phone`, `rating`, `reviewCount`, `avatarUrl`, `nextShiftDescription`, `jobsScheduledCount`, `weeklyHours`, `isOnline`.
- `ProfileRepository`:
  - `Future<TechnicianProfileEntity> getProfile()`
  - `Future<void> signOut()`

## Code Layout
```
mobile/lib/
├── core/
│   ├── constants/app_constants.dart
│   ├── navigation/
│   │   ├── app_routes.dart
│   │   └── main_navigation_scaffold.dart
│   └── theme/
│       ├── app_colors.dart
│       ├── app_custom_colors.dart
│       ├── app_radius.dart
│       ├── app_spacing.dart
│       ├── app_theme.dart
│       └── app_typography.dart
├── features/
│   ├── availability/
│   │   ├── data/repositories/mock_availability_repository.dart
│   │   ├── domain/
│   │   │   ├── entities/availability_slot_entity.dart
│   │   │   └── repositories/availability_repository.dart
│   │   └── presentation/
│   │       ├── screens/set_availability_screen.dart
│   │       └── widgets/
│   ├── jobs/
│   │   ├── data/
│   │   │   ├── models/job_model.dart
│   │   │   └── repositories/mock_job_repository.dart
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── job_entity.dart
│   │   │   │   ├── job_status.dart
│   │   │   │   ├── job_summary_metrics_entity.dart
│   │   │   │   └── technician_profile_entity.dart
│   │   │   └── repositories/job_repository.dart
│   │   └── presentation/
│   │       ├── screens/
│   │       │   ├── job_details_screen.dart
│   │       │   └── todays_jobs_screen.dart
│   │       └── widgets/
│   ├── profile/
│   │   ├── data/repositories/mock_profile_repository.dart
│   │   ├── domain/repositories/profile_repository.dart
│   │   └── presentation/
│   │       ├── screens/profile_screen.dart
│   │       └── widgets/
│   └── schedule/
│       ├── data/repositories/mock_schedule_repository.dart
│       ├── domain/
│       │   ├── entities/schedule_entry_entity.dart
│       │   └── repositories/schedule_repository.dart
│       └── presentation/
│           ├── screens/schedule_screen.dart
│           └── widgets/
├── shared/widgets/touch_target_padding.dart
└── main.dart
```
