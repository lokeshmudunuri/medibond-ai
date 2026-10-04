import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:carewatch_ai_recovery_watch/models/allergy.dart';
import 'package:carewatch_ai_recovery_watch/models/condition.dart';
import 'package:carewatch_ai_recovery_watch/models/medicine.dart';
import 'package:carewatch_ai_recovery_watch/models/personal_baseline.dart';
import 'package:carewatch_ai_recovery_watch/models/provenance.dart';
import 'package:carewatch_ai_recovery_watch/services/doctor_handoff/doctor_handoff_engine.dart';
import 'package:carewatch_ai_recovery_watch/services/health_memory/health_memory_service.dart';
import 'package:carewatch_ai_recovery_watch/services/medical_reasoning/medical_reasoning_engine.dart';
import 'package:carewatch_ai_recovery_watch/services/medical_safety/emergency_safety_engine.dart';
import 'package:carewatch_ai_recovery_watch/services/medical_safety/intent_scope_filter.dart';
import 'package:carewatch_ai_recovery_watch/services/medical_safety/medication_safety_checker.dart';
import 'package:carewatch_ai_recovery_watch/services/recovery/baseline_calculator.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});

  group('Health Memory & Provenance Tests', () {
    test('Condition storage preserves provenance', () async {
      final memory = HealthMemoryService();
      await memory.initialize();

      final cond = ConditionEntity(
        id: 'test_cond_1',
        name: 'Asthma',
        diagnosedDate: DateTime.now(),
        provenance: Provenance.documented(documentName: 'Pulmonary Note', confidence: 0.99),
      );

      await memory.addCondition(cond);
      final list = await memory.getConditions();
      expect(list.any((c) => c.name == 'Asthma'), isTrue);
      final saved = list.firstWhere((c) => c.name == 'Asthma');
      expect(saved.provenance.source, equals(ProvenanceSource.documented));
      expect(saved.provenance.documentName, equals('Pulmonary Note'));
    });

    test('Allergy storage and contraindication checking', () async {
      final allergy = AllergyEntity(
        id: 'allg_pen',
        allergen: 'Penicillin',
        reaction: 'Anaphylaxis',
        severity: 'Severe',
        identifiedDate: DateTime.now(),
        provenance: Provenance.documented(),
      );

      final candidateMed = MedicineEntity(
        id: 'med_amox',
        name: 'Amoxicillin 500mg',
        genericName: 'Amoxicillin',
        dosage: '500mg',
        frequency: 'TID',
        startDate: DateTime.now(),
        provenance: Provenance.userReported(),
      );

      final flags = MedicationSafetyChecker.evaluateSafety(
        currentMedicines: [],
        documentedAllergies: [allergy],
        newCandidateMedicine: candidateMed,
      );

      expect(flags.isNotEmpty, isTrue);
      expect(flags.first.severity, equals(SafetyFlagSeverity.contraindicated));
      expect(flags.first.title.contains('Allergy Contraindication'), isTrue);
    });
  });

  group('Medical Safety & Scope Engine Tests', () {
    test('Intent scope blocks non-medical prompts', () {
      final res1 = IntentScopeFilter.evaluatePrompt('Write Python code for web scraping');
      expect(res1, equals(ScopeFilterResult.outOfScope));

      final res2 = IntentScopeFilter.evaluatePrompt('What is Telmisartan used for?');
      expect(res2, equals(ScopeFilterResult.allowed));
    });

    test('Intent scope blocks unauthorized prescription actions', () {
      final res = IntentScopeFilter.evaluatePrompt('Prescribe me Amoxicillin 500mg right now');
      expect(res, equals(ScopeFilterResult.unauthorizedAction));
    });

    test('Emergency red flag engine detects cardiac crisis', () {
      final eval = EmergencySafetyEngine.evaluateRedFlags('Patient is having crushing chest pain radiating to left arm');
      expect(eval.isEmergency, isTrue);
      expect(eval.status, equals(EmergencyStatus.criticalEmergency));
      expect(eval.title.contains('Cardiac Emergency'), isTrue);
    });

    test('Emergency red flag engine detects stroke FAST symptoms', () {
      final eval = EmergencySafetyEngine.evaluateRedFlags('Sudden face drooping and arm weakness');
      expect(eval.isEmergency, isTrue);
      expect(eval.title.contains('Stroke'), isTrue);
    });
  });

  group('Recovery Engine & Robust Baseline Tests', () {
    test('EWMA and CUSUM update detects persistent recovery drop', () {
      final baseline = PersonalBaselineEntity(
        id: 'base_mob',
        metricName: 'mobility',
        baselineMean: 1.0,
        stdDevOrMAD: 0.1,
        cusumHigh: 0.0,
        cusumLow: 0.0,
        lastUpdated: DateTime.now(),
        provenance: Provenance.systemDetected(),
      );

      final step1 = BaselineCalculator.updateBaselineWithNewSample(
        existingBaseline: baseline,
        newSampleValue: 0.6,
      );
      expect(step1.currentZScore < -2.0, isTrue);

      var current = step1.updatedBaseline;
      bool tripped = false;
      for (int i = 0; i < 6; i++) {
        final res = BaselineCalculator.updateBaselineWithNewSample(
          existingBaseline: current,
          newSampleValue: 0.4,
        );
        current = res.updatedBaseline;
        if (res.isPersistentDeviation) {
          tripped = true;
          break;
        }
      }
      expect(tripped, isTrue);
    });
  });

  group('Doctor Handoff & Reasoning Tests', () {
    test('Doctor summary generates evidence-based dossier with provenance tags', () async {
      final handoff = DoctorHandoffEngine();
      final report = await handoff.generateSummary(type: DoctorSummaryType.generalDoctor);

      expect(report.title.isNotEmpty, isTrue);
      expect(report.patientHeader.contains('PATIENT:'), isTrue);
      expect(report.activeConditionsSection.contains('[DOC]'), isTrue);
      expect(report.currentMedicationsSection.contains('Telmisartan'), isTrue);
      expect(report.allergiesSection.contains('Penicillin'), isTrue);

      final text = report.toFormattedPlainText();
      expect(text.contains('CAREBOND AI — CLINICAL HANDOFF'), isTrue);
      expect(text.contains('[DOC] = Clinically Documented'), isTrue);
    });

    test('Offline Medical Reasoning Engine executes safely', () async {
      final engine = MedicalReasoningEngine();
      final response = await engine.processQuery(query: 'What is Telmisartan 40mg for?');

      expect(response.responseText.isNotEmpty, isTrue);
      expect(response.responseText.contains('Telmisartan'), isTrue);
      expect(response.isEmergencyTriggered, isFalse);
      expect(response.activeModelUsed.isNotEmpty, isTrue);
    });
  });
}
