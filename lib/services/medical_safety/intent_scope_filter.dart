enum ScopeFilterResult {
  allowed,
  outOfScope,
  unauthorizedAction,
}

class IntentScopeFilter {
  static final List<String> _prohibitedPrescriptionPhrases = [
    'prescribe me',
    'give me a prescription',
    'change my dosage',
    'increase my dose',
    'decrease my dose',
    'stop taking all meds',
    'diagnose me definitely',
  ];

  static final List<String> _outOfScopeKeywords = [
    'python',
    'javascript',
    'code snippet',
    'stock market',
    'crypto',
    'write essay',
    'recipe for cake',
    'movie review',
    'weather forecast',
    'video game',
  ];

  static ScopeFilterResult evaluatePrompt(String input) {
    final lower = input.toLowerCase().trim();

    if (lower.isEmpty) return ScopeFilterResult.allowed;

    // Check unauthorized action (prescribing/changing dose)
    for (var phrase in _prohibitedPrescriptionPhrases) {
      if (lower.contains(phrase)) {
        return ScopeFilterResult.unauthorizedAction;
      }
    }

    // Check non-medical out-of-scope topics
    for (var word in _outOfScopeKeywords) {
      if (lower.contains(word)) {
        return ScopeFilterResult.outOfScope;
      }
    }

    return ScopeFilterResult.allowed;
  }

  static String getOutOfScopeResponse() {
    return 'I am CareBond AI, your personal health and recovery companion. I am specialized only in health guidance, medication safety, recovery monitoring, and medical record explanations. I cannot assist with non-health topics.';
  }

  static String getUnauthorizedActionResponse() {
    return 'CareBond AI cannot prescribe medications, adjust drug dosages, or override your physician\'s instructions. Any modifications to your prescription must be evaluated and approved directly by your treating doctor or healthcare provider.';
  }
}
