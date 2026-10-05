import { EmergencySafetyEngine } from '../safety/EmergencySafetyEngine';
import { IntentScopeFilter } from '../safety/IntentScopeFilter';
import { MedicationSafetyChecker } from '../safety/MedicationSafetyChecker';
import { ScopeFilterResult } from '../types/chat';
import { LocalLLMEngine } from './LocalLLMEngine';
import { HealthMemoryService } from '../services/HealthMemoryService';
import {
  PatientProfile,
  ConditionEntity,
  AllergyEntity,
  MedicineEntity,
  RecoveryPlanEntity,
  CaseFile,
} from '../types';

export interface HealthContextPayload {
  patient: PatientProfile;
  conditions: ConditionEntity[];
  allergies: AllergyEntity[];
  activeMedicines: MedicineEntity[];
  recoveryPlan?: RecoveryPlanEntity | null;
  activeCase?: CaseFile;
}

export interface StreamResponseChunk {
  token: string;
  isEmergencyAlert?: boolean;
  isPolicyWarning?: boolean;
  isSafetyWarning?: boolean;
}

export interface StructuredChatAction {
  type: 'log_checkin' | 'scan_doc' | 'open_food_guidance';
  payload: string;
}

export class AIEngine {
  private static instance: AIEngine;
  private localLLM: LocalLLMEngine;
  private memoryService = HealthMemoryService.getInstance();

  private constructor() {
    this.localLLM = LocalLLMEngine.getInstance();
  }

  public static getInstance(): AIEngine {
    if (!AIEngine.instance) {
      AIEngine.instance = new AIEngine();
    }
    return AIEngine.instance;
  }

  /**
   * Main entry point for streaming case-aware clinical chat with strict safety guardrails
   */
  public async *streamChat(
    userPrompt: string,
    activeCaseId?: string,
    explicitContext?: HealthContextPayload
  ): AsyncGenerator<StreamResponseChunk, void, void> {
    // 1. Mandatory Deterministic Emergency Red Flag Check
    const emergency = EmergencySafetyEngine.evaluateRedFlags(userPrompt);
    if (emergency.isEmergency) {
      const alertMessage =
        `🚨 **EMERGENCY MEDICAL ALERT: ${emergency.title}**\n\n` +
        `**Clinical Rationale:** ${emergency.rationale}\n\n` +
        `**Immediate Action Required:**\n${emergency.immediateAction}\n\n` +
        `📞 Emergency Contact: Dial ${emergency.emergencyNumber} immediately.`;

      yield { token: alertMessage, isEmergencyAlert: true };
      return;
    }

    // 2. Application-Level Intent & Scope Gatekeeper
    const scope = IntentScopeFilter.evaluatePrompt(userPrompt);
    if (scope === ScopeFilterResult.OutOfScope) {
      yield { token: IntentScopeFilter.getOutOfScopeResponse(), isPolicyWarning: true };
      return;
    } else if (scope === ScopeFilterResult.UnauthorizedAction) {
      yield { token: IntentScopeFilter.getUnauthorizedActionResponse(), isPolicyWarning: true };
      return;
    }

    // 3. Check if local LLM is loaded
    const activeModel = this.localLLM.getActiveModel();
    if (!activeModel || this.localLLM.getState() !== 'ready') {
      yield {
        token:
          '⚠️ **No Local Model Loaded**: Please open the Offline Model Manager to load an on-device GGUF model (such as Gemma 4 E2B IT or Qwen 0.5B). All AI inference executes 100% locally on your device.',
        isPolicyWarning: true,
      };
      return;
    }

    // 4. Retrieve Structured Case-Scoped Context
    let contextStr = '';
    if (explicitContext) {
      contextStr = this.formatContextPayload(explicitContext);
    } else {
      const structured = await this.memoryService.retrieveStructuredContext(userPrompt, activeCaseId);
      contextStr = this.formatStructuredContext(structured);

      // Pre-check for medication safety if query mentions medications
      const medCheck = MedicationSafetyChecker.checkSafety(
        structured.matchedMedicines,
        structured.matchedAllergies
      );
      if (medCheck.hasSevereInteraction) {
        yield {
          token: `⚠️ **Medication Safety Alert**: Potential critical interaction detected between active medications (${medCheck.warnings.join('; ')}). Please verify with your doctor.\n\n`,
          isSafetyWarning: true,
        };
      }
    }

    // 5. Construct Clinical Prompt according to Model Profile Template
    const formattedPrompt = this.buildClinicalPrompt(
      userPrompt,
      contextStr,
      activeModel.systemPromptTemplate,
      activeModel.modelId
    );

    // 6. Execute Real Streaming Inference via llama.rn / llama.cpp
    const stream = this.localLLM.generateStream(formattedPrompt, {
      maxTokens: 512,
      temperature: 0.6,
      stopTokens: activeModel.stopTokens,
    });

    let generatedAccumulator = '';
    for await (const token of stream) {
      generatedAccumulator += token;
      yield { token };
    }

    // 7. Post-Inference Validation: Sanitize hallucinated prescriptions or doctor overrides
    const postWarning = this.validatePostInference(generatedAccumulator);
    if (postWarning) {
      yield { token: `\n\n${postWarning}`, isPolicyWarning: true };
    }
  }

