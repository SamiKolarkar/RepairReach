import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Custom theme extension for field technician status badges and role tokens.
@immutable
class AppCustomColors extends ThemeExtension<AppCustomColors> {
  final Color primaryFixed;
  final Color onPrimaryFixed;
  final Color secondaryFixed;
  final Color onSecondaryFixed;
  final Color tertiaryFixed;
  final Color onTertiaryFixed;

  final Color statusAcceptedBg;
  final Color statusAcceptedText;
  final Color statusPendingBg;
  final Color statusPendingText;
  final Color statusInProgressBg;
  final Color statusInProgressText;
  final Color statusOnlineDot;
  final Color starRating;

  final Color callAction;
  final Color whatsappAction;
  final Color statCardCompletedBg;
  final Color statCardCompletedBorder;
  final Color statCardCompletedText;
  final Color statCardCompletedNum;

  const AppCustomColors({
    required this.primaryFixed,
    required this.onPrimaryFixed,
    required this.secondaryFixed,
    required this.onSecondaryFixed,
    required this.tertiaryFixed,
    required this.onTertiaryFixed,
    required this.statusAcceptedBg,
    required this.statusAcceptedText,
    required this.statusPendingBg,
    required this.statusPendingText,
    required this.statusInProgressBg,
    required this.statusInProgressText,
    required this.statusOnlineDot,
    required this.starRating,
    required this.callAction,
    required this.whatsappAction,
    required this.statCardCompletedBg,
    required this.statCardCompletedBorder,
    required this.statCardCompletedText,
    required this.statCardCompletedNum,
  });

  static const light = AppCustomColors(
    primaryFixed: AppColors.primaryFixed,
    onPrimaryFixed: AppColors.onPrimaryFixed,
    secondaryFixed: AppColors.secondaryFixed,
    onSecondaryFixed: AppColors.onSecondaryFixed,
    tertiaryFixed: AppColors.tertiaryFixed,
    onTertiaryFixed: AppColors.onTertiaryFixed,
    statusAcceptedBg: AppColors.statusAcceptedBg,
    statusAcceptedText: AppColors.statusAcceptedText,
    statusPendingBg: AppColors.statusPendingBg,
    statusPendingText: AppColors.statusPendingText,
    statusInProgressBg: AppColors.statusInProgressBg,
    statusInProgressText: AppColors.statusInProgressText,
    statusOnlineDot: AppColors.statusOnlineDot,
    starRating: AppColors.starRating,
    callAction: AppColors.callAction,
    whatsappAction: AppColors.whatsappAction,
    statCardCompletedBg: AppColors.statCardCompletedBg,
    statCardCompletedBorder: AppColors.statCardCompletedBorder,
    statCardCompletedText: AppColors.statCardCompletedText,
    statCardCompletedNum: AppColors.statCardCompletedNum,
  );

  @override
  AppCustomColors copyWith({
    Color? primaryFixed,
    Color? onPrimaryFixed,
    Color? secondaryFixed,
    Color? onSecondaryFixed,
    Color? tertiaryFixed,
    Color? onTertiaryFixed,
    Color? statusAcceptedBg,
    Color? statusAcceptedText,
    Color? statusPendingBg,
    Color? statusPendingText,
    Color? statusInProgressBg,
    Color? statusInProgressText,
    Color? statusOnlineDot,
    Color? starRating,
    Color? callAction,
    Color? whatsappAction,
    Color? statCardCompletedBg,
    Color? statCardCompletedBorder,
    Color? statCardCompletedText,
    Color? statCardCompletedNum,
  }) {
    return AppCustomColors(
      primaryFixed: primaryFixed ?? this.primaryFixed,
      onPrimaryFixed: onPrimaryFixed ?? this.onPrimaryFixed,
      secondaryFixed: secondaryFixed ?? this.secondaryFixed,
      onSecondaryFixed: onSecondaryFixed ?? this.onSecondaryFixed,
      tertiaryFixed: tertiaryFixed ?? this.tertiaryFixed,
      onTertiaryFixed: onTertiaryFixed ?? this.onTertiaryFixed,
      statusAcceptedBg: statusAcceptedBg ?? this.statusAcceptedBg,
      statusAcceptedText: statusAcceptedText ?? this.statusAcceptedText,
      statusPendingBg: statusPendingBg ?? this.statusPendingBg,
      statusPendingText: statusPendingText ?? this.statusPendingText,
      statusInProgressBg: statusInProgressBg ?? this.statusInProgressBg,
      statusInProgressText: statusInProgressText ?? this.statusInProgressText,
      statusOnlineDot: statusOnlineDot ?? this.statusOnlineDot,
      starRating: starRating ?? this.starRating,
      callAction: callAction ?? this.callAction,
      whatsappAction: whatsappAction ?? this.whatsappAction,
      statCardCompletedBg: statCardCompletedBg ?? this.statCardCompletedBg,
      statCardCompletedBorder:
          statCardCompletedBorder ?? this.statCardCompletedBorder,
      statCardCompletedText:
          statCardCompletedText ?? this.statCardCompletedText,
      statCardCompletedNum:
          statCardCompletedNum ?? this.statCardCompletedNum,
    );
  }

  @override
  AppCustomColors lerp(ThemeExtension<AppCustomColors>? other, double t) {
    if (other is! AppCustomColors) return this;
    return AppCustomColors(
      primaryFixed: Color.lerp(primaryFixed, other.primaryFixed, t)!,
      onPrimaryFixed: Color.lerp(onPrimaryFixed, other.onPrimaryFixed, t)!,
      secondaryFixed: Color.lerp(secondaryFixed, other.secondaryFixed, t)!,
      onSecondaryFixed: Color.lerp(onSecondaryFixed, other.onSecondaryFixed, t)!,
      tertiaryFixed: Color.lerp(tertiaryFixed, other.tertiaryFixed, t)!,
      onTertiaryFixed: Color.lerp(onTertiaryFixed, other.onTertiaryFixed, t)!,
      statusAcceptedBg: Color.lerp(statusAcceptedBg, other.statusAcceptedBg, t)!,
      statusAcceptedText:
          Color.lerp(statusAcceptedText, other.statusAcceptedText, t)!,
      statusPendingBg: Color.lerp(statusPendingBg, other.statusPendingBg, t)!,
      statusPendingText:
          Color.lerp(statusPendingText, other.statusPendingText, t)!,
      statusInProgressBg:
          Color.lerp(statusInProgressBg, other.statusInProgressBg, t)!,
      statusInProgressText:
          Color.lerp(statusInProgressText, other.statusInProgressText, t)!,
      statusOnlineDot: Color.lerp(statusOnlineDot, other.statusOnlineDot, t)!,
      starRating: Color.lerp(starRating, other.starRating, t)!,
      callAction: Color.lerp(callAction, other.callAction, t)!,
      whatsappAction: Color.lerp(whatsappAction, other.whatsappAction, t)!,
      statCardCompletedBg:
          Color.lerp(statCardCompletedBg, other.statCardCompletedBg, t)!,
      statCardCompletedBorder: Color.lerp(
          statCardCompletedBorder, other.statCardCompletedBorder, t)!,
      statCardCompletedText:
          Color.lerp(statCardCompletedText, other.statCardCompletedText, t)!,
      statCardCompletedNum:
          Color.lerp(statCardCompletedNum, other.statCardCompletedNum, t)!,
    );
  }
}
