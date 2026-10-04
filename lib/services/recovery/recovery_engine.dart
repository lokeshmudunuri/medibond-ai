import 'dart:async';
import 'package:uuid/uuid.dart';
import '../../core/database/health_database.dart';
import '../../core/events/health_event_bus.dart';
import '../../core/security/sanitized_logger.dart';
import '../../models/alert_entity.dart';
import '../../models/check_in.dart';
import '../../models/personal_baseline.dart';
import '../../models/provenance.dart';
import '../../models/sensor_observation.dart';
import '../health_memory/health_memory_service.dart';
import 'baseline_calculator.dart';

enum RecoveryIndexStatus {
  onTrack,
  moderateDeviation,
  attentionRequired,
}

class RecoveryHealthStatus {
  final double recoveryScore; // 0 to 100
  final RecoveryIndexStatus status;
  final String headline;
  final String explanation;
  final String trendDescription;
  final int activeAlertCount;

  RecoveryHealthStatus({
    required this.recoveryScore,
    required this.status,
    required this.headline,
    required this.explanation,
    required this.trendDescription,
    required this.activeAlertCount,
  });
}

class RecoveryEngine {
  static const String _tag = 'RecoveryEngine';
  static final RecoveryEngine _instance = RecoveryEngine._internal();
  factory RecoveryEngine() => _instance;
  RecoveryEngine._internal();

  static const _uuid = Uuid();
  final HealthMemoryService _memory = HealthMemoryService();

  final StreamController<AlertEntity> _alertStreamController = StreamController<AlertEntity>.broadcast();
  Stream<AlertEntity> get alertStream => _alertStreamController.stream;

  Future<void> processObservation({
    required String metricName,
    required double observedValue,
    double? rawX,
    double? rawY,
    double? rawZ,
    String unit = '',
  }) async {
    // 1. Store observation in health memory
    final obs = SensorObservationEntity(
      id: _uuid.v4(),
      timestamp: DateTime.now(),
      sensorType: metricName,
      value: observedValue,
      rawX: rawX,
      rawY: rawY,
      rawZ: rawZ,
      unit: unit,
      provenance: Provenance.systemDetected(),
    );
    await HealthDatabase().logSensorObservation(obs);

    await _memory.saveBaseline(
      (await _memory.getBaseline(metricName)) ??
          PersonalBaselineEntity(
            id: _uuid.v4(),
            metricName: metricName,
            baselineMean: observedValue,
            stdDevOrMAD: observedValue * 0.1 > 0.1 ? observedValue * 0.1 : 1.0,
            lastUpdated: DateTime.now(),
            provenance: Provenance.systemDetected(),
          ),
    );

    // 2. Fetch baseline
    final currentBaseline = await _memory.getBaseline(metricName);
    if (currentBaseline == null) return;

    // 3. Calculate EWMA + CUSUM persistence
    final result = BaselineCalculator.updateBaselineWithNewSample(
      existingBaseline: currentBaseline,
      newSampleValue: observedValue,
    );

    // Save updated baseline
    await _memory.saveBaseline(result.updatedBaseline);

    // 4. Trigger alert only if persistent or extreme deviation
    if (result.isPersistentDeviation || result.currentZScore.abs() > 3.0) {
      final diff = observedValue - result.updatedBaseline.baselineMean;
      final percentShift = (diff / (result.updatedBaseline.baselineMean > 0.001 ? result.updatedBaseline.baselineMean : 1.0) * 100).abs();

      final severity = result.currentZScore.abs() > 4.0
          ? AlertSeverity.critical
          : AlertSeverity.warning;

      final whatChanged = _buildWhatChangedText(metricName, observedValue, result.updatedBaseline.baselineMean, percentShift, result.deviationDirection);
      final whyItMatters = _buildWhyItMattersText(metricName, result.deviationDirection);
      final dataCausedFlag = 'Observed $metricName of ${observedValue.toStringAsFixed(2)} vs personal baseline ${result.updatedBaseline.baselineMean.toStringAsFixed(2)} (Z-score: ${result.currentZScore.toStringAsFixed(1)}).';
      final persistedDuration = result.isPersistentDeviation
          ? 'Persisted across multiple consecutive sensor sampling windows.'
          : 'Detected in the most recent sensor observation window.';

      ClinicalEscalationLevel escalationLevel;
      if (result.currentZScore.abs() > 4.0 || severity == AlertSeverity.critical) {
        escalationLevel = ClinicalEscalationLevel.contactDoctor;
      } else {
        escalationLevel = ClinicalEscalationLevel.monitor;
      }

      final explanation = 'WHAT CHANGED: $whatChanged\nWHY IT MATTERS: $whyItMatters\nDATA CAUSING FLAG: $dataCausedFlag\nHOW LONG PERSISTED: $persistedDuration\nNEXT STEP: [${escalationLevel.displayName}] ${_getRecommendedAction(metricName, result.deviationDirection)}';

      final alert = AlertEntity(
        id: _uuid.v4(),
        title: 'Recovery Deviation: ${metricName.replaceAll("_", " ").toUpperCase()}',
        metricOrSource: metricName,
        observedValue: observedValue,
        baselineValue: result.updatedBaseline.baselineMean,
        deviation: diff,
        severity: severity,
        explanation: explanation,
        recommendedAction: _getRecommendedAction(metricName, result.deviationDirection),
        timestamp: DateTime.now(),
        isCaregiverEscalated: severity == AlertSeverity.critical,
        provenance: Provenance.systemDetected(),
        whatChanged: whatChanged,
        whyItMatters: whyItMatters,
        dataCausedFlag: dataCausedFlag,
        persistedDuration: persistedDuration,
        escalationLevel: escalationLevel,
      );

      await _memory.logAlert(alert);
      if (!_alertStreamController.isClosed) {
        _alertStreamController.add(alert);
      }
      HealthEventBus().emit(HealthEventType.alertGenerated, alert);
      SanitizedLogger.warning(_tag, 'Recovery deviation alert generated for $metricName: ${alert.title}');
    }
  }

