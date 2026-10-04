export enum ProvenanceSource {
  ClinicallyDocumented = 'DOC',
  UserReported = 'USER',
  SystemDetected = 'SYS',
  RequiresReview = 'REVIEW',
  UrgentEscalation = 'URGENT',
}

export interface Provenance {
  source: ProvenanceSource;
  documentId?: string;
  documentName?: string;
  confidence: number;
  recordedAt: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  heightCm: number;
  weightKg: number;
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredLanguage: string;
  provenance: Provenance;
}

export interface ConditionEntity {
  id: string;
  name: string;
  icdOrCategory: string;
  diagnosedDate: string;
  status: 'active' | 'managed' | 'resolved';
  notes: string;
  provenance: Provenance;
}

export interface AllergyEntity {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
  identifiedDate: string;
  provenance: Provenance;
}

export * from './case';

export interface MedicineEntity {
  id: string;
  caseId?: string;
  name: string;
  genericName: string;
  dosage: string;
  form?: string;
  frequency: string;
  timing: string;
  instructions: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  isConfirmedByUser: boolean;
  reminderTimes: string[];
  prescribedForCondition: string;
  prescribingDoctor: string;
  provenance: Provenance;
}

export interface LabResultItem {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  interpretation?: string;
}

export interface ReportEntity {
  id: string;
  caseId?: string;
  title: string;
  type: 'Lab' | 'Imaging' | 'Discharge' | 'Prescription' | 'General';
  testDate: string;
  laboratoryOrHospital: string;
  summary: string;
  rawOcrText: string;
  results: LabResultItem[];
  localFilePath?: string;
  provenance: Provenance;
}

export interface ProcedureEntity {
  id: string;
  name: string;
  procedureDate: string;
  hospital: string;
  surgeon: string;
  notes: string;
  recoveryStatus: string;
  provenance: Provenance;
}

export interface SymptomEntity {
  id: string;
  symptom: string;
  severity: number; // 1-10
  location: string;
  loggedAt: string;
  notes: string;
  isTriggerForAlert?: boolean;
  provenance: Provenance;
}

export interface DoctorInstructionEntity {
  id: string;
  title: string;
  instruction: string;
  category: 'WoundCare' | 'Activity' | 'Medication' | 'Diet' | 'FollowUp';
  givenDate: string;
  doctorName: string;
  isCompleted: boolean;
  provenance: Provenance;
}

export interface RecoveryMilestone {
  dayNumber: number;
  title: string;
  description: string;
  isCompleted: boolean;
}

export interface RecoveryPlanEntity {
  id: string;
  title: string;
  procedureName: string;
  startDate: string;
  targetDurationDays: number;
  currentPhase: string;
  milestones: RecoveryMilestone[];
  targetDailySteps: number;
  targetRestHours: number;
  isActive: boolean;
  provenance: Provenance;
}

export interface DailyCheckInEntity {
  id: string;
  checkInDate: string;
  painScore: number;
  fatigueScore: number;
  moodScore: number;
  sleepHours: number;
  tookAllMedications: boolean;
  reportedSymptoms: string;
  patientSpokenTranscript?: string;
  adaptiveFollowUpQuestion?: string;
  adaptiveFollowUpAnswer?: string;
  clinicianNotes?: string;
  provenance: Provenance;
}

export interface PersonalBaselineEntity {
  id: string;
  metricName: string;
  baselineMean: number;
  stdDevOrMAD: number;
  cusumHigh: number;
  cusumLow: number;
  sampleCount: number;
  lastUpdated: string;
  provenance: Provenance;
}

export enum AlertSeverity {
  Info = 'info',
  Warning = 'warning',
  Critical = 'critical',
}

export interface AlertEntity {
  id: string;
  title: string;
  metricOrSource: string;
  observedValue: number;
  baselineValue: number;
  deviation: number;
  severity: AlertSeverity;
  whatChanged: string;
  whyItMatters: string;
  dataCausedFlag: string;
  persistedDuration: string;
  escalationLevel: string;
  explanation: string;
  recommendedAction: string;
  timestamp: string;
  isAcknowledged: boolean;
  provenance: Provenance;
}

export interface GeneDrugSafetyFlag {
  gene: string;
  variantOrPhenotype: string;
  affectedDrug: string;
  clinicalImplication: string;
  recommendationLevel: string;
  provenance: Provenance;
}
