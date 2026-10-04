import {
  AllergyEntity,
  ConditionEntity,
  DailyCheckInEntity,
  DoctorInstructionEntity,
  MedicineEntity,
  PatientProfile,
  ProcedureEntity,
  ProvenanceSource,
  RecoveryPlanEntity,
  ReportEntity,
} from '../types';

export const SEED_PATIENT: PatientProfile = {
  id: 'patient_demo_1',
  name: 'Alex Rivera (Demo Patient)',
  age: 48,
  gender: 'Male',
  bloodGroup: 'B+',
  heightCm: 174.0,
  weightKg: 76.5,
  emergencyContactName: 'Taylor Rivera (Spouse)',
  emergencyContactPhone: '+1 (555) 234-5678',
  preferredLanguage: 'en',
  provenance: {
    source: ProvenanceSource.ClinicallyDocumented,
    documentName: 'Hospital Intake Record',
    confidence: 1.0,
    recordedAt: '2026-09-01T00:00:00.000Z',
  },
};

export const SEED_CONDITIONS: ConditionEntity[] = [
  {
    id: 'cond_htn',
    name: 'Essential Hypertension (Stage 1)',
    icdOrCategory: 'Cardiovascular (I10)',
    diagnosedDate: '2024-10-15',
    status: 'managed',
    notes: 'Well controlled with Telmisartan 40mg daily.',
    provenance: {
      source: ProvenanceSource.ClinicallyDocumented,
      documentName: 'Cardiology Clinic Note #782',
      confidence: 0.98,
      recordedAt: '2024-10-15T10:00:00.000Z',
    },
  },
  {
    id: 'cond_t2dm',
    name: 'Type 2 Diabetes Mellitus',
    icdOrCategory: 'Endocrine (E11)',
    diagnosedDate: '2025-07-20',
    status: 'managed',
    notes: 'HbA1c target < 6.8%. Dietary modification and Metformin XR 500mg.',
    provenance: {
      source: ProvenanceSource.ClinicallyDocumented,
      documentName: 'Endocrinology Summary #901',
      confidence: 0.96,
      recordedAt: '2025-07-20T14:30:00.000Z',
    },
  },
];

export const SEED_ALLERGIES: AllergyEntity[] = [
  {
    id: 'allg_penicillin',
    allergen: 'Penicillin / Amoxicillin',
    reaction: 'Urticarial rash & facial angioedema',
    severity: 'Severe',
    identifiedDate: '2023-05-12',
    provenance: {
      source: ProvenanceSource.ClinicallyDocumented,
      documentName: 'Allergy Record - Apollo Hospital',
      confidence: 1.0,
      recordedAt: '2023-05-12T09:00:00.000Z',
    },
  },
];

export const SEED_MEDICINES: MedicineEntity[] = [
  {
    id: 'med_telmisartan',
    name: 'Telmisartan 40mg',
    genericName: 'Telmisartan',
    dosage: '40mg (1 tablet)',
    frequency: 'Once daily (OD)',
    timing: 'Morning after breakfast',
    instructions: 'Take consistently at 8:00 AM with water.',
    startDate: '2024-10-15',
    isActive: true,
    isConfirmedByUser: true,
    reminderTimes: ['08:00'],
    prescribedForCondition: 'Essential Hypertension',
    prescribingDoctor: 'Dr. V. Raman (Cardiology)',
    provenance: {
      source: ProvenanceSource.ClinicallyDocumented,
      documentName: 'Prescription Rx-782',
      confidence: 0.98,
      recordedAt: '2024-10-15T10:00:00.000Z',
    },
  },
  {
    id: 'med_metformin',
    name: 'Metformin XR 500mg',
    genericName: 'Metformin Hydrochloride (Extended Release)',
    dosage: '500mg (1 tablet)',
    frequency: 'Once daily with dinner',
    timing: 'With dinner (evening)',
    instructions: 'Swallow whole with food to avoid gastric irritation.',
    startDate: '2025-07-20',
    isActive: true,
    isConfirmedByUser: true,
    reminderTimes: ['20:30'],
    prescribedForCondition: 'Type 2 Diabetes Mellitus',
    prescribingDoctor: 'Dr. S. Kulkarni (Endocrinology)',
    provenance: {
      source: ProvenanceSource.ClinicallyDocumented,
      documentName: 'Prescription Rx-901',
      confidence: 0.96,
      recordedAt: '2025-07-20T14:30:00.000Z',
    },
  },
  {
    id: 'med_pantoprazole',
    name: 'Pantoprazole 40mg',
    genericName: 'Pantoprazole Sodium',
    dosage: '40mg (1 tablet)',
    frequency: 'Once daily before breakfast',
    timing: 'Empty stomach (30 mins before food)',
    instructions: 'Post-op gastric protection. Complete 14-day course.',
    startDate: '2026-09-30',
    endDate: '2026-10-14',
    isActive: true,
    isConfirmedByUser: true,
    reminderTimes: ['07:30'],
    prescribedForCondition: 'Post-Laparoscopic Appendectomy Care',
    prescribingDoctor: 'Dr. Ramesh Rao (Surgeon)',
    provenance: {
      source: ProvenanceSource.ClinicallyDocumented,
      documentName: 'Discharge Summary DSC-2026',
      confidence: 0.99,
      recordedAt: '2026-09-30T11:00:00.000Z',
    },
  },
];

