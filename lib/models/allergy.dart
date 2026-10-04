import 'provenance.dart';

class AllergyEntity {
  final String id;
  final String allergen; // e.g. Penicillin, Sulfa drugs, Peanuts
  final String reaction; // e.g. Rash, Anaphylaxis, Swelling
  final String severity; // Mild, Moderate, Severe, Life-Threatening
  final DateTime identifiedDate;
  final Provenance provenance;

  AllergyEntity({
    required this.id,
    required this.allergen,
    required this.reaction,
    required this.severity,
    required this.identifiedDate,
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'allergen': allergen,
      'reaction': reaction,
      'severity': severity,
      'identifiedDate': identifiedDate.toIso8601String(),
      'provenance': provenance.toMap(),
    };
  }

  factory AllergyEntity.fromMap(Map<String, dynamic> map) {
    return AllergyEntity(
      id: map['id'] ?? '',
      allergen: map['allergen'] ?? '',
      reaction: map['reaction'] ?? '',
      severity: map['severity'] ?? 'Moderate',
      identifiedDate: map['identifiedDate'] != null
          ? DateTime.parse(map['identifiedDate'])
          : DateTime.now(),
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
