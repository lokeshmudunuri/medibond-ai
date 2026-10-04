import { EmergencySafetyEngine } from '../safety/EmergencySafetyEngine';
import { IntentScopeFilter } from '../safety/IntentScopeFilter';
import { MedicationSafetyChecker } from '../safety/MedicationSafetyChecker';
import { ScopeFilterResult } from '../types/chat';
import { LocalLLMEngine } from './LocalLLMEngine';
import { ModelRouter } from './ModelRouter';
import { HealthMemoryService } from '../services/HealthMemoryService';
import { VoiceLanguage } from '../types/voice';

export interface AIReasoningChunk {
  token: string;
  isEmergencyAlert?: boolean;
  isPolicyWarning?: boolean;
  isSafetyWarning?: boolean;
  sentenceComplete?: boolean;
  completedSentence?: string;
}

export interface AIReasoningOptions {
  language?: VoiceLanguage;
  maxTokens?: number;
  temperature?: number;
  streamingSentenceCallback?: (sentence: string) => void;
}

export class AIOrchestrator {
  private static instance: AIOrchestrator;
  private localLLM = LocalLLMEngine.getInstance();
  private modelRouter = ModelRouter.getInstance();
  private memoryService = HealthMemoryService.getInstance();

  private constructor() {}

  public static getInstance(): AIOrchestrator {
    if (!AIOrchestrator.instance) {
      AIOrchestrator.instance = new AIOrchestrator();
    }
    return AIOrchestrator.instance;
  }

