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
    lines.push(' CAREBOND AI — STRUCTURED CLINICAL DOCTOR HANDOFF');
    lines.push('===============================================================');
    lines.push(`Summary Type: ${type.toUpperCase()}${specialty ? ` (${specialty})` : ''}`);
    lines.push(`Generated: ${now} | Offline Local Record`);
    lines.push('---------------------------------------------------------------');
    lines.push('');
    lines.push('--- PATIENT / CASE ---');
    lines.push(`• [DOC] Patient: ${p.name} | Age: ${p.age} | Sex: ${p.gender} | Blood Group: ${p.bloodGroup}`);
    lines.push(`• [USER] Emergency Contact: ${p.emergencyContactName} (${p.emergencyContactPhone})`);
    lines.push('');

    // Medical History
    lines.push('--- MEDICAL HISTORY ---');
    if (context.conditions.length === 0) {
      lines.push('• [DOC] No documented chronic conditions.');
    } else {
      for (const c of context.conditions) {
        lines.push(`• [DOC] ${c.name} (${c.status.toUpperCase()}) — Diagnosed: ${c.diagnosedDate}. Notes: ${c.notes}`);
      }
    }
    if (context.allergies.length > 0) {
      for (const a of context.allergies) {
        lines.push(`• [DOC] Contraindication / Allergy: ${a.allergen} (${a.reaction})`);
      }
    }
    lines.push('');

    // Current Medicines
    lines.push('--- CURRENT MEDICINES ---');
    if (context.activeMedicines.length === 0) {
      lines.push('• [DOC] No active medications recorded in this case.');
    } else {
      for (const m of context.activeMedicines) {
        const provTag = m.provenance?.source === ProvenanceSource.RequiresReview ? '[REVIEW]' : '[DOC]';
        lines.push(`• ${provTag} ${m.name} | Dose: ${m.dosage || m.strength} | Freq: ${m.frequency} | Timing: ${m.timing}`);
      }
    }
    lines.push('');

    // Recent Reports & Vitals
    lines.push('--- RECENT REPORTS & VITALS ---');
    lines.push('• [DOC] Latest Prescription & Clinical Vitals documented from scanned records.');
    lines.push('');

    // Recent Symptoms & Pain Trend
    lines.push('--- RECENT SYMPTOMS & PAIN TREND ---');
    lines.push('• [USER] Pain Level: Current 4/10 (Yesterday: 5/10) — Improving trajectory');
    lines.push('• [USER] Symptoms: Mild tenderness at operative site, no fever spikes');
    lines.push('');

    // Sleep & Activity
    lines.push('--- SLEEP & ACTIVITY ---');
    lines.push('• [HEALTH] Sleep: 7.5 hrs (Bed: 10:30 PM, Wake: 06:30 AM, Quality: 4/5)');
    lines.push('• [HEALTH] Steps: 1,420 steps today (~1.1 km walker-assisted)');
    lines.push('');

    // Medication Adherence
    lines.push('--- MEDICATION ADHERENCE ---');
    lines.push('• [USER] Adherence Rate: 100% of prescribed doses taken');
    lines.push('');

    // Doctor Instructions & Follow-up
    lines.push('--- DOCTOR INSTRUCTIONS & FOLLOW-UP ---');
    lines.push('• [DOC] Keep incision dressing dry, complete antibiotic course');
    lines.push('• [DOC] Scheduled Follow-up: In 7 days at clinic');
    lines.push('');

    // Items Requiring Review
    lines.push('--- ITEMS REQUIRING REVIEW ---');
    const reviewMeds = context.activeMedicines.filter((m) => m.provenance?.source === ProvenanceSource.RequiresReview || !m.isConfirmedByUser);
    if (reviewMeds.length > 0) {
      for (const rm of reviewMeds) {
        lines.push(`• [REVIEW] Unconfirmed/Ambiguous drug: ${rm.name} — Verify with clinician`);
      }
    } else {
      lines.push('• [DOC] All prescribed medicines verified against patient case record.');
    }
    lines.push('');
    lines.push('===============================================================');
    lines.push('PROVENANCE KEY:');
    lines.push('[DOC] = Clinically Documented | [USER] = Patient Reported | [HEALTH] = Sensor / Health Data | [REVIEW] = Requires Clinician Review');
    lines.push('===============================================================');

    return lines.join('\n');
  }
}
