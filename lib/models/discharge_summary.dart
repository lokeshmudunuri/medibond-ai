import 'provenance.dart';

class DischargeSummaryEntity {
  final String id;
  final String title;
  final String hospitalName;
  final String attendingPhysician;
  final DateTime admissionDate;
  final DateTime dischargeDate;
  final List<String> primaryDiagnoses;
  final List<String> proceduresPerformed;
  final List<String> dischargeMedications;
  final String activityRestrictions;
  final String woundCareInstructions;
  final String dietInstructions;
  final List<String> redFlagWarningSigns;
  final String followUpInstructions;
  final String rawText;
  final Provenance provenance;

  DischargeSummaryEntity({
    required this.id,
    required this.title,
    required this.hospitalName,
    required this.attendingPhysician,
    required this.admissionDate,
    required this.dischargeDate,
    this.primaryDiagnoses = const [],
    this.proceduresPerformed = const [],
    this.dischargeMedications = const [],
    this.activityRestrictions = '',
    this.woundCareInstructions = '',
    this.dietInstructions = '',
    this.redFlagWarningSigns = const [],
    this.followUpInstructions = '',
    this.rawText = '',
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'hospitalName': hospitalName,
      'attendingPhysician': attendingPhysician,
      'admissionDate': admissionDate.toIso8601String(),
      'dischargeDate': dischargeDate.toIso8601String(),
      'primaryDiagnoses': primaryDiagnoses.join('; '),
      'proceduresPerformed': proceduresPerformed.join('; '),
      'dischargeMedications': dischargeMedications.join('; '),
      'activityRestrictions': activityRestrictions,
      'woundCareInstructions': woundCareInstructions,
      'dietInstructions': dietInstructions,
      'redFlagWarningSigns': redFlagWarningSigns.join('; '),
      'followUpInstructions': followUpInstructions,
      'rawText': rawText,
      'provenance': provenance.toMap(),
    };
  }

  factory DischargeSummaryEntity.fromMap(Map<String, dynamic> map) {
    return DischargeSummaryEntity(
      id: map['id'] ?? '',
      title: map['title'] ?? 'Discharge Summary',
      hospitalName: map['hospitalName'] ?? '',
      attendingPhysician: map['attendingPhysician'] ?? '',
      admissionDate: map['admissionDate'] != null ? DateTime.parse(map['admissionDate']) : DateTime.now(),
      dischargeDate: map['dischargeDate'] != null ? DateTime.parse(map['dischargeDate']) : DateTime.now(),
      primaryDiagnoses: (map['primaryDiagnoses'] as String?)?.split('; ').where((s) => s.isNotEmpty).toList() ?? [],
      proceduresPerformed: (map['proceduresPerformed'] as String?)?.split('; ').where((s) => s.isNotEmpty).toList() ?? [],
      dischargeMedications: (map['dischargeMedications'] as String?)?.split('; ').where((s) => s.isNotEmpty).toList() ?? [],
      activityRestrictions: map['activityRestrictions'] ?? '',
      woundCareInstructions: map['woundCareInstructions'] ?? '',
      dietInstructions: map['dietInstructions'] ?? '',
      redFlagWarningSigns: (map['redFlagWarningSigns'] as String?)?.split('; ').where((s) => s.isNotEmpty).toList() ?? [],
      followUpInstructions: map['followUpInstructions'] ?? '',
      rawText: map['rawText'] ?? '',
      provenance: map['provenance'] != null
          ? (map['provenance'] is Map ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance'])) : Provenance.documented())
          : Provenance.documented(),
    );
  }
}
