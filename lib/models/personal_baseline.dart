import 'provenance.dart';

class PersonalBaselineEntity {
  final String id;
  final String metricName;
  final double baselineMean;
  final double stdDevOrMAD;
  final double cusumHigh;
  final double cusumLow;
  final int sampleCount;
  final DateTime lastUpdated;
  final Provenance provenance;

  PersonalBaselineEntity({
    required this.id,
    required this.metricName,
    required this.baselineMean,
    required this.stdDevOrMAD,
    this.cusumHigh = 0.0,
    this.cusumLow = 0.0,
    this.sampleCount = 1,
    required this.lastUpdated,
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'metricName': metricName,
      'baselineMean': baselineMean,
      'stdDevOrMAD': stdDevOrMAD,
      'cusumHigh': cusumHigh,
      'cusumLow': cusumLow,
      'sampleCount': sampleCount,
      'lastUpdated': lastUpdated.toIso8601String(),
      'provenance': provenance.toMap(),
    };
  }

  factory PersonalBaselineEntity.fromMap(Map<String, dynamic> map) {
    return PersonalBaselineEntity(
      id: map['id'] ?? '',
      metricName: map['metricName'] ?? '',
      baselineMean: (map['baselineMean'] as num?)?.toDouble() ?? 0.0,
      stdDevOrMAD: (map['stdDevOrMAD'] as num?)?.toDouble() ?? 1.0,
      cusumHigh: (map['cusumHigh'] as num?)?.toDouble() ?? 0.0,
      cusumLow: (map['cusumLow'] as num?)?.toDouble() ?? 0.0,
      sampleCount: map['sampleCount'] ?? 1,
      lastUpdated: map['lastUpdated'] != null
          ? DateTime.parse(map['lastUpdated'])
          : DateTime.now(),
      provenance: map['provenance'] != null
          ? (map['provenance'] is Map
              ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
              : Provenance.systemDetected())
          : Provenance.systemDetected(),
    );
  }
}