export const SEED_PROCEDURES: ProcedureEntity[] = [
  {
    id: 'proc_lap_app',
    name: 'Laparoscopic Appendectomy (3-Port)',
    procedureDate: '2026-09-30',
    hospital: 'Apollo Health City',
    surgeon: 'Dr. Ramesh Rao, MS, FRCS',
    notes: 'Uncomplicated 3-port laparoscopic appendectomy. Discharged on Day 2 in stable condition.',
    recoveryStatus: 'In Recovery (Phase 2)',
    provenance: {
      source: ProvenanceSource.ClinicallyDocumented,
      documentName: 'Operative Surgical Note #9482',
      confidence: 1.0,
      recordedAt: '2026-09-30T16:00:00.000Z',
    },
  },
];

export const SEED_RECOVERY_PLAN: RecoveryPlanEntity = {
  id: 'plan_appendectomy_recovery',
  title: 'Post-Laparoscopic Appendectomy 14-Day Recovery Protocol',
  procedureName: 'Laparoscopic Appendectomy',
  startDate: '2026-09-30',
  targetDurationDays: 14,
  currentPhase: 'Phase 2: Gradual Mobility & Wound Healing (Days 4-7)',
  targetDailySteps: 2500,
  targetRestHours: 8.5,
  isActive: true,
  milestones: [
    { dayNumber: 1, title: 'Post-op Day 1: Hospital Discharge', description: 'Tolerating soft diet and oral fluids.', isCompleted: true },
    { dayNumber: 3, title: 'Post-op Day 3: Gentle Ambulation', description: 'Short walks inside room (5-10 mins). Dressings dry.', isCompleted: true },
    { dayNumber: 7, title: 'Post-op Day 7: Wound Inspection', description: 'Check trocar port sites for discharge or erythema.', isCompleted: false },
    { dayNumber: 14, title: 'Post-op Day 14: Return to Full Routine', description: 'Follow-up with surgeon. Resume normal exercise.', isCompleted: false },
  ],
  provenance: {
    source: ProvenanceSource.ClinicallyDocumented,
    documentName: 'Discharge Recovery Instructions',
    confidence: 1.0,
    recordedAt: '2026-09-30T11:00:00.000Z',
  },
};

export const SEED_CHECKINS: DailyCheckInEntity[] = [
  {
    id: 'chk_day4',
    checkInDate: '2026-10-04T08:30:00.000Z',
    painScore: 2,
    fatigueScore: 2,
    moodScore: 4,
    sleepHours: 8.0,
    tookAllMedications: true,
    reportedSymptoms: 'Incision healing well, minimal soreness on standing',
    patientSpokenTranscript: 'Feeling much stronger. Took all morning medications on time.',
    provenance: { source: ProvenanceSource.UserReported, confidence: 1.0, recordedAt: '2026-10-04T08:30:00.000Z' },
  },
  {
    id: 'chk_day3',
    checkInDate: '2026-10-03T09:00:00.000Z',
    painScore: 3,
    fatigueScore: 3,
    moodScore: 4,
    sleepHours: 7.5,
    tookAllMedications: true,
    reportedSymptoms: 'Mild soreness around umbilical port',
    patientSpokenTranscript: 'Walked in living room three times today.',
    provenance: { source: ProvenanceSource.UserReported, confidence: 1.0, recordedAt: '2026-10-03T09:00:00.000Z' },
  },
];
