import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_typography.dart';

/// Location card with integrated map preview, address overlay tag, and directions button.
class LocationMapCardWidget extends StatelessWidget {
  final String address;
  final String city;
  final String? mapImageUrl;
  final String estimatedTravelTime;
  final VoidCallback? onGetDirections;

  const LocationMapCardWidget({
    super.key,
    required this.address,
    required this.city,
    this.mapImageUrl,
    required this.estimatedTravelTime,
    this.onGetDirections,
  });

  @override
  Widget build(BuildContext context) {
    final fullAddress = '$address, $city';

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: AppRadius.borderLg,
        border: Border.all(
          color: AppColors.outlineVariant.withOpacity(0.30),
          width: 1.0,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 3.0,
            offset: Offset(0, 1),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          // Top Map Image Container with Gradient Overlay
          SizedBox(
            height: 160.0,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (mapImageUrl?.isNotEmpty == true)
                  Image.network(
                    mapImageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: AppColors.surfaceVariant,
                      child: const Center(
                        child: Icon(
                          Icons.map_outlined,
                          color: AppColors.outline,
                          size: 40.0,
                        ),
                      ),
                    ),
                  )
                else
                  Container(
                    color: AppColors.surfaceVariant,
                    child: const Center(
                      child: Icon(
                        Icons.map_outlined,
                        color: AppColors.outline,
                        size: 40.0,
                      ),
                    ),
                  ),

                // Gradient Overlay
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withOpacity(0.60),
                      ],
                    ),
                  ),
                ),

                // Bottom Left Overlay Address Tag
                Positioned(
                  bottom: 12.0,
                  left: 12.0,
                  right: 12.0,
                  child: Row(
                    children: [
                      const Icon(
                        Icons.location_on,
                        color: Colors.white,
                        size: 18.0,
                      ),
                      const SizedBox(width: 4.0),
                      Expanded(
                        child: Text(
                          fullAddress,
                          style: AppTypography.labelCaps.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Bottom Info Bar
          Padding(
            padding: const EdgeInsets.all(AppSpacing.stackMd),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Estimated travel: $estimatedTravelTime',
                    style: AppTypography.bodyMedium.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: AppSpacing.stackSm),
                InkWell(
                  onTap: onGetDirections,
                  borderRadius: BorderRadius.circular(4.0),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'GET DIRECTIONS',
                        style: AppTypography.titleMedium.copyWith(
                          fontSize: 14.0,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 4.0),
                      const Icon(
                        Icons.open_in_new,
                        size: 16.0,
                        color: AppColors.primary,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
