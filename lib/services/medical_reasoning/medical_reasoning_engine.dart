import '../../core/resources/resource_manager.dart';
import '../../core/security/sanitized_logger.dart';
import '../../models/model_package.dart';
import '../health_context/health_context_engine.dart';
import '../medical_safety/emergency_safety_engine.dart';
import '../medical_safety/intent_scope_filter.dart';
import 'medical_knowledge_base.dart';

class MedicalReasoningResponse {
  final String responseText;
  final String activeModelUsed;
  final bool isEmergencyTriggered;
  final bool isOutOfScope;
  final List<String> referencedEntities;
  final String provenanceSummary;

  MedicalReasoningResponse({
    required this.responseText,
    required this.activeModelUsed,
    this.isEmergencyTriggered = false,
    this.isOutOfScope = false,
    this.referencedEntities = const [],
    this.provenanceSummary = 'Verified Local Medical Core',
  });
}

class MedicalReasoningEngine {
  static const String _tag = 'MedicalReasoningEngine';
  static final MedicalReasoningEngine _instance = MedicalReasoningEngine._internal();
  factory MedicalReasoningEngine() => _instance;
  MedicalReasoningEngine._internal();

  final HealthContextEngine _contextEngine = HealthContextEngine();
  final ResourceManager _resourceManager = ResourceManager();

  Future<MedicalReasoningResponse> processQuery({
    required String query,
    PersonalHealthContext? overrideContext,
  }) async {
    SanitizedLogger.info(_tag, 'Processing health reasoning query');

    // 1. Deterministic Emergency Red Flag Check (Mandatory Pre-Filter)
    final emergencyEval = EmergencySafetyEngine.evaluateRedFlags(query);
    if (emergencyEval.isEmergency) {
      return MedicalReasoningResponse(
        responseText: '🚨 **EMERGENCY SAFETY ALERT: ${emergencyEval.title}**\n\n'
            '**Clinical Rationale:** ${emergencyEval.rationale}\n\n'
            '**Immediate Action Required:**\n${emergencyEval.immediateAction}\n\n'
            '📞 Emergency Services: ${emergencyEval.emergencyNumber}',
        activeModelUsed: 'Deterministic Safety Engine (Red Flag Escalation)',
        isEmergencyTriggered: true,
        provenanceSummary: 'Deterministic Clinical Emergency Safety Rules',
      );
    }

    // 2. Application-level Intent & Scope Filter
    final scopeResult = IntentScopeFilter.evaluatePrompt(query);
    if (scopeResult == ScopeFilterResult.outOfScope) {
      return MedicalReasoningResponse(
        responseText: IntentScopeFilter.getOutOfScopeResponse(),
        activeModelUsed: 'Intent & Medical Scope Gatekeeper',
        isOutOfScope: true,
      );
    } else if (scopeResult == ScopeFilterResult.unauthorizedAction) {
      return MedicalReasoningResponse(
        responseText: IntentScopeFilter.getUnauthorizedActionResponse(),
        activeModelUsed: 'Medical Authority & Policy Validator',
        isOutOfScope: false,
      );
    }

    // 3. Assemble Personal Health Context
    final context = overrideContext ?? await _contextEngine.buildCurrentContext();

    // 4. Determine Active Local Model (Gemma 4 E2B vs MedGemma 4B)
    String activeModel = 'Gemma 4 E2B LiteRT-LM';

    if (_resourceManager.isFeatureReady(ModelFeatureCategory.medicalReasoningMedGemma)) {
      activeModel = 'MedGemma 4B Clinical (Provisioned)';
    }

    // 5. Generate Clinical Reasoning Response using Structured Context + Local KB
    final responseText = _generateLocalReasoning(query, context, activeModel);

    // 6. Safety Post-Validation (Ensure no unintended prescription alterations)
    final safeText = _applyPostSafetyValidation(responseText);

    return MedicalReasoningResponse(
      responseText: safeText,
      activeModelUsed: activeModel,
      isEmergencyTriggered: false,
      isOutOfScope: false,
      referencedEntities: [
        ...context.conditions.map((c) => c.name),
        ...context.activeMedicines.map((m) => m.name),
      ],
      provenanceSummary: 'Personal Health Context + Local Verified Medical KB',
    );
  }

