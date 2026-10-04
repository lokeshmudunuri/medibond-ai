import { Provenance } from './index';

export type ChangeDetectionType = 'NO_CHANGE' | 'MEANINGFUL_CHANGE' | 'CONCERNING_CHANGE';

export interface RecoveryStateSnapshot {
  id: string;
  recoveryCaseId: string;
  timestamp: string;
  painScore: number; // 0-10
  sleepHours: number;
  medicationAdherence: 'FULL' | 'PARTIAL' | 'MISSED' | 'UNKNOWN';
  mobilityStatus: 'NORMAL' | 'REDUCED' | 'BEDREST' | 'IMPROVING';
  reportedSymptoms: string[];
  rawUserInput?: string;
  language?: string;
  changeType: ChangeDetectionType;
  changeSummary: string;
  modelAnalysis?: string;
  modelUsed?: string;
  safetyEscalation?: {
    isEscalated: boolean;
    reason?: string;
    level?: 'NONE' | 'ATTENTION' | 'URGENT_CLINICAL_REVIEW' | 'EMERGENCY_RED_FLAG';
  };
}

export interface HourlyRecoveryUpdate {
  id: string;
  recoveryCaseId: string;
  hourTimestamp: string;
  hourNumber: number;
  painDelta: number; // e.g. +2 or -1
  currentPain: number;
  sleepHours: number;
  medicationAdherencePct: number;
  mobilityTrend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  redFlagsDetected: boolean;
  summaryText: string;
  modelUsed: string;
  generatedAt: string;
}

export interface DailyRecoverySummary {
  id: string;
  recoveryCaseId: string;
  date: string;
  dayNumber: number; // e.g. Day 7 of recovery
  symptomsSummary: string;
  improvementStatus: 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'CRITICAL';
  medicationsTakenCount: number;
  missedDoseCount: number;
  sleepHoursTotal: number;
  activityLevel: string;
  dietAdherence: string;
  concerningChanges: string[];
  comparedToYesterday: string;
  questionsForDoctor: string[];
  nextFollowUpReminder?: string;
  modelUsed: string;
  generatedAt: string;
}

export interface RecoveryTimelineEntry {
  id: string;
  recoveryCaseId: string;
  dayNumber: number;
  title: string;
  description: string;
  timestamp: string;
  source: 'DISCHARGE' | 'CHECK_IN' | '10MIN_MONITOR' | 'HOURLY_UPDATE' | 'DAILY_SUMMARY' | 'DOCUMENT_SCAN' | 'DOCTOR_VISIT';
  originalUserInput?: string;
  modelInterpretation?: string;
  documentId?: string;
  imageUri?: string;
  isMilestone?: boolean;
  isAlert?: boolean;
  provenance: Provenance;
}

export interface FullRecoveryCaseProfile {
  caseId: string;
  patientName: string;
  condition: string;
  surgeryOrProcedure?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  hospitalName: string;
  surgeryDate?: string;
  currentDay: number;
  targetDurationDays: number;
  doctorInstructions: string[];
  restrictions: string[];
  medications: string[];
  dietGuidance: string;
  followUpDate?: string;
  currentStatus: 'RECOVERING_WELL' | 'MONITORING_CLOSELY' | 'ATTENTION_REQUIRED' | 'ESCALATED';
  currentPainScore: number;
  currentSleepHours: number;
  medicationAdherenceRate: number; // 0-100
  mobilityLevel: string;
  foodAdherence: string;
  recentSymptoms: string[];
  changesSinceYesterday: string;
  milestones: {
    dayNumber: number;
    title: string;
    description: string;
    isCompleted: boolean;
  }[];
  active10MinMonitoring: boolean;
  lastCheckInDate?: string;
}
