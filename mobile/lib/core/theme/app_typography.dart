import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Inter typography scale from `DESIGN.md`.
abstract class AppTypography {
  static const String fontFamily = 'Inter';

  // display-lg: 32px, 700 bold, line-height 40px, letter-spacing -0.02em
  static TextStyle get displayLarge => GoogleFonts.inter(
        fontSize: 32.0,
        fontWeight: FontWeight.w700,
        height: 40.0 / 32.0, // 1.25
        letterSpacing: -0.64,
        color: AppColors.onSurface,
      );

  // headline-md: 20px, 600 semibold, line-height 28px
  static TextStyle get headlineMedium => GoogleFonts.inter(
        fontSize: 20.0,
        fontWeight: FontWeight.w600,
        height: 28.0 / 20.0, // 1.40
        letterSpacing: 0.0,
        color: AppColors.onSurface,
      );

  // title-medium: 16px, 600 semibold, line-height 24px (Service title)
  static TextStyle get titleMedium => GoogleFonts.inter(
        fontSize: 16.0,
        fontWeight: FontWeight.w600,
        height: 24.0 / 16.0, // 1.50
        letterSpacing: 0.0,
        color: AppColors.onSurface,
      );

  // body-lg: 16px, 400 regular, line-height 24px
  static TextStyle get bodyLarge => GoogleFonts.inter(
        fontSize: 16.0,
        fontWeight: FontWeight.w400,
        height: 24.0 / 16.0, // 1.50
        letterSpacing: 0.0,
        color: AppColors.onSurface,
      );

  // body-sm: 14px, 400 regular, line-height 20px
  static TextStyle get bodyMedium => GoogleFonts.inter(
        fontSize: 14.0,
        fontWeight: FontWeight.w400,
        height: 20.0 / 14.0, // 1.43
        letterSpacing: 0.0,
        color: AppColors.onSurfaceVariant,
      );

  // label-caps: 12px, 600 semibold, line-height 16px, letter-spacing 0.05em
  static TextStyle get labelCaps => GoogleFonts.inter(
        fontSize: 12.0,
        fontWeight: FontWeight.w600,
        height: 16.0 / 12.0, // 1.33
        letterSpacing: 0.60,
        color: AppColors.outline,
      );

  // badge-sm: 10px, 700 bold, line-height 14px, letter-spacing 0.05em
  static TextStyle get badgeSmall => GoogleFonts.inter(
        fontSize: 10.0,
        fontWeight: FontWeight.w700,
        height: 14.0 / 10.0, // 1.40
        letterSpacing: 0.50,
      );

  // nav-label: 11px, 500 medium, line-height 14px
  static TextStyle get navLabel => GoogleFonts.inter(
        fontSize: 11.0,
        fontWeight: FontWeight.w500,
        height: 14.0 / 11.0,
      );

  static TextTheme get textTheme => TextTheme(
        displayLarge: displayLarge,
        headlineMedium: headlineMedium,
        titleMedium: titleMedium,
        bodyLarge: bodyLarge,
        bodyMedium: bodyMedium,
        labelSmall: labelCaps,
      );
}
