export interface EWMAState {
  mean: number;
  variance: number;
  alpha: number;
}

export interface CUSUMState {
  high: number;
  low: number;
  target: number;
  threshold: number;
  slack: number;
}

export class BaselineCalculator {
  /**
   * Update Exponentially Weighted Moving Average (EWMA)
   */
  public static updateEWMA(currentValue: number, previousMean: number, alpha = 0.2): number {
    return alpha * currentValue + (1 - alpha) * previousMean;
  }

  /**
   * Calculate Median Absolute Deviation (MAD) for robust outlier detection
   */
  public static calculateMAD(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    const absoluteDeviations = values.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    return absoluteDeviations[Math.floor(absoluteDeviations.length / 2)] || 0.001;
  }

  /**
   * Calculate CUSUM (Cumulative Sum Control Chart) for drift detection
   */
  public static updateCUSUM(
    currentValue: number,
    state: CUSUMState
  ): { high: number; low: number; isAlarmHigh: boolean; isAlarmLow: boolean } {
    const diff = currentValue - state.target;
    const high = Math.max(0, state.high + diff - state.slack);
    const low = Math.max(0, state.low - diff - state.slack);

    return {
      high,
      low,
      isAlarmHigh: high > state.threshold,
      isAlarmLow: low > state.threshold,
    };
  }

  /**
   * Calculate Z-Score against personal baseline
   */
  public static calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev <= 0) return 0;
    return (value - mean) / stdDev;
  }
}
