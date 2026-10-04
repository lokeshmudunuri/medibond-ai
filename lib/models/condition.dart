import 'provenance.dart';

class ConditionEntity {
  final String id;
  final String name;
  final String icdOrCategory;
  final DateTime diagnosedDate;
  final String status; // active, managed, resolved, historical
  final String notes;
  final Provenance provenance;

  ConditionEntity({
    required this.id,
    required this.name,
    this.icdOrCategory = 'General',
    required this.diagnosedDate,
    this.status = 'active',
    this.notes = '',
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'icdOrCategory': icdOrCategory,
      'diagnosedDate': diagnosedDate.toIso8601String(),
      'status': status,
      'notes': notes,
      'provenance': provenance.toMap(),
    };
  }

  factory ConditionEntity.fromMap(Map<String, dynamic> map) {
    return ConditionEntity(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      icdOrCategory: map['icdOrCategory'] ?? 'General',
      diagnosedDate: map['diagnosedDate'] != null
          ? DateTime.parse(map['diagnosedDate'])
          : DateTime.now(),
      status: map['status'] ?? 'active',
      notes: map['notes'] ?? '',
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
