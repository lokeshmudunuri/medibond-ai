import 'provenance.dart';

class ProcedureEntity {
  final String id;
  final String name; // e.g. Laparoscopic Appendectomy, Total Knee Arthroplasty
  final DateTime procedureDate;
  final String hospital;
  final String surgeon;
  final String notes;
  final String recoveryStatus; // In Recovery, Fully Healed, Complication
  final Provenance provenance;

  ProcedureEntity({
    required this.id,
    required this.name,
    required this.procedureDate,
    this.hospital = '',
    this.surgeon = '',
    this.notes = '',
    this.recoveryStatus = 'In Recovery',
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'procedureDate': procedureDate.toIso8601String(),
      'hospital': hospital,
      'surgeon': surgeon,
      'notes': notes,
      'recoveryStatus': recoveryStatus,
      'provenance': provenance.toMap(),
    };
  }

  factory ProcedureEntity.fromMap(Map<String, dynamic> map) {
    return ProcedureEntity(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      procedureDate: map['procedureDate'] != null
          ? DateTime.parse(map['procedureDate'])
          : DateTime.now(),
      hospital: map['hospital'] ?? '',
      surgeon: map['surgeon'] ?? '',
      notes: map['notes'] ?? '',
      recoveryStatus: map['recoveryStatus'] ?? 'In Recovery',
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
