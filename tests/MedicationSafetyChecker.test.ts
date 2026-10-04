import { MedicationSafetyChecker, SafetyFlagSeverity } from '../src/safety/MedicationSafetyChecker';
import { AllergyEntity, MedicineEntity, ProvenanceSource } from '../src/types';

describe('MedicationSafetyChecker (Deterministic Contraindications)', () => {
  const documentedAllergies: AllergyEntity[] = [
    {
      id: 'allg_1',
      allergen: 'Penicillin / Amoxicillin',
      reaction: 'Severe angioedema and anaphylaxis',
      severity: 'Severe',
      identifiedDate: '2023-01-01',
      provenance: { source: ProvenanceSource.ClinicallyDocumented, confidence: 1.0, recordedAt: '2023-01-01' },
    },
  ];

  const currentMedicines: MedicineEntity[] = [
    {
      id: 'med_1',
      name: 'Telmisartan 40mg',
      genericName: 'Telmisartan',
      dosage: '40mg',
      frequency: 'Once daily',
      timing: 'Morning',
      instructions: 'Take with water',
      startDate: '2024-01-01',
      isActive: true,
      isConfirmedByUser: true,
      reminderTimes: ['08:00'],
      prescribedForCondition: 'Hypertension',
      prescribingDoctor: 'Dr. Raman',
      provenance: { source: ProvenanceSource.ClinicallyDocumented, confidence: 1.0, recordedAt: '2024-01-01' },
    },
  ];

  test('should flag severe penicillin contraindication when candidate is Amoxicillin', () => {
    const candidate: MedicineEntity = {
      id: 'med_cand_1',
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin Trihydrate',
      dosage: '500mg',
      frequency: 'TID',
      timing: 'After food',
      instructions: 'Take 5 days',
      startDate: '2026-10-04',
      isActive: true,
      isConfirmedByUser: false,
      reminderTimes: ['08:00'],
      prescribedForCondition: 'Infection',
      prescribingDoctor: 'Dr. Smith',
      provenance: { source: ProvenanceSource.RequiresReview, confidence: 0.9, recordedAt: '2026-10-04' },
    };

    const flags = MedicationSafetyChecker.evaluateSafety(currentMedicines, documentedAllergies, candidate);
    expect(flags.length).toBeGreaterThanOrEqual(1);
    const allergyFlag = flags.find(f => f.flagType === SafetyFlagSeverity.CriticalContraindication);
    expect(allergyFlag).toBeDefined();
    expect(allergyFlag?.title).toContain('Allergy Contraindication');
    expect(allergyFlag?.recommendation).toContain('DO NOT administer');
  });

  test('should flag duplicate therapy when candidate is same class as active Telmisartan', () => {
    const candidate: MedicineEntity = {
      id: 'med_cand_2',
      name: 'Telmisartan 20mg',
      genericName: 'Telmisartan',
      dosage: '20mg',
      frequency: 'Once daily',
      timing: 'Morning',
      instructions: 'Take daily',
      startDate: '2026-10-04',
      isActive: true,
      isConfirmedByUser: false,
      reminderTimes: ['08:00'],
      prescribedForCondition: 'Hypertension',
      prescribingDoctor: 'Dr. Smith',
      provenance: { source: ProvenanceSource.RequiresReview, confidence: 0.9, recordedAt: '2026-10-04' },
    };

    const flags = MedicationSafetyChecker.evaluateSafety(currentMedicines, documentedAllergies, candidate);
    const duplicateFlag = flags.find(f => f.flagType === SafetyFlagSeverity.DuplicateTherapy);
    expect(duplicateFlag).toBeDefined();
    expect(duplicateFlag?.title).toContain('Duplicate Therapy');
  });
});
