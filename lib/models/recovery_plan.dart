import 'provenance.dart';

class RecoveryMilestone {
  final int dayNumber;
  final String title;
  final String description;
  final bool isCompleted;

  RecoveryMilestone({
    required this.dayNumber,
    required this.title,
    required this.description,
    this.isCompleted = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'dayNumber': dayNumber,
      'title': title,
      'description': description,
      'isCompleted': isCompleted,
    };
  }

  factory RecoveryMilestone.fromMap(Map<String, dynamic> map) {
    return RecoveryMilestone(
      dayNumber: map['dayNumber'] ?? 1,
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      isCompleted: map['isCompleted'] ?? false,
    );
  }
}

class RecoveryPlanEntity {
  final String id;
  final String title; // e.g. Post-Appendectomy 14-Day Recovery Protocol
  final String procedureName;
  final DateTime startDate;
  final int targetDurationDays;
  final String currentPhase; // Phase 1 (Days 1-3: Rest), Phase 2 (Days 4-7: Light Mobility), etc.
  final List<RecoveryMilestone> milestones;
  final double targetDailySteps;
  final double targetRestHours;
  final bool isActive;
  final Provenance provenance;

  RecoveryPlanEntity({
    required this.id,
    required this.title,
    required this.procedureName,
    required this.startDate,
    this.targetDurationDays = 14,
    this.currentPhase = 'Phase 1: Acute Recovery',
    this.milestones = const [],
    this.targetDailySteps = 3000,
    this.targetRestHours = 8.0,
    this.isActive = true,
    required this.provenance,
  });

  int get currentDayNumber {
    final diff = DateTime.now().difference(startDate).inDays + 1;
    return diff < 1 ? 1 : diff;
  }

  double get progressPercentage {
    if (targetDurationDays <= 0) return 1.0;
    final progress = currentDayNumber / targetDurationDays;
    return progress.clamp(0.0, 1.0);
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'procedureName': procedureName,
      'startDate': startDate.toIso8601String(),
      'targetDurationDays': targetDurationDays,
      'currentPhase': currentPhase,
      'milestones': milestones.map((m) => m.toMap()).toList(),
      'targetDailySteps': targetDailySteps,
      'targetRestHours': targetRestHours,
      'isActive': isActive ? 1 : 0,
      'provenance': provenance.toMap(),
    };
  }

  factory RecoveryPlanEntity.fromMap(Map<String, dynamic> map) {
    return RecoveryPlanEntity(
      id: map['id'] ?? '',
      title: map['title'] ?? '',
      procedureName: map['procedureName'] ?? '',
      startDate: map['startDate'] != null
          ? DateTime.parse(map['startDate'])
          : DateTime.now(),
      targetDurationDays: map['targetDurationDays'] ?? 14,
      currentPhase: map['currentPhase'] ?? 'Phase 1: Acute Recovery',
      milestones: (map['milestones'] as List<dynamic>?)
              ?.map((item) => RecoveryMilestone.fromMap(Map<String, dynamic>.from(item)))
              .toList() ??
          [],
      targetDailySteps: (map['targetDailySteps'] as num?)?.toDouble() ?? 3000.0,
      targetRestHours: (map['targetRestHours'] as num?)?.toDouble() ?? 8.0,
      isActive: map['isActive'] == 1 || map['isActive'] == true,
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
