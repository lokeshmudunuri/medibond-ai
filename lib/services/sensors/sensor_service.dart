import 'dart:async';
import 'dart:math';
import 'package:sensors_plus/sensors_plus.dart';
import '../../core/security/sanitized_logger.dart';
import '../recovery/recovery_engine.dart';

class SensorDataSnapshot {
  final double accelX;
  final double accelY;
  final double accelZ;
  final double accelMagnitude;
  final double gyroX;
  final double gyroY;
  final double gyroZ;
  final double heartRateBpm;
  final DateTime timestamp;

  SensorDataSnapshot({
    required this.accelX,
    required this.accelY,
    required this.accelZ,
    required this.accelMagnitude,
    required this.gyroX,
    required this.gyroY,
    required this.gyroZ,
    required this.heartRateBpm,
    required this.timestamp,
  });
}

class SensorService {
  static const String _tag = 'SensorService';
  static final SensorService _instance = SensorService._internal();
  factory SensorService() => _instance;
  SensorService._internal();

  static bool disableTimerForTesting = false;

  final RecoveryEngine _recoveryEngine = RecoveryEngine();

  final StreamController<SensorDataSnapshot> _snapshotController =
      StreamController<SensorDataSnapshot>.broadcast();
  Stream<SensorDataSnapshot> get snapshotStream => _snapshotController.stream;

  StreamSubscription<AccelerometerEvent>? _accelSub;
  StreamSubscription<GyroscopeEvent>? _gyroSub;
  Timer? _samplingTimer;

  double _lastAccelX = 0.0;
  double _lastAccelY = 0.0;
  double _lastAccelZ = 9.8;
  double _lastGyroX = 0.0;
  double _lastGyroY = 0.0;
  double _lastGyroZ = 0.0;
  double _simulatedHeartRate = 72.0;
  bool _isRunning = false;

  bool get isRunning => _isRunning;

  void startListening() {
    if (_isRunning || disableTimerForTesting) return;
    _isRunning = true;
    SanitizedLogger.info(_tag, 'Starting sensor continuous sampling pipeline...');

    try {
      _accelSub = accelerometerEventStream().listen(
        (event) {
          _lastAccelX = event.x;
          _lastAccelY = event.y;
          _lastAccelZ = event.z;
        },
        onError: (e) {
          SanitizedLogger.warning(_tag, 'Accelerometer sensor stream error: $e');
        },
      );

      _gyroSub = gyroscopeEventStream().listen(
        (event) {
          _lastGyroX = event.x;
          _lastGyroY = event.y;
          _lastGyroZ = event.z;
        },
        onError: (e) {
          SanitizedLogger.warning(_tag, 'Gyroscope sensor stream error: $e');
        },
      );
    } catch (e) {
      SanitizedLogger.warning(_tag, 'Sensors unavailable on current platform, using simulated baseline signals: $e');
    }

    // Periodic sampling timer (emits snapshot every 1.5 seconds)
    if (!disableTimerForTesting) {
      _samplingTimer = Timer.periodic(const Duration(milliseconds: 1500), (timer) {
      // If hardware sensors return 0 (e.g. on emulator/desktop), generate realistic gentle recovery signals
      if (_lastAccelX == 0 && _lastAccelY == 0 && _lastAccelZ == 9.8) {
        final tick = timer.tick;
        _lastAccelX = sin(tick * 0.2) * 0.3;
        _lastAccelY = cos(tick * 0.2) * 0.4;
        _lastAccelZ = 9.8 + sin(tick * 0.1) * 0.2;
        _lastGyroX = cos(tick * 0.3) * 0.05;
        _lastGyroY = sin(tick * 0.3) * 0.05;
        _lastGyroZ = 0.01;
      }

      final magnitude = sqrt((_lastAccelX * _lastAccelX) + (_lastAccelY * _lastAccelY) + (_lastAccelZ * _lastAccelZ));
      final dynamicMovement = (magnitude - 9.8).abs();

      // Fluctuate heart rate gently around baseline
      _simulatedHeartRate = 72.0 + (sin(timer.tick * 0.15) * 4.0);

      final snapshot = SensorDataSnapshot(
        accelX: _lastAccelX,
        accelY: _lastAccelY,
        accelZ: _lastAccelZ,
        accelMagnitude: dynamicMovement,
        gyroX: _lastGyroX,
        gyroY: _lastGyroY,
        gyroZ: _lastGyroZ,
        heartRateBpm: _simulatedHeartRate,
        timestamp: DateTime.now(),
      );

      if (!_snapshotController.isClosed) {
        _snapshotController.add(snapshot);
      }

      // Feed observations to recovery engine for baseline EWMA/CUSUM tracking
      _recoveryEngine.processObservation(
        metricName: 'mobility_intensity',
        observedValue: dynamicMovement,
        rawX: _lastAccelX,
        rawY: _lastAccelY,
        rawZ: _lastAccelZ,
        unit: 'm/s^2',
      );
    });
    }
  }

  void stopListening() {
    _isRunning = false;
    _accelSub?.cancel();
    _accelSub = null;
    _gyroSub?.cancel();
    _gyroSub = null;
    _samplingTimer?.cancel();
    _samplingTimer = null;
    SanitizedLogger.info(_tag, 'Stopped sensor listening.');
  }

  void dispose() {
    stopListening();
    _snapshotController.close();
  }
}
