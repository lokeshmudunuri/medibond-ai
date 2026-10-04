import {
  AllergyEntity,
  CaseFile,
  ConditionEntity,
  CreateCasePayload,
  DailyCheckInEntity,
  DoctorInstructionEntity,
  HealthTimelineEvent,
  MedicineEntity,
  PatientProfile,
  ProcedureEntity,
  ProvenanceSource,
  RecoveryPlanEntity,
  ReportEntity,
  SymptomEntity,
} from '../types';
import {
  SEED_ALLERGIES,
  SEED_CHECKINS,
  SEED_CONDITIONS,
  SEED_MEDICINES,
  SEED_PATIENT,
  SEED_PROCEDURES,
  SEED_RECOVERY_PLAN,
} from '../database/SeedData';
import { HealthContextPayload } from '../ai/AIEngine';

export class HealthMemoryService {
  private static instance: HealthMemoryService;

  private patient: PatientProfile = {
    id: 'user_profile',
    name: 'My Health Profile',
    age: 0,
    gender: 'Not specified',
    bloodGroup: 'Unknown',
    heightCm: 0,
    weightKg: 0,
    emergencyContactName: '',
    emergencyContactPhone: '',
    preferredLanguage: 'English',
    provenance: {
      source: ProvenanceSource.UserReported,
      confidence: 1.0,
      recordedAt: new Date().toISOString(),
    },
  };

  private cases: Map<string, CaseFile> = new Map();
  private conditions: Map<string, ConditionEntity> = new Map();
  private allergies: Map<string, AllergyEntity> = new Map();
  private medicines: Map<string, MedicineEntity> = new Map();
  private reports: Map<string, ReportEntity> = new Map();
  private procedures: Map<string, ProcedureEntity> = new Map();
  private symptoms: Map<string, SymptomEntity> = new Map();
  private recoveryPlans: Map<string, RecoveryPlanEntity> = new Map();
  private doctorInstructions: Map<string, DoctorInstructionEntity> = new Map();
  private checkIns: DailyCheckInEntity[] = [];
  private timelineEvents: HealthTimelineEvent[] = [];

  private constructor() {
    // Starts with clean empty state for real users
  }

  public static getInstance(): HealthMemoryService {
    if (!HealthMemoryService.instance) {
      HealthMemoryService.instance = new HealthMemoryService();
    }
    return HealthMemoryService.instance;
  }

