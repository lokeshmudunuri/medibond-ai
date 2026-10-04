import 'provenance.dart';

class DoctorInstructionEntity {
  final String id;
  final String title; // e.g. Wound Care, Mobility Protocol, Dietary Restriction
  final String instruction; // e.g. Keep incision dry for 5 days. Walk 10 mins 3x/day.
  final String category; // Activity, Medication, WoundCare, Diet, WarningSigns
  final DateTime givenDate;
  final String doctorName;
  final bool isCompleted;
  final Provenance provenance;

  DoctorInstructionEntity({
    required this.id,
    required this.title,
    required this.instruction,
    required this.category,
    required this.givenDate,
    this.doctorName = '',
    this.isCompleted = false,
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'instruction': instruction,
      'category': category,
      'givenDate': givenDate.toIso8601String(),
      'doctorName': doctorName,
      'isCompleted': isCompleted ? 1 : 0,
      'provenance': provenance.toMap(),
    };
  }

  factory DoctorInstructionEntity.fromMap(Map<String, dynamic> map) {
    return DoctorInstructionEntity(
      id: map['id'] ?? '',
      title: map['title'] ?? '',
      instruction: map['instruction'] ?? '',
      category: map['category'] ?? 'Activity',
      givenDate: map['givenDate'] != null
          ? DateTime.parse(map['givenDate'])
          : DateTime.now(),
      doctorName: map['doctorName'] ?? '',
      isCompleted: map['isCompleted'] == 1 || map['isCompleted'] == true,
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
