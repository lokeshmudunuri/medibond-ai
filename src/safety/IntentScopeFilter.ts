import { ScopeFilterResult } from '../types/chat';

export class IntentScopeFilter {
  private static readonly OUT_OF_SCOPE_KEYWORDS = [
    'write python code',
    'write javascript',
    'nginx',
    'reverse proxy',
    'web server',
    'crypto price',
    'stock market forecast',
    'who won the world cup',
    'write an essay on',
    'solve this math equation',
    'politics',
    'recipe for pasta',
  ];

  private static readonly UNAUTHORIZED_ACTIONS = [
    'how to perform surgery at home',
    'how to inject intravenous',
    'change my prescription dosage without doctor',
    'stop taking all medications immediately',
    'how to overdose',
    'how to make illegal drugs',
  ];

  public static evaluatePrompt(prompt: string): ScopeFilterResult {
    const lower = prompt.toLowerCase().trim();

    for (const action of this.UNAUTHORIZED_ACTIONS) {
      if (lower.includes(action)) {
        return ScopeFilterResult.UnauthorizedAction;
      }
    }

    for (const keyword of this.OUT_OF_SCOPE_KEYWORDS) {
      if (lower.includes(keyword)) {
        return ScopeFilterResult.OutOfScope;
      }
    }

    return ScopeFilterResult.InScope;
  }

  public static getOutOfScopeResponse(): string {
    return 'I am CareBond AI, your specialized on-device clinical and recovery health assistant. I can only assist with your personal health records, medications, recovery protocols, and doctor instructions. Please ask a health-related question.';
  }

  public static getUnauthorizedActionResponse(): string {
    return '🚨 **SAFETY POLICY RESTRICTION**: CareBond AI cannot provide instructions for invasive procedures, medication adjustments outside prescribed ranges, or unverified home surgical actions. Please contact your treating clinician or hospital team directly.';
  }
}
