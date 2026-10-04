import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:carewatch_ai_recovery_watch/core/config/device_profile.dart';
import 'package:carewatch_ai_recovery_watch/core/resources/resource_manager.dart';
import 'package:carewatch_ai_recovery_watch/core/resources/storage_paths.dart';
import 'package:carewatch_ai_recovery_watch/models/allergy.dart';
import 'package:carewatch_ai_recovery_watch/models/check_in.dart';
import 'package:carewatch_ai_recovery_watch/models/condition.dart';
import 'package:carewatch_ai_recovery_watch/models/medicine.dart';
import 'package:carewatch_ai_recovery_watch/models/personal_baseline.dart';
import 'package:carewatch_ai_recovery_watch/models/provenance.dart';
import 'package:carewatch_ai_recovery_watch/models/recovery_plan.dart';
import 'package:carewatch_ai_recovery_watch/services/doctor_handoff/doctor_handoff_engine.dart';
import 'package:carewatch_ai_recovery_watch/services/health_memory/health_memory_service.dart';
import 'package:carewatch_ai_recovery_watch/services/medical_reasoning/medical_reasoning_engine.dart';
import 'package:carewatch_ai_recovery_watch/services/medical_safety/emergency_safety_engine.dart';
import 'package:carewatch_ai_recovery_watch/services/medical_safety/intent_scope_filter.dart';
import 'package:carewatch_ai_recovery_watch/services/medical_safety/medication_safety_checker.dart';
import 'package:carewatch_ai_recovery_watch/services/recovery/baseline_calculator.dart';
import 'package:carewatch_ai_recovery_watch/services/sensors/sensor_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});
  SensorService.disableTimerForTesting = true;

  group('CareBond AI Core App & Health Memory Tests', () {
    test('Storage and Health Memory initialization', () async {
      await StoragePaths.initialize();
      final memory = HealthMemoryService();
      await memory.initialize();

      final cond = ConditionEntity(
        id: 'test_cond_1',
        name: 'Essential Hypertension',
        diagnosedDate: DateTime.now(),
        provenance: Provenance.documented(documentName: 'Cardiology Note', confidence: 0.99),
      );

      await memory.addCondition(cond);
      final list = await memory.getConditions();
      expect(list.any((c) => c.name.contains('Hypertension')), isTrue);
    });

    test('Allergy contraindication checking', () async {
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
    });

    test('Intent & Medical Scope filter', () {
      expect(IntentScopeFilter.evaluatePrompt('Write Python code'), equals(ScopeFilterResult.outOfScope));
      expect(IntentScopeFilter.evaluatePrompt('What is Telmisartan?'), equals(ScopeFilterResult.allowed));
      expect(IntentScopeFilter.evaluatePrompt('Prescribe me Amoxicillin'), equals(ScopeFilterResult.unauthorizedAction));
    });

    test('Deterministic Emergency red-flag detection', () {
      final eval = EmergencySafetyEngine.evaluateRedFlags('Crushing chest pain radiating to left arm');
      expect(eval.isEmergency, isTrue);
      expect(eval.status, equals(EmergencyStatus.criticalEmergency));
    });

    test('EWMA and CUSUM baseline persistence detection', () {
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

      var current = baseline;
      bool tripped = false;
      for (int i = 0; i < 7; i++) {
        final res = BaselineCalculator.updateBaselineWithNewSample(
          existingBaseline: current,
          newSampleValue: 0.35,
        );
        current = res.updatedBaseline;
        if (res.isPersistentDeviation) {
          tripped = true;
          break;
        }
      }
      expect(tripped, isTrue);
    });

    test('Doctor handoff clinical dossier generation', () async {
      final handoff = DoctorHandoffEngine();
      final report = await handoff.generateSummary(type: DoctorSummaryType.generalDoctor);

      expect(report.title.isNotEmpty, isTrue);
      expect(report.patientHeader.contains('PATIENT:'), isTrue);
      expect(report.toFormattedPlainText().contains('CAREBOND AI'), isTrue);
    });

    test('Offline Medical Reasoning with personal health context', () async {
      final engine = MedicalReasoningEngine();
      final res = await engine.processQuery(query: 'What is Telmisartan 40mg for?');

      expect(res.responseText.isNotEmpty, isTrue);
      expect(res.responseText.contains('Telmisartan'), isTrue);
      expect(res.isEmergencyTriggered, isFalse);
    });

    test('Offline Resource Manager model discovery and registration', () async {
      final resourceManager = ResourceManager();
      await resourceManager.initialize();
      expect(resourceManager.models.isNotEmpty, isTrue);
      expect(resourceManager.models.length, greaterThanOrEqualTo(10));
    });

    test('Recovery Protocol and Daily Check-in logging', () async {
      final memory = HealthMemoryService();
      final plan = RecoveryPlanEntity(
        id: 'plan_test_1',
        title: 'Knee Arthroscopy Recovery',
        procedureName: 'Left Knee Arthroscopy',
        startDate: DateTime.now(),
        targetDurationDays: 21,
        provenance: Provenance.documented(documentName: 'Surgical Notes'),
      );
      await memory.saveRecoveryPlan(plan);
      final active = await memory.getActiveRecoveryPlan();
      expect(active?.procedureName, equals('Left Knee Arthroscopy'));

      final checkIn = DailyCheckInEntity(
        id: 'chk_1',
        checkInDate: DateTime.now(),
        painScore: 3,
        fatigueScore: 2,
        moodScore: 4,
        sleepHours: 8.0,
        tookAllMedications: true,
        reportedSymptoms: 'Mild stiffness',
        adaptiveFollowUpAnswer: 'Walking 20 minutes with brace',
        provenance: Provenance.userReported(),
      );
      await memory.logCheckIn(checkIn);
      final recent = await memory.getRecentCheckIns(limit: 5);
      expect(recent.any((c) => c.id == 'chk_1'), isTrue);
    });

    test('Device Profile Scanner and Calibration', () async {
      await DeviceCapabilityScanner.saveProfile(DeviceProfile.essential4GB);
      final profile = await DeviceCapabilityScanner.getSavedProfile();
      expect(profile, equals(DeviceProfile.essential4GB));

      final desc = DeviceCapabilityScanner.getProfileDescription(DeviceProfile.essential4GB);
      expect(desc.contains('4GB'), isTrue);
    });

    test('Clean Profile reset vs Sample Patient evaluation mode', () async {
      final memory = HealthMemoryService();
      await memory.clearSampleDataForFreshProfile();
      final conditions = await memory.getConditions();
      expect(conditions.isEmpty, isTrue);

      await memory.seedSampleData();
      final restoredConditions = await memory.getConditions();
      expect(restoredConditions.isNotEmpty, isTrue);
    });
  });
}
