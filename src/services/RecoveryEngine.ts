import { DailyCheckInEntity, RecoveryPlanEntity } from '../types';

export interface DynamicRecoveryScore {
  overallIndex: number; // 0 to 100
  painComponent: number;
  sleepComponent: number;
  medicationAdherenceComponent: number;
  mobilityComponent: number;
  statusText: string;
  trajectory: 'improving' | 'stable' | 'concerning';
}

export class RecoveryEngine {
  /**
   * Computes multi-factor post-operative Recovery Index (0-100)
   */
  public static calculateRecoveryIndex(
    checkIns: DailyCheckInEntity[],
    plan?: RecoveryPlanEntity | null,
    recentMobilitySteps = 2400
  ): DynamicRecoveryScore {
    if (checkIns.length === 0) {
      return {
        overallIndex: 78,
        painComponent: 25,
        sleepComponent: 25,
        medicationAdherenceComponent: 15,
        mobilityComponent: 13,
        statusText: 'Baseline Recovery Trajectory',
        trajectory: 'stable',
      };
    }

    const latest = checkIns[0]; // Most recent check-in

    // 1. Pain Score Component (0-30 pts, where lower pain gives higher points)
    // Pain 0/10 -> 30 pts; Pain 10/10 -> 0 pts
    const painComponent = Math.max(0, Math.round(((10 - latest.painScore) / 10) * 30));

    // 2. Sleep Component (0-25 pts, optimal 7.5 - 9.0 hrs)
    let sleepComponent = 0;
    if (latest.sleepHours >= 7.0 && latest.sleepHours <= 9.5) {
      sleepComponent = 25;
    } else if (latest.sleepHours >= 5.5) {
      sleepComponent = 18;
    } else {
      sleepComponent = 10;
    }

    // 3. Medication Adherence Component (0-20 pts)
    const medicationAdherenceComponent = latest.tookAllMedications ? 20 : 5;

    // 4. Mobility / Physical Activity Component (0-25 pts)
    const targetSteps = plan?.targetDailySteps || 2500;
    const mobilityRatio = Math.min(1.0, recentMobilitySteps / targetSteps);
    const mobilityComponent = Math.round(mobilityRatio * 25);

    const overallIndex = Math.min(100, Math.max(0, painComponent + sleepComponent + medicationAdherenceComponent + mobilityComponent));

    // Determine Trajectory
    let trajectory: 'improving' | 'stable' | 'concerning' = 'stable';
    if (checkIns.length >= 2) {
      const prev = checkIns[1];
      if (latest.painScore < prev.painScore && latest.sleepHours >= prev.sleepHours) {
        trajectory = 'improving';
      } else if (latest.painScore > prev.painScore + 2 || latest.sleepHours < 4.0) {
        trajectory = 'concerning';
      }
    }

    let statusText = 'Normal Recovery';
    if (overallIndex >= 85) {
      statusText = 'Optimal Post-Op Recovery';
    } else if (overallIndex >= 65) {
      statusText = 'Satisfactory Progress';
    } else {
      statusText = 'Recovery Attention Recommended';
    }

    return {
      overallIndex,
      painComponent,
      sleepComponent,
      medicationAdherenceComponent,
      mobilityComponent,
      statusText,
      trajectory,
    };
  }
}
