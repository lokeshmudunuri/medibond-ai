import 'provenance.dart';

class SensorObservationEntity {
  final String id;
  final DateTime timestamp;
  final String sensorType; // accelerometer, gyroscope, heart_rate, step_count, mobility_intensity
  final double value; // Primary normalized value or magnitude
  final double? rawX;
  final double? rawY;
  final double? rawZ;
  final String unit; // m/s^2, rad/s, BPM, steps/hr, %
  final Provenance provenance;

  SensorObservationEntity({
    required this.id,
    required this.timestamp,
    required this.sensorType,
    required this.value,
    this.rawX,
    this.rawY,
    this.rawZ,
    this.unit = '',
    required this.provenance,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'timestamp': timestamp.toIso8601String(),
      'sensorType': sensorType,
      'value': value,
      'rawX': rawX,
      'rawY': rawY,
      'rawZ': rawZ,
      'unit': unit,
      'provenance': provenance.toMap(),
    };
  }

  factory SensorObservationEntity.fromMap(Map<String, dynamic> map) {
    return SensorObservationEntity(
      id: map['id'] ?? '',
      timestamp: map['timestamp'] != null
          ? DateTime.parse(map['timestamp'])
          : DateTime.now(),
      sensorType: map['sensorType'] ?? '',
      value: (map['value'] as num?)?.toDouble() ?? 0.0,
      rawX: (map['rawX'] as num?)?.toDouble(),
      rawY: (map['rawY'] as num?)?.toDouble(),
      rawZ: (map['rawZ'] as num?)?.toDouble(),
      unit: map['unit'] ?? '',
      provenance: map['provenance'] != null
          ? Provenance.fromMap(Map<String, dynamic>.from(map['provenance']))
          : Provenance.userReported(),
    );
  }
}
