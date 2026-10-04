import { HealthContextPayload } from '../ai/AIEngine';
import { ProvenanceSource } from '../types';

export enum DoctorSummaryType {
  GeneralDoctor = 'general_doctor',
  Specialist = 'specialist',
  FollowUp = 'follow_up',
  RecoveryReview = 'recovery_review',
  UrgentConsultation = 'urgent_consultation',
}

export class DoctorHandoffEngine {
  public static generateSummary(context: HealthContextPayload, type: DoctorSummaryType, specialty?: string): string {
    const p = context.patient;
    const now = new Date().toISOString().split('T')[0];

    const lines: string[] = [];
    lines.push('===============================================================');
    lines.push(' CAREBOND AI — CLINICAL HANDOFF & HEALTH CONTEXT DOSSIER');
    lines.push('===============================================================');
    lines.push(`Summary Type: ${type.toUpperCase()}${specialty ? ` (${specialty})` : ''}`);
    lines.push(`Generated: ${now} | Provenance-Verified Longitudinal Record`);
    lines.push('---------------------------------------------------------------');
    lines.push(`PATIENT: ${p.name} | Age: ${p.age} | Sex: ${p.gender} | Blood Group: ${p.bloodGroup}`);
    lines.push(`Emergency Contact: ${p.emergencyContactName} (${p.emergencyContactPhone})`);
    lines.push('');

    // 1. Conditions
    lines.push('--- 1. DOCUMENTED CONDITIONS ---');
    if (context.conditions.length === 0) {
      lines.push('No documented chronic conditions.');
    } else {
      for (const c of context.conditions) {
        lines.push(`• [${c.provenance.source}] ${c.name} (${c.status.toUpperCase()}) — Diagnosed: ${c.diagnosedDate}. Notes: ${c.notes}`);
      }
    }
    lines.push('');

    // 2. Medications
    lines.push('--- 2. CURRENT ACTIVE MEDICATIONS ---');
    if (context.activeMedicines.length === 0) {
      lines.push('No active medications recorded.');
    } else {
      for (const m of context.activeMedicines) {
        lines.push(`• [${m.provenance.source}] ${m.name} | Dose: ${m.dosage} | Freq: ${m.frequency} | Timing: ${m.timing}`);
        if (m.instructions) {
          lines.push(`   Doctor Instructions: ${m.instructions}`);
        }
      }
    }
    lines.push('');

    // 3. Allergies
    lines.push('--- 3. KNOWN ALLERGIES & CONTRAINDICATIONS ---');
    if (context.allergies.length === 0) {
      lines.push('No known drug or environmental allergies.');
    } else {
      for (const a of context.allergies) {
        lines.push(`• [${a.provenance.source}] ⚠️ ALLERGY: ${a.allergen} — Reaction: ${a.reaction} (Severity: ${a.severity})`);
      }
    }
    lines.push('');

    // 4. Recovery Protocol
    lines.push('--- 4. SURGICAL RECOVERY STATUS ---');
    if (context.recoveryPlan) {
      const pl = context.recoveryPlan;
      lines.push(`Protocol: ${pl.title}`);
      lines.push(`Target Duration: ${pl.targetDurationDays} days | Current Phase: ${pl.currentPhase}`);
      lines.push(`Mobility Target: ${pl.targetDailySteps} steps/day | Rest Target: ${pl.targetRestHours} hrs/day`);
    } else {
      lines.push('Patient is not currently under an active surgical recovery protocol.');
    }
    lines.push('');

    // 5. Clinician Review Prompts
    lines.push('--- 5. RELEVANT CLINICIAN REVIEW PROMPTS ---');
    if (type === DoctorSummaryType.Specialist) {
      lines.push(`1. Review specialist-specific pharmacological interactions for ${specialty || 'specialist'}.`);
      lines.push(`2. Confirm cross-reactivity cautions against active medications.`);
    } else if (type === DoctorSummaryType.RecoveryReview) {
      lines.push('1. Inspect surgical trocar / incision sites for healing and erythema.');
      lines.push('2. Evaluate readiness for full physical activity progression.');
    } else {
      lines.push('1. Review antihypertensive and antidiabetic regimen adherence.');
      lines.push('2. Confirm ongoing prescription reconciliation.');
    }
    lines.push('');
    lines.push('===============================================================');
    lines.push('PROVENANCE KEY:');
    lines.push('[DOC] = Clinically Documented | [USER] = Patient-Reported | [SYS] = System-Detected');
    lines.push('===============================================================');

    return lines.join('\n');
  }
}