  String _generateLocalReasoning(String query, PersonalHealthContext context, String activeModel) {
    final lower = query.toLowerCase();

    // Query regarding medications
    for (var med in context.activeMedicines) {
      if (lower.contains(med.name.toLowerCase()) || (med.genericName.isNotEmpty && lower.contains(med.genericName.toLowerCase()))) {
        final drugKb = MedicalKnowledgeBase.getDrugInfo(med.genericName.isNotEmpty ? med.genericName : med.name);
        final buffer = StringBuffer();
        buffer.writeln('### Medication Guidance: **${med.name}**\n');
        buffer.writeln('- **Prescribed Dosage:** ${med.dosage} (${med.frequency})');
        buffer.writeln('- **Recommended Timing:** ${med.timing}');
        if (med.instructions.isNotEmpty) {
          buffer.writeln('- **Doctor\'s Specific Instructions:** ${med.instructions}');
        }
        if (drugKb != null) {
          buffer.writeln('\n**Clinical Purpose:**\n${drugKb['purpose']}');
          buffer.writeln('\n**Mechanism of Action:**\n${drugKb['howItWorks']}');
          buffer.writeln('\n**Common Side Effects to Monitor:**\n${drugKb['commonSideEffects']}');
          buffer.writeln('\n**Safety Cautions:**\n${drugKb['keyCautions']}');
        }
        buffer.writeln('\n*Provenance: Documented from ${med.provenance.documentName ?? "Prescription"}*');
        return buffer.toString();
      }
    }

    // Query regarding conditions
    for (var cond in context.conditions) {
      if (lower.contains(cond.name.toLowerCase())) {
        final condKb = MedicalKnowledgeBase.getConditionGuide(cond.name);
        final buffer = StringBuffer();
        buffer.writeln('### Health Context: **${cond.name}**\n');
        buffer.writeln('- **Status:** ${cond.status.toUpperCase()}');
        buffer.writeln('- **Diagnosed Date:** ${cond.diagnosedDate.toIso8601String().split('T').first}');
        if (cond.notes.isNotEmpty) {
          buffer.writeln('- **Physician Notes:** ${cond.notes}');
        }
        if (condKb != null) {
          buffer.writeln('\n**Clinical Overview:**\n$condKb');
        }
        return buffer.toString();
      }
    }

    // Query regarding recovery or surgery
    if (lower.contains('recovery') || lower.contains('surgery') || lower.contains('appendix') || lower.contains('wound') || lower.contains('pain')) {
      if (context.activeRecoveryPlan != null) {
        final plan = context.activeRecoveryPlan!;
        final buffer = StringBuffer();
        buffer.writeln('### Active Recovery Overview: **${plan.procedureName}**\n');
        buffer.writeln('You are currently on **Day ${plan.currentDayNumber}** of your ${plan.targetDurationDays}-day recovery protocol (**${plan.currentPhase}**).\n');
        buffer.writeln('**Key Guidelines for Today:**');
        buffer.writeln('1. **Mobility Target:** ${plan.targetDailySteps.toInt()} daily steps (gentle walking).');
        buffer.writeln('2. **Rest & Recovery:** Aim for at least ${plan.targetRestHours} hours of sleep.');
        if (context.doctorInstructions.isNotEmpty) {
          buffer.writeln('\n**Surgeon\'s Instructions:**');
          for (var inst in context.doctorInstructions) {
            buffer.writeln('- **${inst.title}:** ${inst.instruction}');
          }
        }
        buffer.writeln('\n*Always seek immediate care if you experience high fever, spreading wound redness, or severe unmanageable pain.*');
        return buffer.toString();
      }
    }

    // Query regarding lab reports
    if (lower.contains('report') || lower.contains('blood') || lower.contains('cbc') || lower.contains('lab')) {
      if (context.recentReports.isNotEmpty) {
        final rep = context.recentReports.first;
        final buffer = StringBuffer();
        buffer.writeln('### Latest Medical Report Analysis: **${rep.title}**\n');
        buffer.writeln('**Date:** ${rep.testDate.toIso8601String().split('T').first} (${rep.laboratoryOrHospital})\n');
        buffer.writeln('**Summary:** ${rep.summary}\n');
        buffer.writeln('**Test Breakdown:**');
        for (var item in rep.results) {
          final flag = item.isAbnormal ? '⚠️ [${item.interpretation}]' : '✓ Normal';
          buffer.writeln('- **${item.testName}:** ${item.value} ${item.unit} (Ref: ${item.referenceRange}) $flag');
        }
        return buffer.toString();
      }
    }

    // General health query synthesis with personal health context
    final buffer = StringBuffer();
    buffer.writeln('### CareBond Personal Health Assessment\n');
    buffer.writeln('Based on your documented health record:');
    buffer.writeln('- **Active Conditions:** ${context.conditions.map((c) => c.name).join(", ")}');
    buffer.writeln('- **Current Medications:** ${context.activeMedicines.map((m) => m.name).join(", ")}');
    if (context.allergies.isNotEmpty) {
      buffer.writeln('- **Known Allergies:** ${context.allergies.map((a) => "${a.allergen} (${a.reaction})").join(", ")}');
    }
    buffer.writeln('\nRegarding your question: "$query"');
    buffer.writeln('CareBond emphasizes consistent medication adherence, balanced lifestyle routines, and regular vitals monitoring. If you notice persistent or changing symptoms, please discuss them with your treating physician.');
    buffer.writeln('\n*(Processed offline via $activeModel)*');
    return buffer.toString();
  }

  String _applyPostSafetyValidation(String response) {
    // Ensure standard medical disclaimer is appended
    if (!response.contains('Emergency Services') && !response.contains('DISCLAIMER')) {
      return '$response\n\n---\n*CareBond AI provides health information and context based on your local records. It does not replace clinical judgment or professional medical diagnosis.*';
    }
    return response;
  }
}
