import 'dart:async';
import 'package:flutter/material.dart';
import '../core/config/app_theme.dart';
import '../sensor/alert_system.dart';
import '../services/sensors/sensor_service.dart';

class SensorMonitoringPanel extends StatefulWidget {
  const SensorMonitoringPanel({super.key});

  @override
  State<SensorMonitoringPanel> createState() => _SensorMonitoringPanelState();
}

class _SensorMonitoringPanelState extends State<SensorMonitoringPanel> {
  final SensorService _sensorService = SensorService();
  final AlertSystem _alertSystem = AlertSystem();

  StreamSubscription<SensorDataSnapshot>? _sensorSub;
  StreamSubscription<Alert>? _alertSub;

  double accelerometerX = 0.0;
  double accelerometerY = 0.0;
  double accelerometerZ = 9.8;
  double gyroscopeX = 0.0;
  double gyroscopeY = 0.0;
  double gyroscopeZ = 0.0;
  double heartRate = 72.0;

  bool hasAlert = false;
  String alertMessage = '';

  @override
  void initState() {
    super.initState();
    _startMonitoring();
  }

  void _startMonitoring() {
    _sensorService.startListening();

    _sensorSub = _sensorService.snapshotStream.listen((snapshot) {
      if (mounted) {
        setState(() {
          accelerometerX = snapshot.accelX;
          accelerometerY = snapshot.accelY;
          accelerometerZ = snapshot.accelZ;
          gyroscopeX = snapshot.gyroX;
          gyroscopeY = snapshot.gyroY;
          gyroscopeZ = snapshot.gyroZ;
          heartRate = snapshot.heartRateBpm;
        });
      }
    });

    _alertSub = _alertSystem.alertStream.listen((alert) {
      if (mounted) {
        setState(() {
          hasAlert = true;
          alertMessage = alert.message;
        });
      }
    });
  }

  @override
  void dispose() {
    _sensorSub?.cancel();
    _alertSub?.cancel();
    _sensorService.stopListening();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.monitor_heart, color: AppTheme.primaryTeal, size: 20),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Live Sensor Telemetry',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
              ],
            ),
            const SizedBox(height: 14),

            Container(
              decoration: BoxDecoration(
                color: AppTheme.surfaceWarm,
                borderRadius: BorderRadius.circular(10),
              ),
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Accelerometer (m/s²):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      Text('X: ${accelerometerX.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11)),
                      Text('Y: ${accelerometerY.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11)),
                      Text('Z: ${accelerometerZ.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Text('Gyroscope (rad/s):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      Text('X: ${gyroscopeX.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11)),
                      Text('Y: ${gyroscopeY.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11)),
                      Text('Z: ${gyroscopeZ.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.favorite, color: Colors.red, size: 16),
                      const SizedBox(width: 6),
                      Text('Heart Rate: ${heartRate.toStringAsFixed(0)} BPM', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),

            if (hasAlert) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.severityWarningBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.severityWarning),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber, color: AppTheme.severityWarning, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(alertMessage, style: const TextStyle(fontSize: 11, color: AppTheme.textPrimary)),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}