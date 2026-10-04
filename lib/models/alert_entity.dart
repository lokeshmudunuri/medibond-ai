import 'provenance.dart';

enum AlertSeverity {
  info,
  warning,
  critical,
  emergency,
}

enum ClinicalEscalationLevel {
  monitor,
  contactDoctor,
  urgentMedicalAttention,
}

extension ClinicalEscalationLevelExtension on ClinicalEscalationLevel {
  String get displayName {
    switch (this) {
      case ClinicalEscalationLevel.monitor:
        return 'MONITOR';
      case ClinicalEscalationLevel.contactDoctor:
        return 'CONTACT DOCTOR';
      case ClinicalEscalationLevel.urgentMedicalAttention:
        return 'URGENT MEDICAL ATTENTION';
    }
  }
}

class AlertEntity {
  final String id;
  final String title;
  final String metricOrSource;
  final double observedValue;
  final double baselineValue;
  final double deviation;
  final AlertSeverity severity;
  final String explanation;
  final String recommendedAction;
  final DateTime timestamp;
  final bool isAcknowledged;
  final bool isCaregiverEscalated;
  final Provenance provenance;

  // Phase 4 Structured Explainability fields
  final String? whatChanged;
  final String? whyItMatters;
  final String? dataCausedFlag;
  final String? persistedDuration;
  final ClinicalEscalationLevel escalationLevel;

  AlertEntity({
    required this.id,
    required this.title,
    required this.metricOrSource,
    required this.observedValue,
    required this.baselineValue,
    required this.deviation,
    required this.severity,
    required this.explanation,
    required this.recommendedAction,
    required this.timestamp,
    this.isAcknowledged = false,
    this.isCaregiverEscalated = false,
    required this.provenance,
    this.whatChanged,
    this.whyItMatters,
    this.dataCausedFlag,
    this.persistedDuration,
    this.escalationLevel = ClinicalEscalationLevel.monitor,
  });

  String get message => explanation;

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'metricOrSource': metricOrSource,
      'observedValue': observedValue,
      'baselineValue': baselineValue,
      'deviation': deviation,
      'severity': severity.name,
      'explanation': explanation,
      'recommendedAction': recommendedAction,
      'timestamp': timestamp.toIso8601String(),
      'isAcknowledged': isAcknowledged ? 1 : 0,
      'isCaregiverEscalated': isCaregiverEscalated ? 1 : 0,
      'provenance': provenance.toMap(),
      'whatChanged': whatChanged,
      'whyItMatters': whyItMatters,
      'dataCausedFlag': dataCausedFlag,
      'persistedDuration': persistedDuration,
      'escalationLevel': escalationLevel.name,
    };
  }

  factory AlertEntity.fromMap(Map<String, dynamic> map) {
    return AlertEntity(
      id: map['id'] ?? '',
      title: map['title'] ?? '',
      metricOrSource: map['metricOrSource'] ?? '',
      observedValue: (map['observedValue'] as num?)?.toDouble() ?? 0.0,
      baselineValue: (map['baselineValue'] as num?)?.toDouble() ?? 0.0,
      deviation: (map['deviation'] as num?)?.toDouble() ?? 0.0,
      severity: AlertSeverity.values.firstWhere(
        (e) => e.name == map['severity'],
        orElse: () => AlertSeverity.warning,
      ),
      explanation: map['explanation'] ?? '',
      recommendedAction: map['recommendedAction'] ?? '',
      timestamp: map['timestamp'] != null
          ? DateTime.parse(map['timestamp'])
          : DateTime.now(),
      isAcknowledged: map['isAcknowledged'] == 1 || map['isAcknowledged'] == true,
      isCaregiverEscalated: map['isCaregiverEscalated'] == 1 || map['isCaregiverEscalated'] == true,
      provenance: map['provenance'] != null
          ? (map['provenance'] is Map
              ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
              : Provenance.systemDetected())
          : Provenance.systemDetected(),
      whatChanged: map['whatChanged'],
      whyItMatters: map['whyItMatters'],
      dataCausedFlag: map['dataCausedFlag'],
      persistedDuration: map['persistedDuration'],
      escalationLevel: ClinicalEscalationLevel.values.firstWhere(
        (e) => e.name == map['escalationLevel'],
        orElse: () => ClinicalEscalationLevel.monitor,
      ),
    );
  }
}