  /**
   * Unified clinical medical reasoning pipeline for both Text Chat and Voice Agent
   */
  public async *streamReasoning(
    userQuery: string,
    activeCaseId?: string,
    options?: AIReasoningOptions
  ): AsyncGenerator<AIReasoningChunk, void, void> {
    const trimmed = userQuery.trim();
    if (!trimmed) return;

    // 1. DETERMINISTIC EMERGENCY SAFETY GATEKEEPER
    const emergency = EmergencySafetyEngine.evaluateRedFlags(trimmed);
    if (emergency.isEmergency) {
      const alertMessage =
        `🚨 **EMERGENCY MEDICAL ALERT: ${emergency.title}**\n\n` +
        `**Clinical Rationale:** ${emergency.rationale}\n\n` +
        `**Immediate Action Required:**\n${emergency.immediateAction}\n\n` +
        `📞 **Emergency Contact:** Dial ${emergency.emergencyNumber} immediately.`;

      yield {
        token: alertMessage,
        isEmergencyAlert: true,
        sentenceComplete: true,
        completedSentence: alertMessage,
      };
      if (options?.streamingSentenceCallback) {
        options.streamingSentenceCallback(alertMessage);
      }
      return;
    }

    // 2. APPLICATION-LEVEL INTENT & MEDICAL SCOPE GATEKEEPER
    const scope = IntentScopeFilter.evaluatePrompt(trimmed);
    if (scope === ScopeFilterResult.OutOfScope) {
      const outOfScopeMsg = IntentScopeFilter.getOutOfScopeResponse();
      yield { token: outOfScopeMsg, isPolicyWarning: true, sentenceComplete: true, completedSentence: outOfScopeMsg };
      if (options?.streamingSentenceCallback) {
        options.streamingSentenceCallback(outOfScopeMsg);
      }
      return;
    } else if (scope === ScopeFilterResult.UnauthorizedAction) {
      const unauthMsg = IntentScopeFilter.getUnauthorizedActionResponse();
      yield { token: unauthMsg, isPolicyWarning: true, sentenceComplete: true, completedSentence: unauthMsg };
      if (options?.streamingSentenceCallback) {
        options.streamingSentenceCallback(unauthMsg);
      }
      return;
    }

    // 3. DIET GUIDANCE QUESTION HANDLER ("Can I eat biryani?")
    const lower = trimmed.toLowerCase();
    if (
      lower.includes('can i eat') ||
      lower.includes('what can i eat') ||
      lower.includes('diet guidance') ||
      lower.includes('food guidance') ||
      lower.includes('biryani')
    ) {
      const diet = this.memoryService.getDietGuidance(activeCaseId);
      if (!diet.hasSpecificGuidance) {
        const uncertaintyMsg =
          "I don't have enough information in this case to give you a reliable personalized answer. Please check with your doctor or dietitian.";
        yield { token: uncertaintyMsg, sentenceComplete: true, completedSentence: uncertaintyMsg };
        if (options?.streamingSentenceCallback) {
          options.streamingSentenceCallback(uncertaintyMsg);
        }
        return;
      }
    }

    // 4. RETRIEVE STRUCTURED CASE CONTEXT & HEALTH MEMORY
    const structuredContext = await this.memoryService.retrieveStructuredContext(trimmed, activeCaseId);
    const contextString = this.formatContextForClinicalPrompt(structuredContext, activeCaseId);

    // 5. MEDICATION SAFETY & DRUG-ALLERGY PRE-CHECK
    const medCheck = MedicationSafetyChecker.checkSafety(
      structuredContext.matchedMedicines,
      structuredContext.matchedAllergies
    );
    if (medCheck.hasSevereInteraction) {
      const warningMsg = `⚠️ **Medication Safety Alert**: Potential critical interaction detected (${medCheck.warnings.join('; ')}).\n\n`;
      yield { token: warningMsg, isSafetyWarning: true };
    }

    // 6. MODEL ROUTER SELECTION (MedGemma vs Qwen fallback)
    const activeModel = this.localLLM.getActiveModel();
    if (!activeModel || this.localLLM.getState() !== 'ready') {
      const noModelMsg =
        '⚠️ **No Local Model Loaded**: Please open the Offline Model Manager to load an on-device GGUF model (such as MedGemma 4B or Qwen 0.5B). All AI inference executes 100% locally on your device.';
      yield { token: noModelMsg, isPolicyWarning: true, sentenceComplete: true, completedSentence: noModelMsg };
      return;
    }

    // 7. CONSTRUCT GROUNDED CLINICAL PROMPT
    const lang = options?.language || 'en';
    const langDirective =
      lang === 'te'
        ? 'Please answer in Telugu.'
        : lang === 'hi'
        ? 'Please answer in Hindi.'
        : lang === 'kn'
        ? 'Please answer in Kannada.'
        : 'Please answer in English.';

    const promptWithContext =
      `${contextString}\n` +
      `[CLINICAL INSTRUCTIONS]: Provide an empathetic, concise, and clinically grounded response in 1-4 sentences. ${langDirective}\n` +
      `Distinguish clearly between [DOCUMENTED FACT], [GENERAL MEDICAL INFORMATION], and [REQUIRES CLINICIAN REVIEW]. Do not modify dosages or prescribe new drugs.\n\n` +
      `Patient Question: ${trimmed}`;

    const formattedPrompt = activeModel.systemPromptTemplate
      ? activeModel.systemPromptTemplate.replace('{prompt}', promptWithContext)
      : promptWithContext;

    // 8. STREAM INFERENCE WITH REAL-TIME SENTENCE BUFFERING
    const stream = this.localLLM.generateStream(formattedPrompt, {
      maxTokens: options?.maxTokens || 512,
      temperature: options?.temperature || (activeModel.modelId.includes('medgemma') ? 0.4 : 0.6),
      stopTokens: activeModel.stopTokens,
    });

    let sentenceBuffer = '';
    let fullAccumulator = '';

    for await (const token of stream) {
      fullAccumulator += token;
      sentenceBuffer += token;

      // Check for sentence boundaries (. ! ? \n)
      const sentenceEndMatch = sentenceBuffer.match(/([.!?\n]+)\s*$/);
      if (sentenceEndMatch && sentenceBuffer.trim().length > 15) {
        const sentenceToEmit = sentenceBuffer.trim();
        sentenceBuffer = '';
        yield {
          token,
          sentenceComplete: true,
          completedSentence: sentenceToEmit,
        };
        if (options?.streamingSentenceCallback) {
          options.streamingSentenceCallback(sentenceToEmit);
        }
      } else {
        yield { token, sentenceComplete: false };
      }
    }

    // Flush remaining buffer
    if (sentenceBuffer.trim().length > 0) {
      const remainingSentence = sentenceBuffer.trim();
      yield {
        token: '',
        sentenceComplete: true,
        completedSentence: remainingSentence,
      };
      if (options?.streamingSentenceCallback) {
        options.streamingSentenceCallback(remainingSentence);
      }
    }

    // 9. POST-INFERENCE VALIDATION: SANITIZE HALLUCINATIONS
    const postWarning = this.validatePostInference(fullAccumulator);
    if (postWarning) {
      yield { token: `\n\n${postWarning}`, isPolicyWarning: true };
    }
  }

