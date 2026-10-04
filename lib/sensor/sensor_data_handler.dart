import 'dart:async';
import 'package:sensors_plus/sensors_plus.dart';

class SensorDataHandler {
  static final SensorDataHandler _instance = SensorDataHandler._internal();
  factory SensorDataHandler() => _instance;
  SensorDataHandler._internal();

  StreamController<dynamic>? _accelController;
  StreamController<dynamic>? _gyroController;
  StreamController<double>? _hrController;

  StreamSubscription<AccelerometerEvent>? _accelSub;
  StreamSubscription<GyroscopeEvent>? _gyroSub;
  Timer? _mockHeartRateTimer;

  StreamController<dynamic> get accelerometerStreamController => _accelController ??= StreamController<dynamic>.broadcast();
  StreamController<dynamic> get gyroscopeStreamController => _gyroController ??= StreamController<dynamic>.broadcast();
  StreamController<double> get heartRateStreamController => _hrController ??= StreamController<double>.broadcast();

  Stream<dynamic> getAccelerometerStream() => accelerometerStreamController.stream;
  Stream<dynamic> getGyroscopeStream() => gyroscopeStreamController.stream;
  Stream<double> getHeartRateStream() => heartRateStreamController.stream;

  void startSensorListening() {
    stopSensorListening();

    _accelController = StreamController<dynamic>.broadcast();
    _gyroController = StreamController<dynamic>.broadcast();
    _hrController = StreamController<double>.broadcast();

    try {
      _accelSub = accelerometerEventStream().listen((AccelerometerEvent event) {
        if (_accelController != null && !_accelController!.isClosed) {
          _accelController!.add(event);
        }
      });

      _gyroSub = gyroscopeEventStream().listen((GyroscopeEvent event) {
        if (_gyroController != null && !_gyroController!.isClosed) {
          _gyroController!.add(event);
        }
      });
    } catch (_) {}

    _mockHeartRateTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (_hrController != null && !_hrController!.isClosed) {
        final simulatedHeartRate = 72.0 + (timer.tick % 5);
        _hrController!.add(simulatedHeartRate);
      }
    });
  }

  void stopSensorListening() {
    _accelSub?.cancel();
    _accelSub = null;
    _gyroSub?.cancel();
    _gyroSub = null;
    _mockHeartRateTimer?.cancel();
    _mockHeartRateTimer = null;

    if (_accelController != null && !_accelController!.isClosed) {
      _accelController!.close();
      _accelController = null;
    }
    if (_gyroController != null && !_gyroController!.isClosed) {
      _gyroController!.close();
      _gyroController = null;
    }
    if (_hrController != null && !_hrController!.isClosed) {
      _hrController!.close();
      _hrController = null;
    }
  }

  void dispose() {
    stopSensorListening();
  }
}
