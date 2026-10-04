import 'provenance.dart';

class MedicineEntity {
  final String id;
  final String name; // Brand or prescribed name (e.g. Metformin 500mg)
  final String genericName; // Canonical generic name (e.g. Metformin Hydrochloride)
  final String dosage; // e.g. 500mg, 10ml, 1 tablet
  final String form; // Tablet, Capsule, Syrup, Injection, Ointment
  final String frequency; // Once daily, Twice daily (BID), Thrice daily (TID), SOS
  final String timing; // Before food, After food, Empty stomach, Bedtime
  final String instructions; // Doctor instructions (e.g. take with a full glass of water)
  final DateTime startDate;
  final DateTime? endDate;
  final bool isActive;
  final bool isConfirmedByUser; // Mandatory user confirmation check
  final List<String> reminderTimes; // e.g. ["08:00", "20:00"]
  final String? prescribedForCondition;
  final String? prescribingDoctor;
  final Provenance provenance;

  MedicineEntity({
    required this.id,
    required this.name,
    this.genericName = '',
    required this.dosage,
    this.form = 'Tablet',
    required this.frequency,
    this.timing = 'After food',
    this.instructions = '',
    required this.startDate,
    this.endDate,
    this.isActive = true,
    this.isConfirmedByUser = true,
    this.reminderTimes = const [],
    this.prescribedForCondition,
    this.prescribingDoctor,
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'genericName': genericName,
      'dosage': dosage,
      'form': form,
      'frequency': frequency,
      'timing': timing,
      'instructions': instructions,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'isActive': isActive ? 1 : 0,
      'isConfirmedByUser': isConfirmedByUser ? 1 : 0,
      'reminderTimes': reminderTimes.join(','),
      'prescribedForCondition': prescribedForCondition,
      'prescribingDoctor': prescribingDoctor,
      'provenance': provenance.toMap(),
    };
  }

  factory MedicineEntity.fromMap(Map<String, dynamic> map) {
    return MedicineEntity(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      genericName: map['genericName'] ?? '',
      dosage: map['dosage'] ?? '',
      form: map['form'] ?? 'Tablet',
      frequency: map['frequency'] ?? 'Once daily',
      timing: map['timing'] ?? 'After food',
      instructions: map['instructions'] ?? '',
      startDate: map['startDate'] != null
          ? DateTime.parse(map['startDate'])
          : DateTime.now(),
      endDate: map['endDate'] != null ? DateTime.parse(map['endDate']) : null,
      isActive: map['isActive'] == 1 || map['isActive'] == true,
      isConfirmedByUser: map['isConfirmedByUser'] == 1 || map['isConfirmedByUser'] == true,
      reminderTimes: map['reminderTimes'] != null && (map['reminderTimes'] as String).isNotEmpty
          ? (map['reminderTimes'] as String).split(',')
          : [],
      prescribedForCondition: map['prescribedForCondition'],
      prescribingDoctor: map['prescribingDoctor'],
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }

  MedicineEntity copyWith({
    String? id,
    String? name,
    String? genericName,
    String? dosage,
    String? form,
    String? frequency,
    String? timing,
    String? instructions,
    DateTime? startDate,
    DateTime? endDate,
    bool? isActive,
    bool? isConfirmedByUser,
    List<String>? reminderTimes,
    String? prescribedForCondition,
    String? prescribingDoctor,
    Provenance? provenance,
  }) {
    return MedicineEntity(
      id: id ?? this.id,
      name: name ?? this.name,
      genericName: genericName ?? this.genericName,
      dosage: dosage ?? this.dosage,
      form: form ?? this.form,
      frequency: frequency ?? this.frequency,
      timing: timing ?? this.timing,
      instructions: instructions ?? this.instructions,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isActive: isActive ?? this.isActive,
      isConfirmedByUser: isConfirmedByUser ?? this.isConfirmedByUser,
      reminderTimes: reminderTimes ?? this.reminderTimes,
      prescribedForCondition: prescribedForCondition ?? this.prescribedForCondition,
      prescribingDoctor: prescribingDoctor ?? this.prescribingDoctor,
      provenance: provenance ?? this.provenance,
    );
  }
}
