import 'dart:async';
import 'package:uuid/uuid.dart';

class AlertSystem {
  static final AlertSystem _instance = AlertSystem._internal();
  factory AlertSystem() => _instance;
  AlertSystem._internal();

  static const _uuid = Uuid();
  final List<Alert> _alerts = [];
  final StreamController<Alert> _alertStreamController = StreamController<Alert>.broadcast();

  Stream<Alert> get alertStream => _alertStreamController.stream;
  static const double defaultAlertThreshold = 0.5;

  Alert generateAlert(String sensorType, double deviation, double baseline) {
    final alertId = _uuid.v4();
    final timestamp = DateTime.now();

    String severity = 'Info';
    if (deviation > defaultAlertThreshold * 2) {
      severity = 'Critical';
    } else if (deviation > defaultAlertThreshold) {
      severity = 'Warning';
    }

    final explanation = 'Sensor deviation detected in $sensorType: observed variance of ${deviation.toStringAsFixed(2)} against baseline ${baseline.toStringAsFixed(2)}.';

    final alert = Alert(
      id: alertId,
      sensorType: sensorType,
      deviation: deviation,
      baseline: baseline,
      severity: severity,
      timestamp: timestamp,
      explanation: explanation,
    );

    _alerts.add(alert);
    if (!_alertStreamController.isClosed) {
      _alertStreamController.add(alert);
    }

    return alert;
  }

  List<Alert> getRecentAlerts([int limit = 10]) {
    if (_alerts.isEmpty) return [];
    final start = _alerts.length > limit ? _alerts.length - limit : 0;
    return _alerts.sublist(start);
  }

  void clearAlerts() {
    _alerts.clear();
  }

  void dispose() {
    _alertStreamController.close();
  }
}

class Alert {
  final String id;
  final String sensorType;
  final double deviation;
  final double baseline;
  final String severity;
  final DateTime timestamp;
  final String explanation;

  Alert({
    required this.id,
    required this.sensorType,
    required this.deviation,
    required this.baseline,
    required this.severity,
    required this.timestamp,
    required this.explanation,
  });

  String get message => explanation;
}