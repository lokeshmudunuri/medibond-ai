import 'provenance.dart';

enum TimelineEventType {
  conditionDiagnosed,
  medicationStarted,
  medicationStopped,
  procedureDone,
  labReportReceived,
  doctorInstructionGiven,
  checkInLogged,
  recoveryAlertTriggered,
  doctorConsultation,
}

class TimelineEventEntity {
  final String id;
  final String title;
  final String description;
  final TimelineEventType eventType;
  final DateTime eventDate;
  final String? relatedEntityId;
  final String? relatedEntityType;
  final Provenance provenance;

  TimelineEventEntity({
    required this.id,
    required this.title,
    required this.description,
    required this.eventType,
    required this.eventDate,
    this.relatedEntityId,
    this.relatedEntityType,
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'eventType': eventType.name,
      'eventDate': eventDate.toIso8601String(),
      'relatedEntityId': relatedEntityId,
      'relatedEntityType': relatedEntityType,
      'provenance': provenance.toMap(),
    };
  }

  factory TimelineEventEntity.fromMap(Map<String, dynamic> map) {
    return TimelineEventEntity(
      id: map['id'] ?? '',
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      eventType: TimelineEventType.values.firstWhere(
        (e) => e.name == map['eventType'],
        orElse: () => TimelineEventType.checkInLogged,
      ),
      eventDate: map['eventDate'] != null
          ? DateTime.parse(map['eventDate'])
          : DateTime.now(),
      relatedEntityId: map['relatedEntityId'],
      relatedEntityType: map['relatedEntityType'],
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