  /**
   * Explicitly loads demo data only when user or developer requests it
   */
  public loadDemoData() {
    this.patient = { ...SEED_PATIENT };
    this.cases.clear();
    this.conditions.clear();
    this.allergies.clear();
    this.medicines.clear();
    this.reports.clear();
    this.procedures.clear();
    this.symptoms.clear();
    this.recoveryPlans.clear();
    this.doctorInstructions.clear();
    this.checkIns = [];

    // Create 2 realistic sample cases
    const demoCase1: CaseFile = {
      id: 'case_demo_1',
      title: 'Dr Ravi - Rashi Hospital',
      doctorName: 'Dr. Ravi Swaminathan',
      hospitalName: 'Rashi Multi-Specialty Hospital',
      specialty: 'Cardiology & Internal Medicine',
      description: 'Hypertension and routine cardiac wellness monitoring',
      createdAt: '2026-09-15T09:00:00Z',
      updatedAt: '2026-10-04T10:00:00Z',
      status: 'ACTIVE',
      caseType: 'GENERAL',
      followUpDate: '2026-11-15',
      dietGuidance: 'Low sodium diet, reduce processed food, maintain 2.5L daily hydration.',
      doctorInstructions: [
        'Take Telmisartan 40mg daily every morning after breakfast.',
        'Monitor and log home blood pressure twice weekly.',
        'Walk 30 minutes daily at a comfortable pace.',
      ],
      documentIds: ['doc_demo_1'],
      medicineIds: ['med_01', 'med_02'],
      symptoms: ['Occasional mild morning dizziness'],
      notes: 'Blood pressure well controlled on current dosage.',
    };

    const demoCase2: CaseFile = {
      id: 'case_demo_2',
      title: 'Appendix Surgery - Raju Hospital',
      doctorName: 'Dr. Sarah Chen, MS',
      hospitalName: 'Raju Surgical Hospital',
      specialty: 'General & Laparoscopic Surgery',
      description: 'Laparoscopic appendectomy post-op recovery',
      createdAt: '2026-09-28T14:30:00Z',
      updatedAt: '2026-10-04T08:00:00Z',
      status: 'ACTIVE',
      caseType: 'RECOVERY',
      followUpDate: '2026-10-12',
      dietGuidance: 'Soft bland diet for first 7 days, avoid spicy or heavy fried foods.',
      doctorInstructions: [
        'Keep surgical dressing clean and completely dry.',
        'Take complete antibiotic course (Amoxicillin-Clavulanate) for 7 days.',
        'Contact clinic immediately if fever exceeds 101°F or incision shows red streaks.',
      ],
      documentIds: ['doc_demo_2'],
      medicineIds: ['med_03'],
      symptoms: ['Mild surgical site soreness'],
      notes: 'Incision healing well with no signs of infection.',
    };

    this.cases.set(demoCase1.id, demoCase1);
    this.cases.set(demoCase2.id, demoCase2);

    SEED_CONDITIONS.forEach((c) => this.conditions.set(c.id, c));
    SEED_ALLERGIES.forEach((a) => this.allergies.set(a.id, a));
    SEED_MEDICINES.forEach((m) => {
      this.medicines.set(m.id, {
        ...m,
        caseId: m.id.includes('1') ? 'case_demo_1' : 'case_demo_2',
      });
    });
    SEED_PROCEDURES.forEach((p) => this.procedures.set(p.id, p));
    this.recoveryPlans.set(SEED_RECOVERY_PLAN.id, SEED_RECOVERY_PLAN);
    this.checkIns = [...SEED_CHECKINS];

    // Seed realistic initial timeline events
    this.timelineEvents = [
      {
        id: 'timeline_init_1',
        caseId: 'case_demo_1',
        eventType: 'PRESCRIPTION_ADDED',
        title: 'Prescription Added - Dr. Ravi Swaminathan',
        description: 'Telmisartan 40mg once daily recorded from consultation prescription.',
        timestamp: '2026-09-15T09:15:00Z',
        provenance: {
          source: ProvenanceSource.ClinicallyDocumented,
          confidence: 0.98,
          recordedAt: '2026-09-15T09:15:00Z',
        },
      },
      {
        id: 'timeline_init_2',
        caseId: 'case_demo_1',
        eventType: 'MEDICINE_CONFIRMED',
        title: 'Medicine Confirmed: Telmisartan 40mg',
        description: 'Patient confirmed medication schedule: 1 tablet every morning after breakfast.',
        timestamp: '2026-09-15T09:30:00Z',
        provenance: {
          source: ProvenanceSource.UserReported,
          confidence: 1.0,
          recordedAt: '2026-09-15T09:30:00Z',
        },
      },
      {
        id: 'timeline_init_3',
        caseId: 'case_demo_2',
        eventType: 'REPORT_ADDED',
        title: 'Discharge Summary - Raju Hospital',
        description: 'Laparoscopic appendectomy operative report and post-op wound care instructions.',
        timestamp: '2026-09-28T15:00:00Z',
        provenance: {
          source: ProvenanceSource.ClinicallyDocumented,
          confidence: 0.96,
          recordedAt: '2026-09-28T15:00:00Z',
        },
      },
      {
        id: 'timeline_init_4',
        caseId: 'case_demo_2',
        eventType: 'DOCTOR_NOTE_ADDED',
        title: 'Post-Op Instruction Recorded',
        description: 'Keep surgical dressing clean and dry. Complete 7-day antibiotic course.',
        timestamp: '2026-09-28T15:10:00Z',
        provenance: {
          source: ProvenanceSource.ClinicallyDocumented,
          confidence: 0.99,
          recordedAt: '2026-09-28T15:10:00Z',
        },
      },
    ];
  }

  public clearAllData() {
    this.cases.clear();
    this.conditions.clear();
    this.allergies.clear();
    this.medicines.clear();
    this.reports.clear();
    this.procedures.clear();
    this.symptoms.clear();
    this.recoveryPlans.clear();
    this.doctorInstructions.clear();
    this.checkIns = [];
    this.timelineEvents = [];
  }