  /// Calculates dynamic, explainable Recovery Index from actual stored check-ins, baselines, and alerts
  Future<RecoveryHealthStatus> calculateDynamicRecoveryIndex() async {
    final checkIns = await _memory.getRecentCheckIns(limit: 14);
    final alerts = await _memory.getRecentAlerts(limit: 20);
    final recentAlerts = alerts.where((a) => !a.isAcknowledged).toList();

    if (checkIns.isEmpty) {
      return RecoveryHealthStatus(
        recoveryScore: 92.0,
        status: RecoveryIndexStatus.onTrack,
        headline: 'Recovery Protocol Active',
        explanation: 'Initial recovery baseline active. Complete daily check-ins to track recovery progression.',
        trendDescription: 'Baseline monitoring initialized.',
        activeAlertCount: recentAlerts.length,
      );
    }

    final latest = checkIns.first;

    // Component calculations
    double painPenalty = (latest.painScore / 10.0) * 35.0; // max -35 for pain 10
    double fatiguePenalty = (latest.fatigueScore / 10.0) * 20.0; // max -20 for fatigue 10
    double sleepScore = 0.0;
    if (latest.sleepHours >= 7.0) {
      sleepScore = 20.0;
    } else if (latest.sleepHours >= 5.5) {
      sleepScore = 12.0;
    } else {
      sleepScore = 4.0;
    }
    double medScore = latest.tookAllMedications ? 25.0 : 10.0;
    double alertPenalty = (recentAlerts.length * 8.0).clamp(0.0, 24.0);

    double score = (100.0 - painPenalty - fatiguePenalty + (sleepScore - 20.0) - alertPenalty + (medScore - 25.0)).clamp(15.0, 98.0);

    // Trend & Comparative explanation
    String headline;
    RecoveryIndexStatus status;
    String explanation;
    String trend;

    if (score >= 78.0 && recentAlerts.isEmpty) {
      status = RecoveryIndexStatus.onTrack;
      headline = 'Recovery On Track';
      explanation = 'Pain is well-controlled (${latest.painScore}/10) with restorative sleep (${latest.sleepHours} hrs) and full medication adherence.';
      trend = 'Consistent with expected post-operative recovery trajectory.';
    } else if (score >= 55.0 || recentAlerts.length == 1) {
      status = RecoveryIndexStatus.moderateDeviation;
      headline = 'Moderate Recovery Shift';
      explanation = 'Noted pain at ${latest.painScore}/10 and ${latest.sleepHours} hrs sleep with ${recentAlerts.length} active sensor alert(s).';
      trend = 'Slight dip compared to your personal recovery baseline.';
    } else {
      status = RecoveryIndexStatus.attentionRequired;
      headline = 'Clinical Attention Advised';
      explanation = 'Elevated discomfort (${latest.painScore}/10), curtailed sleep (${latest.sleepHours} hrs), and active deviations detected.';
      trend = 'Significant shift below baseline. Consider contacting your care team.';
    }

    if (checkIns.length > 1) {
      final prev = checkIns[1];
      if (latest.painScore > prev.painScore) {
        explanation += ' Pain increased from yesterday\'s ${prev.painScore}/10.';
      } else if (latest.painScore < prev.painScore) {
        explanation += ' Pain improved from ${prev.painScore}/10.';
      }
    }

    return RecoveryHealthStatus(
      recoveryScore: score,
      status: status,
      headline: headline,
      explanation: explanation,
      trendDescription: trend,
      activeAlertCount: recentAlerts.length,
    );
  }

