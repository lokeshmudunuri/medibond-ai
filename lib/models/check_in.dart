import 'provenance.dart';

class DailyCheckInEntity {
  final String id;
  final DateTime checkInDate;
  final int painScore; // 0 - 10
  final int fatigueScore; // 0 - 10
  final int moodScore; // 1 - 5 (1: very low, 5: excellent)
  final double sleepHours;
  final bool tookAllMedications;
  final String reportedSymptoms;
  final String patientSpokenTranscript;
  final String adaptiveFollowUpQuestion;
  final String adaptiveFollowUpAnswer;
  final String clinicianNotes;
  final Provenance provenance;

  DailyCheckInEntity({
    required this.id,
    required this.checkInDate,
    required this.painScore,
    this.fatigueScore = 3,
    this.moodScore = 4,
    this.sleepHours = 7.5,
    this.tookAllMedications = true,
    this.reportedSymptoms = '',
    this.patientSpokenTranscript = '',
    this.adaptiveFollowUpQuestion = '',
    this.adaptiveFollowUpAnswer = '',
    this.clinicianNotes = '',
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'checkInDate': checkInDate.toIso8601String(),
      'painScore': painScore,
      'fatigueScore': fatigueScore,
      'moodScore': moodScore,
      'sleepHours': sleepHours,
      'tookAllMedications': tookAllMedications ? 1 : 0,
      'reportedSymptoms': reportedSymptoms,
      'patientSpokenTranscript': patientSpokenTranscript,
      'adaptiveFollowUpQuestion': adaptiveFollowUpQuestion,
      'adaptiveFollowUpAnswer': adaptiveFollowUpAnswer,
      'clinicianNotes': clinicianNotes,
      'provenance': provenance.toMap(),
    };
  }

  factory DailyCheckInEntity.fromMap(Map<String, dynamic> map) {
    return DailyCheckInEntity(
      id: map['id'] ?? '',
      checkInDate: map['checkInDate'] != null
          ? DateTime.parse(map['checkInDate'])
          : DateTime.now(),
      painScore: map['painScore'] ?? 0,
      fatigueScore: map['fatigueScore'] ?? 3,
      moodScore: map['moodScore'] ?? 4,
      sleepHours: (map['sleepHours'] as num?)?.toDouble() ?? 7.5,
      tookAllMedications: map['tookAllMedications'] == 1 || map['tookAllMedications'] == true,
      reportedSymptoms: map['reportedSymptoms'] ?? '',
      patientSpokenTranscript: map['patientSpokenTranscript'] ?? '',
      adaptiveFollowUpQuestion: map['adaptiveFollowUpQuestion'] ?? '',
      adaptiveFollowUpAnswer: map['adaptiveFollowUpAnswer'] ?? '',
      clinicianNotes: map['clinicianNotes'] ?? '',
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
