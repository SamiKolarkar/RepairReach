import 'package:equatable/equatable.dart';

/// Pure domain entity representing technician identity and performance summary.
class TechnicianProfileEntity extends Equatable {
  final String id;
  final String name;
  final String avatarUrl;
  final String phone;
  final double rating;
  final int reviewCount;
  final String status;
  final String nextShift;
  final double weeklyHours;

  const TechnicianProfileEntity({
    required this.id,
    required this.name,
    required this.avatarUrl,
    required this.phone,
    required this.rating,
    required this.reviewCount,
    required this.status,
    required this.nextShift,
    required this.weeklyHours,
  });

  @override
  List<Object?> get props => [
        id,
        name,
        avatarUrl,
        phone,
        rating,
        reviewCount,
        status,
        nextShift,
        weeklyHours,
      ];
}
