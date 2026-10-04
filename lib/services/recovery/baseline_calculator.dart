import 'dart:math';
import '../../models/personal_baseline.dart';
import '../../models/provenance.dart';

class BaselineUpdateResult {
  final PersonalBaselineEntity updatedBaseline;
  final double currentZScore;
  final bool isPersistentDeviation;
  final String deviationDirection; // 'above', 'below', 'normal'

  BaselineUpdateResult({
    required this.updatedBaseline,
    required this.currentZScore,
    required this.isPersistentDeviation,
    required this.deviationDirection,
  });
}

class BaselineCalculator {
  static const double _alpha = 0.15; // EWMA smoothing factor
  static const double _kSlack = 0.5; // CUSUM slack parameter (half a std dev)
  static const double _cusumThresholdH = 4.0; // CUSUM decision boundary for persistence

  static BaselineUpdateResult updateBaselineWithNewSample({
    required PersonalBaselineEntity existingBaseline,
    required double newSampleValue,
  }) {
    // 1. EWMA update for baseline mean
    final oldMean = existingBaseline.baselineMean;
    final newMean = (1 - _alpha) * oldMean + (_alpha * newSampleValue);

    // 2. Welford's / EWMA update for robust MAD / StdDev approximation
    final currentDiff = (newSampleValue - oldMean).abs();
    final oldSpread = existingBaseline.stdDevOrMAD > 0.001 ? existingBaseline.stdDevOrMAD : 1.0;
    final newSpread = (1 - _alpha) * oldSpread + (_alpha * currentDiff * 1.253);

    // 3. Compute robust Z-score
    final zScore = (newSampleValue - newMean) / (newSpread > 0.001 ? newSpread : 1.0);

    // 4. Update CUSUM statistics for persistent shift detection
    final standardizedDiff = (newSampleValue - oldMean) / oldSpread;
    final newCusumHigh = max(0.0, existingBaseline.cusumHigh + standardizedDiff - _kSlack);
    final newCusumLow = max(0.0, existingBaseline.cusumLow - standardizedDiff - _kSlack);

    // 5. Evaluate persistence
    bool isPersistent = false;
    String direction = 'normal';

    if (newCusumHigh > _cusumThresholdH) {
      isPersistent = true;
      direction = 'above';
    } else if (newCusumLow > _cusumThresholdH) {
      isPersistent = true;
      direction = 'below';
    } else if (zScore.abs() > 2.5) {
      direction = zScore > 0 ? 'above' : 'below';
    }

    final updatedEntity = PersonalBaselineEntity(
      id: existingBaseline.id,
      metricName: existingBaseline.metricName,
      baselineMean: newMean,
      stdDevOrMAD: newSpread,
      cusumHigh: newCusumHigh,
      cusumLow: newCusumLow,
      sampleCount: existingBaseline.sampleCount + 1,
      lastUpdated: DateTime.now(),
      provenance: Provenance.systemDetected(),
    );

    return BaselineUpdateResult(
      updatedBaseline: updatedEntity,
      currentZScore: zScore,
      isPersistentDeviation: isPersistent,
      deviationDirection: direction,
    );
  }
}