  String _buildWhatChangedText(String metric, double observed, double baseline, double percentShift, String direction) {
    switch (metric) {
      case 'mobility_intensity':
      case 'accelerometer':
        return 'Movement intensity is ${percentShift.toStringAsFixed(0)}% $direction your personal recovery baseline (${baseline.toStringAsFixed(2)} m/s²).';
      case 'resting_heart_rate':
        return 'Resting heart rate is ${observed.toStringAsFixed(0)} BPM (${percentShift.toStringAsFixed(0)}% $direction baseline of ${baseline.toStringAsFixed(0)} BPM).';
      default:
        return '$metric shifted by ${percentShift.toStringAsFixed(0)}% $direction baseline (${baseline.toStringAsFixed(2)}).';
    }
  }

  String _buildWhyItMattersText(String metric, String direction) {
    if (metric.contains('mobility') || metric.contains('accelerometer')) {
      return direction == 'below'
          ? 'Gradual mobility promotes circulation, intestinal motility, and prevents post-operative venous stasis.'
          : 'High sudden exertion during early post-operative recovery may strain surgical incisions.';
    }
    if (metric.contains('heart_rate')) {
      return 'Persistent tachycardia or elevated resting heart rate can indicate pain, dehydration, or systemic stress.';
    }
    return 'Tracking recovery baseline trends helps distinguish expected day-to-day fluctuations from clinically significant deviations.';
  }

  String _getRecommendedAction(String metric, String direction) {
    if (metric.contains('mobility') || metric.contains('accelerometer')) {
      if (direction == 'below') {
        return 'Perform 5-10 minutes of gentle room ambulation as advised in your recovery plan, if pain permits.';
      } else {
        return 'Avoid overexertion. Rest in a comfortable position.';
      }
    }
    if (metric.contains('heart_rate')) {
      return 'Rest quietly for 10 minutes and recheck. If palpitations or dizziness persist, alert your caregiver or physician.';
    }
    return 'Review recovery instructions and continue daily observation.';
  }

  String generateAdaptiveFollowUpQuestion(
    List<DailyCheckInEntity> pastCheckIns, {
    int? currentPain,
    double? currentSleep,
    bool? currentTookMeds,
  }) {
    // 1. React immediately to current check-in inputs if provided
    if (currentPain != null && currentPain >= 6) {
      return 'When did your pain increase to $currentPain/10, and does it feel sharp or dull around the incision?';
    }
    if (currentSleep != null && currentSleep < 6.0) {
      return 'Did anything make it difficult to sleep ($currentSleep hrs), such as surgical site soreness or cough?';
    }
    if (currentTookMeds != null && !currentTookMeds) {
      return 'Did you miss or delay any prescribed medication today? Have you resumed your regular schedule?';
    }

    // 2. React to longitudinal past check-in context
    if (pastCheckIns.isEmpty) {
      return 'How did your mobility feel during today\'s light walking routines inside the room?';
    }

    final latest = pastCheckIns.first;
    if (latest.painScore >= 5) {
      return 'Yesterday you noted pain at ${latest.painScore}/10. Has the discomfort eased with your prescribed rest?';
    }
    if (latest.sleepHours < 6.0) {
      return 'You had less than 6 hours of sleep yesterday. Were you able to get restorative rest last night?';
    }
    if (!latest.tookAllMedications) {
      return 'You noted missing a medication dose yesterday. Have you resumed your regular scheduled timing today?';
    }

    return 'Are you experiencing any new swelling, incision tenderness, or unexpected fatigue today?';
  }
}
