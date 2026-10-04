import 'provenance.dart';

class PatientProfile {
  final String id;
  final String name;
  final int age;
  final String gender;
  final String bloodGroup;
  final double heightCm;
  final double weightKg;
  final String emergencyContactName;
  final String emergencyContactPhone;
  final String preferredLanguage;
  final Provenance provenance;

  PatientProfile({
    required this.id,
    required this.name,
    required this.age,
    required this.gender,
    this.bloodGroup = 'Unknown',
    this.heightCm = 0.0,
    this.weightKg = 0.0,
    this.emergencyContactName = '',
    this.emergencyContactPhone = '',
    this.preferredLanguage = 'en',
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'age': age,
      'gender': gender,
      'bloodGroup': bloodGroup,
      'heightCm': heightCm,
      'weightKg': weightKg,
      'emergencyContactName': emergencyContactName,
      'emergencyContactPhone': emergencyContactPhone,
      'preferredLanguage': preferredLanguage,
      'provenance': provenance.toMap(),
    };
  }

  factory PatientProfile.fromMap(Map<String, dynamic> map) {
    return PatientProfile(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      age: map['age'] ?? 0,
      gender: map['gender'] ?? '',
      bloodGroup: map['bloodGroup'] ?? 'Unknown',
      heightCm: (map['heightCm'] as num?)?.toDouble() ?? 0.0,
      weightKg: (map['weightKg'] as num?)?.toDouble() ?? 0.0,
      emergencyContactName: map['emergencyContactName'] ?? '',
      emergencyContactPhone: map['emergencyContactPhone'] ?? '',
      preferredLanguage: map['preferredLanguage'] ?? 'en',
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
