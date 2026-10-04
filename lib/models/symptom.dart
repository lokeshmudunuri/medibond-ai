import 'provenance.dart';

class SymptomEntity {
  final String id;
  final String symptom; // e.g. Pain at incision, Dizziness, Fever, Swelling
  final int severity; // 1 to 10 scale
  final String location; // e.g. Right knee, Lower abdomen
  final DateTime loggedAt;
  final String notes;
  final bool isTriggerForAlert;
  final Provenance provenance;

  SymptomEntity({
    required this.id,
    required this.symptom,
    required this.severity,
    this.location = '',
    required this.loggedAt,
    this.notes = '',
    this.isTriggerForAlert = false,
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'symptom': symptom,
      'severity': severity,
      'location': location,
      'loggedAt': loggedAt.toIso8601String(),
      'notes': notes,
      'isTriggerForAlert': isTriggerForAlert ? 1 : 0,
      'provenance': provenance.toMap(),
    };
  }

  factory SymptomEntity.fromMap(Map<String, dynamic> map) {
    return SymptomEntity(
      id: map['id'] ?? '',
      symptom: map['symptom'] ?? '',
      severity: map['severity'] ?? 1,
      location: map['location'] ?? '',
      loggedAt: map['loggedAt'] != null
          ? DateTime.parse(map['loggedAt'])
          : DateTime.now(),
      notes: map['notes'] ?? '',
      isTriggerForAlert: map['isTriggerForAlert'] == 1 || map['isTriggerForAlert'] == true,
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