  private formatContextForClinicalPrompt(structured: any, activeCaseId?: string): string {
    const caseHeader = structured.activeCase
      ? `[ACTIVE CASE FILE: ${structured.activeCase.title}]\n` +
        `- Attending Doctor: ${structured.activeCase.doctorName} (${structured.activeCase.hospitalName})\n` +
        `- Specialty: ${structured.activeCase.specialty || 'General Care'}\n` +
        `- Case Status: ${structured.activeCase.status}\n` +
        `- Follow-up Date: ${structured.activeCase.followUpDate || 'Not scheduled'}\n` +
        `- Diet Guidance: ${structured.activeCase.dietGuidance || 'Standard balanced nutrition'}\n` +
        `- Doctor Instructions:\n${
          structured.activeCase.doctorInstructions?.length > 0
            ? structured.activeCase.doctorInstructions.map((i: string) => `  * ${i}`).join('\n')
            : '  * None documented'
        }\n`
      : '[GENERAL HEALTH RECORD SCOPE]\n';

    const meds =
      structured.matchedMedicines?.length > 0
        ? structured.matchedMedicines
            .map((m: any) => `  * ${m.name} (${m.dosage}, ${m.frequency}) - Status: ${m.confirmationStatus || 'Documented'}`)
            .join('\n')
        : '  * None documented';

    const allergies =
      structured.matchedAllergies?.length > 0
        ? structured.matchedAllergies
            .map((a: any) => `  * ${a.allergen} (${a.severity})`)
            .join('\n')
        : '  * No known drug allergies';

    const conditions =
      structured.matchedConditions?.length > 0
        ? structured.matchedConditions.map((c: any) => `  * ${c.name} (${c.status})`).join('\n')
        : '  * None documented';

    const reports =
      structured.matchedReports?.length > 0
        ? structured.matchedReports
            .map((r: any) => `  * ${r.title} (${r.testDate}): ${r.summary}`)
            .join('\n')
        : '  * None in scope';

    return (
      `${caseHeader}` +
      `[PATIENT CLINICAL CONTEXT]\n` +
      `- Active Conditions:\n${conditions}\n` +
      `- Prescribed Medications:\n${meds}\n` +
      `- Documented Drug Allergies:\n${allergies}\n` +
      `- Diagnostic Reports & Documents:\n${reports}\n` +
      `[END CONTEXT]\n`
    );
  }

  private validatePostInference(text: string): string | null {
    const lower = text.toLowerCase();
    if (
      lower.includes('i prescribe') ||
      lower.includes('i am prescribing') ||
      lower.includes('change your dose to') ||
      lower.includes('stop taking your doctor')
    ) {
      return '⚠️ **Clinical Notice**: All medication schedules are managed strictly by your attending physician. Do not adjust dosages without direct clinician guidance.';
    }
    return null;
  }

  public async stopGeneration(): Promise<void> {
    await this.localLLM.stopGeneration();
  }
}
