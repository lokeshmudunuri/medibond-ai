import { EmergencySafetyEngine } from '../safety/EmergencySafetyEngine';
import { IntentScopeFilter } from '../safety/IntentScopeFilter';
import { ScopeFilterResult } from '../types/chat';
import { LocalLLMEngine } from './LocalLLMEngine';
import { PatientProfile, ConditionEntity, AllergyEntity, MedicineEntity, RecoveryPlanEntity } from '../types';

export interface HealthContextPayload {
  patient: PatientProfile;
  conditions: ConditionEntity[];
  allergies: AllergyEntity[];
  activeMedicines: MedicineEntity[];
  recoveryPlan?: RecoveryPlanEntity | null;
}

export interface StreamResponseChunk {
  token: string;
  isEmergencyAlert?: boolean;
  isPolicyWarning?: boolean;
}

export interface StructuredChatAction {
  type: 'log_checkin' | 'scan_doc' | 'open_food_guidance';
  payload: string;
}

export class AIEngine {
  private static instance: AIEngine;
  private localLLM: LocalLLMEngine;

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
   * Main entry point for streaming medical chat with safety pre-filters
   */
  public async *streamChat(
    userPrompt: string,
    context?: HealthContextPayload
  ): AsyncGenerator<StreamResponseChunk, void, void> {
    // 1. Mandatory Deterministic Emergency Red Flag Check
    const emergency = EmergencySafetyEngine.evaluateRedFlags(userPrompt);
    if (emergency.isEmergency) {
      const alertMessage =
        `🚨 **EMERGENCY SAFETY ALERT: ${emergency.title}**\n\n` +
        `**Clinical Rationale:** ${emergency.rationale}\n\n` +
        `**Immediate Action Required:**\n${emergency.immediateAction}\n\n` +
        `📞 Emergency Services: ${emergency.emergencyNumber}`;

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
          '⚠️ **No Local Model Loaded**: Please open the Model Manager in Settings to select and load a local GGUF model (such as Qwen 2.5 0.5B or TinyLlama 1.1B). All AI inference executes 100% locally on device.',
        isPolicyWarning: true,
      };
      return;
    }

    // 4. Construct Formatted Health Prompt
    const formattedPrompt = this.buildClinicalPrompt(userPrompt, context, activeModel.systemPromptTemplate);

    // 5. Execute Real Streaming Inference via llama.rn
    const stream = this.localLLM.generateStream(formattedPrompt, {
      maxTokens: 512,
      temperature: 0.6,
      stopTokens: activeModel.stopTokens,
    });

    for await (const token of stream) {
      yield { token };
    }
  }

  /**
   * Constructs prompt with patient's personal health context
   */
  private buildClinicalPrompt(
    userPrompt: string,
    context?: HealthContextPayload,
    template?: string
  ): string {
    let contextStr = '';
    if (context) {
      const activeMeds = context.activeMedicines.map(m => `${m.name} (${m.dosage}, ${m.frequency})`).join('; ');
      const conditions = context.conditions.map(c => c.name).join(', ');
      const allergies = context.allergies.map(a => `${a.allergen} (${a.reaction})`).join(', ');
      const recovery = context.recoveryPlan
        ? `Active Protocol: ${context.recoveryPlan.procedureName} (Phase: ${context.recoveryPlan.currentPhase})`
        : 'None';

      contextStr =
        `\n[PATIENT HEALTH RECORD]\n` +
        `- Patient: ${context.patient.name}, Age: ${context.patient.age}\n` +
        `- Active Conditions: ${conditions || 'None'}\n` +
        `- Active Medications: ${activeMeds || 'None'}\n` +
        `- Known Allergies: ${allergies || 'None'}\n` +
        `- Recovery Plan: ${recovery}\n[END RECORD]\n\n`;
    }

    const fullUserQuery = `${contextStr}User Question: ${userPrompt}`;

    if (template) {
      return template.replace('{prompt}', fullUserQuery);
    }

    return fullUserQuery;
  }

  /**
   * Extract action intent from user statement (e.g. logging pain & sleep)
   */
  public extractCheckInAction(input: string): StructuredChatAction | null {
    const lower = input.toLowerCase();

    // Check pain: "pain is 7", "pain 7", "pain: 7"
    const painMatch = lower.match(/pain\s*(?:is|level|score|of)?\s*(\d{1,2})/);
    // Check sleep: "slept for 4 hours", "4h sleep", "sleep 5.5"
    const sleepMatch = lower.match(/slept\s*(?:for)?\s*(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)?/) ||
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
