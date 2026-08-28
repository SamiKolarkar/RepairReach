import 'package:flutter/material.dart';

/// Semantic color tokens mined from Google Stitch Design Tokens (`DESIGN.md`).
abstract class AppColors {
  // Material 3 Semantic Colors (35 Tokens)
  static const Color primary = Color(0xFF003D9B);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color primaryContainer = Color(0xFF0052CC);
  static const Color onPrimaryContainer = Color(0xFFC4D2FF);
  static const Color inversePrimary = Color(0xFFB2C5FF);

  static const Color secondary = Color(0xFF4F5F7B);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color secondaryContainer = Color(0xFFCDDDFF);
  static const Color onSecondaryContainer = Color(0xFF51617E);

  static const Color tertiary = Color(0xFF7B2600);
  static const Color onTertiary = Color(0xFFFFFFFF);
  static const Color tertiaryContainer = Color(0xFFA33500);
  static const Color onTertiaryContainer = Color(0xFFFFC6B2);

  static const Color error = Color(0xFFBA1A1A);
  static const Color onError = Color(0xFFFFFFFF);
  static const Color errorContainer = Color(0xFFFFDAD6);
  static const Color onErrorContainer = Color(0xFF93000A);

  static const Color surface = Color(0xFFFAF8FF);
  static const Color onSurface = Color(0xFF191B23);
  static const Color surfaceDim = Color(0xFFD9D9E4);
  static const Color surfaceBright = Color(0xFFFAF8FF);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color surfaceContainerLow = Color(0xFFF3F3FD);
  static const Color surfaceContainer = Color(0xFFEDEDF8);
  static const Color surfaceContainerHigh = Color(0xFFE7E7F2);
  static const Color surfaceContainerHighest = Color(0xFFE1E2EC);
  static const Color surfaceVariant = Color(0xFFE1E2EC);
  static const Color onSurfaceVariant = Color(0xFF434654);

  static const Color outline = Color(0xFF737685);
  static const Color outlineVariant = Color(0xFFC3C6D6);
  static const Color surfaceTint = Color(0xFF0C56D0);
  static const Color inverseSurface = Color(0xFF2E3038);
  static const Color inverseOnSurface = Color(0xFFF0F0FB);

  static const Color background = Color(0xFFFAF8FF);
  static const Color onBackground = Color(0xFF191B23);

  // M3 Fixed Roles (12 Tokens)
  static const Color primaryFixed = Color(0xFFDAE2FF);
  static const Color primaryFixedDim = Color(0xFFB2C5FF);
  static const Color onPrimaryFixed = Color(0xFF001848);
  static const Color onPrimaryFixedVariant = Color(0xFF0040A2);

  static const Color secondaryFixed = Color(0xFFD6E3FF);
  static const Color secondaryFixedDim = Color(0xFFB7C7E8);
  static const Color onSecondaryFixed = Color(0xFF091C35);
  static const Color onSecondaryFixedVariant = Color(0xFF374763);

  static const Color tertiaryFixed = Color(0xFFFFDBCF);
  static const Color tertiaryFixedDim = Color(0xFFFFB59B);
  static const Color onTertiaryFixed = Color(0xFF380D00);
  static const Color onTertiaryFixedVariant = Color(0xFF812800);

  // Functional Status & Badge Colors
  static const Color statusAcceptedBg = Color(0xFFDCFCE7); // green-100
  static const Color statusAcceptedText = Color(0xFF15803D); // green-700
  static const Color statusPendingBg = Color(0xFFFEF3C7); // amber-100
  static const Color statusPendingText = Color(0xFFB45309); // amber-700
  static const Color statusInProgressBg = Color(0xFFDBEAFE); // blue-100
  static const Color statusInProgressText = Color(0xFF1E40AF); // blue-800
  static const Color statusOnlineDot = Color(0xFF10B981); // emerald-500
  static const Color starRating = Color(0xFFF59E0B); // amber-500

  // Action & Metric Container Colors
  static const Color callAction = Color(0xFF2563EB); // blue-600
  static const Color whatsappAction = Color(0xFF16A34A); // green-600
  static const Color statCardCompletedBg = Color(0xFFEFF6FF); // blue-50
  static const Color statCardCompletedBorder = Color(0xFFDBEAFE); // blue-100
  static const Color statCardCompletedText = Color(0xFF1D4ED8); // blue-700
  static const Color statCardCompletedNum = Color(0xFF1E3A8A); // blue-900
}