  /**
   * Builds prompt with patient's personal health context and active case isolation
   */
  private buildClinicalPrompt(
    userPrompt: string,
    contextStr: string,
    template?: string,
    modelId?: string
  ): string {
    const fullUserQuery = `${contextStr}User Question: ${userPrompt}`;

    if (template) {
      return template.replace('{prompt}', fullUserQuery);
    }

    return fullUserQuery;
  }

  private formatStructuredContext(structured: any): string {
    const caseHeader = structured.activeCase
      ? `[ACTIVE CASE FILE: ${structured.activeCase.title}]\n` +
        `- Doctor: ${structured.activeCase.doctorName} (${structured.activeCase.hospitalName})\n` +
        `- Specialty: ${structured.activeCase.specialty || 'General Practice'}\n` +
        `- Status: ${structured.activeCase.status} | Follow-up: ${structured.activeCase.followUpDate || 'Not scheduled'}\n` +
        `- Diet Guidance: ${structured.activeCase.dietGuidance || 'Standard balanced diet'}\n` +
        `- Doctor Instructions:\n${
          structured.activeCase.doctorInstructions?.length > 0
            ? structured.activeCase.doctorInstructions.map((i: string) => `  * ${i}`).join('\n')
            : '  * Follow prescribed routine'
        }\n`
      : '[GENERAL HEALTH RECORD]\n';

    const meds =
      structured.matchedMedicines?.length > 0
        ? structured.matchedMedicines
            .map((m: any) => `  * ${m.name} (${m.dosage}, ${m.frequency}) - Instructions: ${m.instructions || 'As directed'}`)
            .join('\n')
        : '  * None documented';

    const allergies =
      structured.matchedAllergies?.length > 0
        ? structured.matchedAllergies
            .map((a: any) => `  * ${a.allergen} (Severity: ${a.severity}, Reaction: ${a.reaction})`)
            .join('\n')
        : '  * No known drug allergies';

    const conditions =
      structured.matchedConditions?.length > 0
        ? structured.matchedConditions.map((c: any) => `  * ${c.name} (${c.status})`).join('\n')
        : '  * None documented';

    return (
      `\n${caseHeader}` +
      `[PATIENT CLINICAL CONTEXT]\n` +
      `- Active Conditions:\n${conditions}\n` +
      `- Active Prescriptions / Medications:\n${meds}\n` +
      `- Documented Drug Allergies:\n${allergies}\n` +
      `[END CONTEXT]\n\n`
    );
  }

  private formatContextPayload(context: HealthContextPayload): string {
    const activeMeds = context.activeMedicines.map((m) => `${m.name} (${m.dosage}, ${m.frequency})`).join('; ');
    const conditions = context.conditions.map((c) => c.name).join(', ');
    const allergies = context.allergies.map((a) => `${a.allergen} (${a.reaction})`).join(', ');

    return (
      `\n[PATIENT HEALTH RECORD]\n` +
      `- Patient: ${context.patient.name}\n` +
      `- Active Case: ${context.activeCase?.title || 'General'}\n` +
      `- Active Conditions: ${conditions || 'None'}\n` +
      `- Active Medications: ${activeMeds || 'None'}\n` +
      `- Known Allergies: ${allergies || 'None'}\n` +
      `[END RECORD]\n\n`
    );
  }

  /**
   * Post-inference safety validator
   */
  private validatePostInference(text: string): string | null {
    const lower = text.toLowerCase();

    // Check if model claims to prescribe or alter dosages
    if (
      lower.includes('i prescribe') ||
      lower.includes('i am prescribing') ||
      lower.includes('stop taking your doctor')
    ) {
      return '⚠️ **Clinical Notice**: All medication schedules and prescriptions are managed strictly by your attending physician. Do not alter dosages without professional medical consultation.';
    }

    return null;
  }

  /**
   * Extract action intent from user statement (e.g. logging pain & sleep)
   */
  public extractCheckInAction(input: string): StructuredChatAction | null {
    const lower = input.toLowerCase();

    const painMatch = lower.match(/pain\s*(?:is|level|score|of)?\s*(\d{1,2})/);
    const sleepMatch =
      lower.match(/slept\s*(?:for)?\s*(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)?/) ||
      lower.match(/(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)\s*(?:of)?\s*sleep/);

    const pain = painMatch ? parseInt(painMatch[1], 10) : null;
    const sleep = sleepMatch ? parseFloat(sleepMatch[1]) : null;

    if (pain !== null || sleep !== null) {
      return {
        type: 'log_checkin',
        payload: `pain=${pain ?? 3}&sleep=${sleep ?? 7.0}`,
      };
    }

    if (lower.includes('prescription') || lower.includes('scan report') || lower.includes('discharge summary')) {
      return {
        type: 'scan_doc',
        payload: 'category=prescription',
      };
    }

    if (lower.includes('what can i eat') || lower.includes('diet') || lower.includes('food guidance')) {
      return {
        type: 'open_food_guidance',
        payload: 'context=active',
      };
    }

    return null;
  }

  public async stopGeneration(): Promise<void> {
    await this.localLLM.stopGeneration();
  }
}
