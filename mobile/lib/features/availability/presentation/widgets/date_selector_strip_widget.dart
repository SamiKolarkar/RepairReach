import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/availability_slot_entity.dart';

/// Horizontal scrollable date picker strip for selecting active calendar day.
class DateSelectorStripWidget extends StatelessWidget {
  final List<AvailabilityDayEntity> days;
  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateSelected;

  const DateSelectorStripWidget({
    super.key,
    required this.days,
    required this.selectedDate,
    required this.onDateSelected,
  });

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 84.0,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: days.length,
        separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.gutter),
        itemBuilder: (context, index) {
          final day = days[index];
          final isSelected = _isSameDay(day.date, selectedDate);

          return InkWell(
            onTap: () => onDateSelected(day.date),
            borderRadius: AppRadius.borderLg,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 64.0,
              height: 80.0,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primaryContainer
                    : AppColors.surfaceContainerLowest,
                borderRadius: AppRadius.borderLg,
                border: isSelected
                    ? null
                    : Border.all(
                        color: AppColors.outlineVariant,
                        width: 1.0,
                      ),
                boxShadow: isSelected
                    ? const [
                        BoxShadow(
                          color: Color(0x1A0052CC),
                          blurRadius: 4.0,
                          offset: Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    day.dayOfWeek,
                    style: AppTypography.labelCaps.copyWith(
                      fontSize: 12.0,
                      fontWeight: FontWeight.w600,
                      color: isSelected
                          ? AppColors.onPrimaryContainer.withOpacity(0.8)
                          : AppColors.onSurfaceVariant,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.unit),
                  Text(
                    day.dayNumber,
                    style: AppTypography.headlineMedium.copyWith(
                      fontSize: 20.0,
                      fontWeight: FontWeight.w700,
                      color: isSelected
                          ? AppColors.onPrimaryContainer
                          : AppColors.onSurface,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
