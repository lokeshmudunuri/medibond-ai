import { RecoveryEngine } from '../src/services/RecoveryEngine';
import { DailyCheckInEntity, ProvenanceSource } from '../src/types';

describe('RecoveryEngine & Baseline Scoring', () => {
  test('should compute dynamic recovery score based on pain, sleep, and adherence', () => {
    const checkIns: DailyCheckInEntity[] = [
      {
        id: 'chk_1',
        checkInDate: '2026-10-04T08:00:00.000Z',
        painScore: 2, // Low pain -> High points (24/30)
        fatigueScore: 2,
        moodScore: 4,
        sleepHours: 8.0, // Optimal sleep -> (25/25)
        tookAllMedications: true, // (20/20)
        reportedSymptoms: 'Feeling good',
        provenance: { source: ProvenanceSource.UserReported, confidence: 1.0, recordedAt: '2026-10-04' },
      },
    ];

    const score = RecoveryEngine.calculateRecoveryIndex(checkIns, null, 2500);
    expect(score.overallIndex).toBeGreaterThanOrEqual(80);
    expect(score.painComponent).toBe(24);
    expect(score.sleepComponent).toBe(25);
    expect(score.medicationAdherenceComponent).toBe(20);
    expect(score.mobilityComponent).toBe(25);
    expect(score.statusText).toContain('Optimal');
  });

  test('should detect improving trajectory when pain decreases over consecutive days', () => {
    const checkIns: DailyCheckInEntity[] = [
      {
        id: 'chk_day2',
        checkInDate: '2026-10-04T08:00:00.000Z',
        painScore: 2,
        fatigueScore: 2,
        moodScore: 4,
        sleepHours: 8.0,
        tookAllMedications: true,
        reportedSymptoms: 'Better',
        provenance: { source: ProvenanceSource.UserReported, confidence: 1.0, recordedAt: '2026-10-04' },
      },
      {
        id: 'chk_day1',
        checkInDate: '2026-10-03T08:00:00.000Z',
        painScore: 5,
        fatigueScore: 4,
        moodScore: 3,
        sleepHours: 6.0,
        tookAllMedications: true,
        reportedSymptoms: 'Soreness',
        provenance: { source: ProvenanceSource.UserReported, confidence: 1.0, recordedAt: '2026-10-03' },
      },
    ];

    const score = RecoveryEngine.calculateRecoveryIndex(checkIns);
    expect(score.trajectory).toBe('improving');
  });
});
