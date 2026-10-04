import 'dart:async';

enum HealthEventType {
  profileModeChanged,
  languageChanged,
  dataChanged,
  checkInLogged,
  medicationUpdated,
  conditionUpdated,
  allergyUpdated,
  documentSaved,
  recoveryUpdated,
  alertGenerated,
  modelStateChanged,
}

class HealthEvent {
  final HealthEventType type;
  final dynamic payload;
  final DateTime timestamp;

  HealthEvent(this.type, {this.payload}) : timestamp = DateTime.now();
}

class HealthEventBus {
  static final HealthEventBus _instance = HealthEventBus._internal();
  factory HealthEventBus() => _instance;
  HealthEventBus._internal();

  final StreamController<HealthEvent> _eventController = StreamController<HealthEvent>.broadcast();

  Stream<HealthEvent> get stream => _eventController.stream;

  void emit(HealthEventType type, [dynamic payload]) {
    if (!_eventController.isClosed) {
      _eventController.add(HealthEvent(type, payload: payload));
    }
  }

  void notifyDataChanged() {
    emit(HealthEventType.dataChanged);
    emit(HealthEventType.checkInLogged);
    emit(HealthEventType.medicationUpdated);
    emit(HealthEventType.recoveryUpdated);
    emit(HealthEventType.documentSaved);
  }
}
