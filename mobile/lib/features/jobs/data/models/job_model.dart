import '../../domain/entities/job_entity.dart';
import '../../domain/entities/job_status.dart';

/// Data transfer model for technician jobs supporting serialization.
class JobModel extends JobEntity {
  const JobModel({
    required super.id,
    required super.customerName,
    required super.customerPhone,
    required super.timeWindow,
    required super.status,
    required super.serviceCategory,
    required super.serviceTitle,
    required super.address,
    required super.city,
    super.mapImageUrl,
    required super.description,
    required super.priority,
    required super.clientType,
    required super.equipment,
    required super.potentialParts,
    required super.estimatedTravelTime,
  });

  factory JobModel.fromEntity(JobEntity entity) {
    return JobModel(
      id: entity.id,
      customerName: entity.customerName,
      customerPhone: entity.customerPhone,
      timeWindow: entity.timeWindow,
      status: entity.status,
      serviceCategory: entity.serviceCategory,
      serviceTitle: entity.serviceTitle,
      address: entity.address,
      city: entity.city,
      mapImageUrl: entity.mapImageUrl,
      description: entity.description,
      priority: entity.priority,
      clientType: entity.clientType,
      equipment: entity.equipment,
      potentialParts: entity.potentialParts,
      estimatedTravelTime: entity.estimatedTravelTime,
    );
  }

  factory JobModel.fromJson(Map<String, dynamic> json) {
    return JobModel(
      id: json['id'] as String,
      customerName: json['customerName'] as String,
      customerPhone: json['customerPhone'] as String,
      timeWindow: json['timeWindow'] as String,
      status: JobStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => JobStatus.pending,
      ),
      serviceCategory: ServiceCategory.values.firstWhere(
        (c) => c.name == json['serviceCategory'],
        orElse: () => ServiceCategory.hvac,
      ),
      serviceTitle: json['serviceTitle'] as String,
      address: json['address'] as String,
      city: json['city'] as String,
      mapImageUrl: json['mapImageUrl'] as String?,
      description: json['description'] as String,
      priority: json['priority'] as String,
      clientType: json['clientType'] as String,
      equipment: List<String>.from(json['equipment'] as List? ?? []),
      potentialParts: List<String>.from(json['potentialParts'] as List? ?? []),
      estimatedTravelTime: json['estimatedTravelTime'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'timeWindow': timeWindow,
      'status': status.name,
      'serviceCategory': serviceCategory.name,
      'serviceTitle': serviceTitle,
      'address': address,
      'city': city,
      'mapImageUrl': mapImageUrl,
      'description': description,
      'priority': priority,
      'clientType': clientType,
      'equipment': equipment,
      'potentialParts': potentialParts,
      'estimatedTravelTime': estimatedTravelTime,
    };
  }
}