  // ==========================================
  // TIMELINE MANAGEMENT
  // ==========================================

  public getTimelineEvents(caseId?: string): HealthTimelineEvent[] {
    const list = caseId
      ? this.timelineEvents.filter((e) => !e.caseId || e.caseId === caseId)
      : this.timelineEvents;
    return [...list].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public addTimelineEvent(event: HealthTimelineEvent): void {
    this.timelineEvents.unshift(event);
  }

  // ==========================================
  // CASE FILE MANAGEMENT
  // ==========================================

  public getCases(): CaseFile[] {
    return Array.from(this.cases.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public getCaseById(id: string): CaseFile | undefined {
    return this.cases.get(id);
  }

  public createCase(payload: CreateCasePayload): CaseFile {
    const id = `case_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const instructions: string[] = [];
    if (payload.initialInstructions?.trim()) {
      instructions.push(payload.initialInstructions.trim());
    }

    const newCase: CaseFile = {
      id,
      title: payload.title.trim(),
      doctorName: payload.doctorName.trim(),
      hospitalName: payload.hospitalName.trim(),
      specialty: payload.specialty?.trim(),
      description: payload.description?.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'ACTIVE',
      caseType: payload.caseType || 'GENERAL',
      followUpDate: payload.followUpDate,
      dietGuidance: payload.dietGuidance?.trim(),
      doctorInstructions: instructions,
      documentIds: [],
      medicineIds: [],
      symptoms: [],
    };

    this.cases.set(id, newCase);

    this.addTimelineEvent({
      id: `timeline_case_${id}`,
      caseId: id,
      eventType: 'DOCTOR_NOTE_ADDED',
      title: `Case File Created: ${newCase.title}`,
      description: `New ${newCase.caseType.toLowerCase()} case opened for ${newCase.doctorName} at ${newCase.hospitalName}.`,
      timestamp,
      provenance: {
        source: ProvenanceSource.UserReported,
        confidence: 1.0,
        recordedAt: timestamp,
      },
    });

    return newCase;
  }

  public updateCase(id: string, updates: Partial<CaseFile>): CaseFile | undefined {
    const existing = this.cases.get(id);
    if (!existing) return undefined;

    const updated: CaseFile = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.cases.set(id, updated);
    return updated;
  }

  public deleteCase(id: string): boolean {
    // Delete associated medicines and reports
    for (const [mId, med] of this.medicines.entries()) {
      if (med.caseId === id) this.medicines.delete(mId);
    }
    for (const [rId, rep] of this.reports.entries()) {
      if (rep.caseId === id) this.reports.delete(rId);
    }
    this.timelineEvents = this.timelineEvents.filter((e) => e.caseId !== id);
    return this.cases.delete(id);
  }

  public archiveCase(id: string): boolean {
    const existing = this.cases.get(id);
    if (!existing) return false;
    existing.status = 'ARCHIVED';
    existing.updatedAt = new Date().toISOString();
    this.cases.set(id, existing);
    return true;
  }

  // ==========================================
  // CASE-SCOPED ENTITY QUERIES & CONFIRMATIONS
  // ==========================================

  public getMedicinesByCase(caseId: string): MedicineEntity[] {
    return Array.from(this.medicines.values()).filter((m) => m.caseId === caseId);
  }

  public getReportsByCase(caseId: string): ReportEntity[] {
    return Array.from(this.reports.values()).filter((r) => r.caseId === caseId);
  }

  public getLatestReport(caseId?: string): ReportEntity | undefined {
    const list = caseId ? this.getReportsByCase(caseId) : this.getReports();
    if (list.length === 0) return undefined;
    return list.sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())[0];
  }

  public getPrescriptions(caseId?: string): ReportEntity[] {
    const list = caseId ? this.getReportsByCase(caseId) : this.getReports();
    return list.filter((r) => r.type === 'Prescription');
  }

  public addMedicineToCase(caseId: string, med: MedicineEntity): void {
    med.caseId = caseId;
    this.medicines.set(med.id, med);

    const c = this.cases.get(caseId);
    if (c && !c.medicineIds.includes(med.id)) {
      c.medicineIds.push(med.id);
      c.updatedAt = new Date().toISOString();
    }
  }

  public confirmMedicine(medId: string): boolean {
    const med = this.medicines.get(medId);
    if (!med) return false;

    med.isConfirmedByUser = true;
    med.confirmationStatus = 'CONFIRMED';
    med.isActive = true;

    const timestamp = new Date().toISOString();
    this.addTimelineEvent({
      id: `timeline_med_conf_${med.id}`,
      caseId: med.caseId,
      eventType: 'MEDICINE_CONFIRMED',
      title: `Medication Confirmed: ${med.name}`,
      description: `Patient verified dosage: ${med.dosage}, frequency: ${med.frequency} (${med.timing}).`,
      timestamp,
      entityId: med.id,
      provenance: {
        source: ProvenanceSource.UserReported,
        confidence: 1.0,
        recordedAt: timestamp,
      },
    });

    return true;
  }

  public rejectMedicine(medId: string): boolean {
    const med = this.medicines.get(medId);
    if (!med) return false;

    med.isConfirmedByUser = false;
    med.confirmationStatus = 'REJECTED';
    med.isActive = false;
    return true;
  }

  public addReportToCase(caseId: string, report: ReportEntity): void {
    report.caseId = caseId;
    this.reports.set(report.id, report);

    const c = this.cases.get(caseId);
    if (c && !c.documentIds.includes(report.id)) {
      c.documentIds.push(report.id);
      c.updatedAt = new Date().toISOString();
    }

    const timestamp = new Date().toISOString();
    const eventType = report.type === 'Prescription' ? 'PRESCRIPTION_ADDED' : 'REPORT_ADDED';
    this.addTimelineEvent({
      id: `timeline_rep_${report.id}`,
      caseId,
      eventType,
      title: `${report.type === 'Prescription' ? 'Prescription' : 'Medical Report'} Added: ${report.title}`,
      description: report.summary || `Added to ${c?.title || 'Case File'}.`,
      timestamp,
      entityId: report.id,
      provenance: report.provenance || {
        source: ProvenanceSource.ClinicallyDocumented,
        confidence: 0.95,
        recordedAt: timestamp,
      },
    });
  }

  public addInstructionToCase(caseId: string, instruction: string): void {
    const c = this.cases.get(caseId);
    if (c && instruction.trim()) {
      c.doctorInstructions.push(instruction.trim());
      c.updatedAt = new Date().toISOString();

      const timestamp = new Date().toISOString();
      this.addTimelineEvent({
        id: `timeline_inst_${Date.now()}`,
        caseId,
        eventType: 'DOCTOR_NOTE_ADDED',
        title: 'Doctor Instruction Logged',
        description: instruction.trim(),
        timestamp,
        provenance: {
          source: ProvenanceSource.ClinicallyDocumented,
          confidence: 0.98,
          recordedAt: timestamp,
        },
      });
    }
  }

  public addSymptom(symptom: SymptomEntity, caseId?: string): void {
    this.symptoms.set(symptom.id, symptom);
    if (caseId) {
      const c = this.cases.get(caseId);
      if (c && !c.symptoms.includes(symptom.symptom)) {
        c.symptoms.push(symptom.symptom);
        c.updatedAt = new Date().toISOString();
      }
    }

    const timestamp = new Date().toISOString();
    this.addTimelineEvent({
      id: `timeline_symp_${symptom.id}`,
      caseId,
      eventType: 'SYMPTOM_RECORDED',
      title: `Symptom Recorded: ${symptom.symptom}`,
      description: `Severity: ${symptom.severity}/10${symptom.notes ? ` - ${symptom.notes}` : ''}`,
      timestamp,
      entityId: symptom.id,
      provenance: symptom.provenance,
    });
  }

  /**
   * Retrieves dietary guidance grounded strictly in case context
   */
  public getDietGuidance(caseId?: string): {
    hasSpecificGuidance: boolean;
    guidanceText: string;
    restrictions: string[];
    disclaimer: string;
  } {
    if (!caseId) {
      return {
        hasSpecificGuidance: false,
        guidanceText: "I don't have enough information in this case to give you a reliable personalized answer. Please check with your doctor or dietitian.",
        restrictions: [],
        disclaimer: 'Always verify dietary changes with your treating physician.',
      };
    }

    const c = this.cases.get(caseId);
    if (!c || (!c.dietGuidance && c.doctorInstructions.length === 0)) {
      return {
        hasSpecificGuidance: false,
        guidanceText: "I don't have enough information in this case to give you a reliable personalized answer. Please check with your doctor or dietitian.",
        restrictions: [],
        disclaimer: 'Always verify dietary changes with your treating physician.',
      };
    }

    const restrictions: string[] = [];
    if (c.dietGuidance) {
      restrictions.push(c.dietGuidance);
    }

    // Check doctor instructions for dietary mentions
    for (const inst of c.doctorInstructions) {
      const lower = inst.toLowerCase();
      if (lower.includes('diet') || lower.includes('food') || lower.includes('eat') || lower.includes('sodium') || lower.includes('sugar') || lower.includes('spice') || lower.includes('water') || lower.includes('fluid')) {
        restrictions.push(inst);
      }
    }

    return {
      hasSpecificGuidance: true,
      guidanceText: c.dietGuidance || restrictions.join('. '),
      restrictions,
      disclaimer: `Based on documented case instructions from ${c.doctorName} (${c.hospitalName}).`,
    };
  }

  // ==========================================
  // GENERAL HEALTH & CONTEXT RETRIEVAL
  // ==========================================

  public getPatientProfile(): PatientProfile {
    return { ...this.patient };
  }

  public updatePatientProfile(profile: Partial<PatientProfile>) {
    this.patient = { ...this.patient, ...profile };
  }

  public getConditions(): ConditionEntity[] {
    return Array.from(this.conditions.values());
  }

  public addCondition(cond: ConditionEntity): void {
    this.conditions.set(cond.id, cond);
  }

  public getAllergies(): AllergyEntity[] {
    return Array.from(this.allergies.values());
  }

  public addAllergy(allergy: AllergyEntity): void {
    this.allergies.set(allergy.id, allergy);
  }

  public getMedicines(onlyActive = false): MedicineEntity[] {
    const list = Array.from(this.medicines.values());
    return onlyActive ? list.filter((m) => m.isActive) : list;
  }

  public addMedicine(med: MedicineEntity): void {
    this.medicines.set(med.id, med);
  }

  public getReports(): ReportEntity[] {
    return Array.from(this.reports.values());
  }

  public addReport(rep: ReportEntity): void {
    this.reports.set(rep.id, rep);
  }

  public getProcedures(): ProcedureEntity[] {
    return Array.from(this.procedures.values());
  }

  public getDoctorInstructions(): DoctorInstructionEntity[] {
    return Array.from(this.doctorInstructions.values());
  }

  public getActiveRecoveryPlan(): RecoveryPlanEntity | null {
    const active = Array.from(this.recoveryPlans.values()).find((p) => p.isActive);
    return active || null;
  }

  public getCheckIns(): DailyCheckInEntity[] {
    return [...this.checkIns];
  }

  public addCheckIn(checkIn: DailyCheckInEntity): void {
    this.checkIns.unshift(checkIn);
  }

  /**
   * Builds focused, case-scoped context for local LLM prompts
   */
  public buildCaseContext(caseId: string): string {
    const c = this.cases.get(caseId);
    if (!c) return this.formatContextForPrompt(this.buildCurrentContextSync());

    const meds = this.getMedicinesByCase(caseId);
    const reports = this.getReportsByCase(caseId);
    const allergies = this.getAllergies();

    const medStr =
      meds.length > 0
        ? meds.map((m) => `- ${m.name} (${m.dosage}, ${m.frequency}): ${m.instructions}`).join('\n')
        : 'No specific medications for this case.';

    const instStr =
      c.doctorInstructions.length > 0
        ? c.doctorInstructions.map((i) => `- ${i}`).join('\n')
        : 'None recorded.';

    const allergyStr =
      allergies.length > 0
        ? allergies.map((a) => `- ${a.allergen} (${a.severity})`).join('\n')
        : 'No known drug allergies.';

    return `[CASE FILE CONTEXT: ${c.title}]
Doctor: ${c.doctorName} | Hospital: ${c.hospitalName} | Specialty: ${c.specialty || 'General'}
Status: ${c.status} | Follow-up Date: ${c.followUpDate || 'Not scheduled'}
Diet Guidance: ${c.dietGuidance || 'Standard diet'}

Prescribed Medications for this Case:
${medStr}

Doctor Instructions:
${instStr}

Patient Known Allergies:
${allergyStr}`;
  }

  public async retrieveStructuredContext(
    query: string,
    activeCaseId?: string
  ): Promise<{
    patient: PatientProfile;
    matchedMedicines: MedicineEntity[];
    matchedAllergies: AllergyEntity[];
    matchedConditions: ConditionEntity[];
    matchedReports: ReportEntity[];
    recoveryPlan: RecoveryPlanEntity | null;
    recentCheckIn: DailyCheckInEntity | null;
    activeCase?: CaseFile;
  }> {
    const lowerQuery = query.toLowerCase();
    const activeCase = activeCaseId ? this.cases.get(activeCaseId) : undefined;
    const activeMeds = activeCaseId
      ? this.getMedicinesByCase(activeCaseId)
      : this.getMedicines(true);
    const allergies = this.getAllergies();
    const conditions = this.getConditions();
    const reports = activeCaseId ? this.getReportsByCase(activeCaseId) : this.getReports();

    const matchedMedicines = activeMeds.filter(
      (m) =>
        lowerQuery.includes(m.name.toLowerCase()) ||
        lowerQuery.includes(m.genericName.toLowerCase()) ||
        lowerQuery.includes('medicine') ||
        lowerQuery.includes('tablet') ||
        lowerQuery.includes('dose')
    );

    const matchedAllergies = allergies.filter(
      (a) =>
        lowerQuery.includes(a.allergen.toLowerCase()) ||
        lowerQuery.includes('allergy') ||
        lowerQuery.includes('allergic')
    );

    const matchedConditions = conditions.filter(
      (c) =>
        lowerQuery.includes(c.name.toLowerCase()) ||
        lowerQuery.includes('condition') ||
        lowerQuery.includes('diagnos')
    );

    const matchedReports = reports.filter(
      (r) =>
        lowerQuery.includes(r.title.toLowerCase()) ||
        lowerQuery.includes('report') ||
        lowerQuery.includes('test') ||
        lowerQuery.includes('lab') ||
        lowerQuery.includes('prescription')
    );

    return {
      patient: this.getPatientProfile(),
      matchedMedicines: matchedMedicines.length > 0 ? matchedMedicines : activeMeds.slice(0, 3),
      matchedAllergies,
      matchedConditions,
      matchedReports,
      recoveryPlan: this.getActiveRecoveryPlan(),
      recentCheckIn: this.checkIns.length > 0 ? this.checkIns[0] : null,
      activeCase,
    };
  }

  public formatContextForPrompt(context: any): string {
    const caseHeader = context.activeCase
      ? `[ACTIVE CASE: ${context.activeCase.title} - ${context.activeCase.doctorName} (${context.activeCase.hospitalName})]\n`
      : '';

    const medSummary =
      context.matchedMedicines?.length > 0
        ? context.matchedMedicines
            .map((m: any) => `- ${m.name} (${m.dosage}, ${m.frequency}): ${m.instructions}`)
            .join('\n')
        : 'None documented.';

    const allergySummary =
      context.matchedAllergies?.length > 0
        ? context.matchedAllergies.map((a: any) => `- ${a.allergen} (${a.severity})`).join('\n')
        : 'No known drug allergies.';

    return `${caseHeader}[PATIENT HEALTH MEMORY]
Active Medications:
${medSummary}

Documented Allergies:
${allergySummary}`;
  }

  public buildCurrentContextSync(): any {
    return {
      patient: this.getPatientProfile(),
      conditions: this.getConditions(),
      allergies: this.getAllergies(),
      activeMedicines: this.getMedicines(true),
      recoveryPlan: this.getActiveRecoveryPlan(),
    };
  }

  public buildCurrentContext(): HealthContextPayload {
    return this.buildCurrentContextSync();
  }
}
