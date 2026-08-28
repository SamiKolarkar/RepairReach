import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:repairreach_technician/core/theme/app_colors.dart';
import 'package:repairreach_technician/core/theme/app_custom_colors.dart';
import 'package:repairreach_technician/core/theme/app_radius.dart';
import 'package:repairreach_technician/core/theme/app_spacing.dart';
import 'package:repairreach_technician/core/theme/app_theme.dart';
import 'package:repairreach_technician/core/theme/app_typography.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AppColors Design Tokens', () {
    test('verifies primary, secondary, surface and functional tokens', () {
      expect(AppColors.primary, const Color(0xFF003D9B));
      expect(AppColors.onPrimary, const Color(0xFFFFFFFF));
      expect(AppColors.primaryContainer, const Color(0xFF0052CC));
      expect(AppColors.surface, const Color(0xFFFAF8FF));
      expect(AppColors.onSurface, const Color(0xFF191B23));
      expect(AppColors.statusAcceptedBg, const Color(0xFFDCFCE7));
      expect(AppColors.statusAcceptedText, const Color(0xFF15803D));
      expect(AppColors.statusPendingBg, const Color(0xFFFEF3C7));
      expect(AppColors.statusPendingText, const Color(0xFFB45309));
    });
  });

  group('AppSpacing & AppRadius Tokens', () {
    test('verifies 4px spacing unit and 48px touch target', () {
      expect(AppSpacing.unit, 4.0);
      expect(AppSpacing.stackSm, 8.0);
      expect(AppSpacing.gutter, 12.0);
      expect(AppSpacing.marginEdge, 16.0);
      expect(AppSpacing.stackMd, 16.0);
      expect(AppSpacing.stackLg, 24.0);
      expect(AppSpacing.touchTargetMin, 48.0);
    });

    test('verifies 16px card border radius', () {
      expect(AppRadius.lg, 16.0);
      expect(AppRadius.md, 12.0);
      expect(AppRadius.defaultRadius, 8.0);
    });
  });

  group('AppTheme Configuration', () {
    testWidgets('lightTheme has Material 3 enabled and exposes custom extensions',
        (tester) async {
      final theme = AppTheme.lightTheme;
      expect(theme.useMaterial3, isTrue);
      expect(theme.colorScheme.primary, AppColors.primary);
      expect(theme.colorScheme.surface, AppColors.surface);
      expect(theme.scaffoldBackgroundColor, AppColors.background);

      final customColors = theme.extension<AppCustomColors>();
      expect(customColors, isNotNull);
      expect(customColors!.statusAcceptedBg, AppColors.statusAcceptedBg);
      expect(customColors.statusPendingBg, AppColors.statusPendingBg);
    });

    test('AppCustomColors copyWith and lerp operate properly', () {
      const base = AppCustomColors.light;
      final copy = base.copyWith(statusAcceptedBg: Colors.black);
      expect(copy.statusAcceptedBg, Colors.black);
      expect(copy.statusAcceptedText, base.statusAcceptedText);

      final lerped = base.lerp(copy, 0.5);
      expect(lerped, isNotNull);
    });
  });

  group('AppTypography Tokens', () {
    testWidgets('verifies typography styles and weights', (tester) async {
      expect(AppTypography.fontFamily, 'Inter');
      expect(AppTypography.displayLarge.fontSize, 32.0);
      expect(AppTypography.displayLarge.fontWeight, FontWeight.w700);
      expect(AppTypography.headlineMedium.fontSize, 20.0);
      expect(AppTypography.headlineMedium.fontWeight, FontWeight.w600);
      expect(AppTypography.titleMedium.fontSize, 16.0);
      expect(AppTypography.bodyLarge.fontSize, 16.0);
      expect(AppTypography.bodyMedium.fontSize, 14.0);
      expect(AppTypography.labelCaps.fontSize, 12.0);
      expect(AppTypography.badgeSmall.fontSize, 10.0);
    });
  });
}
