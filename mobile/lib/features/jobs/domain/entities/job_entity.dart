import 'package:equatable/equatable.dart';
import 'job_status.dart';

/// Pure domain entity representing an assigned technician job.
class JobEntity extends Equatable {
  final String id;
  final String customerName;
  final String customerPhone;
  final String timeWindow;
  final JobStatus status;
  final ServiceCategory serviceCategory;
  final String serviceTitle;
  final String address;
  final String city;
  final String? mapImageUrl;
  final String description;
  final String priority;
  final String clientType;
  final List<String> equipment;
  final List<String> potentialParts;
  final String estimatedTravelTime;

  const JobEntity({
    required this.id,
    required this.customerName,
    required this.customerPhone,
    required this.timeWindow,
    required this.status,
    required this.serviceCategory,
    required this.serviceTitle,
    required this.address,
    required this.city,
    this.mapImageUrl,
    required this.description,
    required this.priority,
    required this.clientType,
    required this.equipment,
    required this.potentialParts,
    required this.estimatedTravelTime,
  });

  @override
  List<Object?> get props => [
        id,
        customerName,
        customerPhone,
        timeWindow,
        status,
        serviceCategory,
        serviceTitle,
        address,
        city,
        mapImageUrl,
        description,
        priority,
        clientType,
        equipment,
        potentialParts,
        estimatedTravelTime,
      ];
}
