import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:carewatch_ai_recovery_watch/core/database/health_database.dart';
import 'package:carewatch_ai_recovery_watch/core/security/sanitized_logger.dart';
import 'package:carewatch_ai_recovery_watch/core/resources/resource_manager.dart';
import 'package:carewatch_ai_recovery_watch/models/medicine.dart';
import 'package:carewatch_ai_recovery_watch/models/provenance.dart';
import 'package:carewatch_ai_recovery_watch/models/alert_entity.dart';
import 'package:carewatch_ai_recovery_watch/services/doctor_handoff/doctor_handoff_engine.dart';
import 'package:carewatch_ai_recovery_watch/services/health_memory/health_memory_service.dart';
import 'package:carewatch_ai_recovery_watch/services/recovery/recovery_engine.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});

  group('Phase 4: Data Isolation & Clean Slate Tests', () {
    test('Seeded Sample Patient contains complete longitudinal timeline', () async {
      final db = HealthDatabase();
      await db.initialize();
      await db.seedDefaultHealthProfile();

      final conditions = await db.getConditions();
      final meds = await db.getMedicines();
      final allergies = await db.getAllergies();
      final reports = await db.getReports();
      final plan = await db.getActiveRecoveryPlan();
      final checkIns = await db.getCheckIns();
      final pgx = await db.getGeneDrugSafetyFlags();

      expect(conditions.length, greaterThanOrEqualTo(2));
      expect(meds.length, greaterThanOrEqualTo(3));
      expect(allergies.length, greaterThanOrEqualTo(1));
      expect(reports.length, greaterThanOrEqualTo(2));
      expect(plan, isNotNull);
      expect(checkIns.length, greaterThanOrEqualTo(3));
      expect(pgx.length, greaterThanOrEqualTo(1));

      // Pharmacogenomic test flag is marked informational / clinician review
      final cypFlag = pgx.first;
      expect(cypFlag.gene, equals('CYP2C19'));
      expect(cypFlag.recommendationLevel.contains('Clinician Review'), isTrue);
    });

    test('Clean Slate mode cleanly isolates from sample patient data', () async {
      final memory = HealthMemoryService();
      await memory.initialize();
      await memory.clearSampleDataForFreshProfile();

      final conditions = await memory.getConditions();
      final meds = await memory.getAllMedicines();
      final allergies = await memory.getAllergies();
      final checkIns = await memory.getRecentCheckIns();
      final plan = await memory.getActiveRecoveryPlan();

      expect(conditions.isEmpty, isTrue);
      expect(meds.isEmpty, isTrue);
      expect(allergies.isEmpty, isTrue);
      expect(checkIns.isEmpty, isTrue);
      expect(plan, isNull);
    });
  });

  group('Phase 4: Medication Workflow & Uncertain Extraction Tests', () {
    test('Unconfirmed medication entity remains in review state until confirmed', () async {
      final memory = HealthMemoryService();
      await memory.initialize();

      final unconfirmedMed = MedicineEntity(
        id: 'med_uncertain_test',
        name: 'Becozinc Capsule (Extracted)',
        genericName: 'Multivitamin with Zinc',
        dosage: '1 Capsule',
        frequency: 'OD (Once Daily)',
        startDate: DateTime.now(),
        provenance: Provenance.requiresReview(
          documentName: 'Prescription Scan (OCR)',
          confidence: 0.65,
        ),
      );

      await memory.addMedicine(unconfirmedMed);
      var retrieved = (await memory.getAllMedicines()).firstWhere((m) => m.id == 'med_uncertain_test');
      expect(retrieved.provenance.source, equals(ProvenanceSource.requiresReview));
      expect(retrieved.provenance.confidence, equals(0.65));

      // Simulate user confirming and validating the medication
      final confirmedMed = MedicineEntity(
        id: unconfirmedMed.id,
        name: unconfirmedMed.name,
        genericName: unconfirmedMed.genericName,
        dosage: unconfirmedMed.dosage,
        frequency: unconfirmedMed.frequency,
        startDate: unconfirmedMed.startDate,
        provenance: Provenance.userReported(),
      );

      await memory.updateMedicine(confirmedMed);
      retrieved = (await memory.getAllMedicines()).firstWhere((m) => m.id == 'med_uncertain_test');
      expect(retrieved.provenance.source, equals(ProvenanceSource.userReported));
    });
  });

  group('Phase 4: Doctor Handoff Dossier Coverage Tests', () {
    test('Generates all 6 clinical handoff types correctly', () async {
      final db = HealthDatabase();
      await db.initialize();
      await db.seedDefaultHealthProfile();

      final handoff = DoctorHandoffEngine();

      for (final type in DoctorSummaryType.values) {
        final dossier = await handoff.generateSummary(type: type);
        expect(dossier.title.isNotEmpty, isTrue);
        expect(dossier.patientHeader.isNotEmpty, isTrue);
        expect(dossier.patientHeader.contains('Alex Rivera'), isTrue);

        final text = dossier.toFormattedPlainText();
        expect(text.contains('CAREBOND AI — CLINICAL HANDOFF'), isTrue);
        expect(text.contains('[DOC] = Clinically Documented'), isTrue);
      }
    });
    test('Doctor handoff plaintext contains all 5 provenance short codes in legend', () async {
      final db = HealthDatabase();
      await db.initialize();
      await db.seedDefaultHealthProfile();

      final handoff = DoctorHandoffEngine();
      final dossier = await handoff.generateSummary(type: DoctorSummaryType.generalDoctor);
      final text = dossier.toFormattedPlainText();

      expect(text.contains('[DOC] = Clinically Documented'), isTrue);
      expect(text.contains('[USER] = User-Reported'), isTrue);
      expect(text.contains('[SYS] = System-Detected'), isTrue);
      expect(text.contains('[REVIEW] = Requires Review'), isTrue);
      expect(text.contains('[URGENT] = Urgent Escalation'), isTrue);
    });
  });

  group('Phase 4: Explainable Alerts & Escalation Level Tests', () {
    test('Seeded alert contains structured 5-part explanation and clinical escalation level', () async {
      final db = HealthDatabase();
      await db.initialize();
      await db.seedDefaultHealthProfile();

      final alerts = await db.getAlerts();
      expect(alerts.isNotEmpty, isTrue);

      final alert = alerts.first;
      expect(alert.whatChanged, isNotNull);
      expect(alert.whatChanged!.isNotEmpty, isTrue);
      expect(alert.whyItMatters, isNotNull);
      expect(alert.whyItMatters!.isNotEmpty, isTrue);
      expect(alert.dataCausedFlag, isNotNull);
      expect(alert.dataCausedFlag!.isNotEmpty, isTrue);
      expect(alert.persistedDuration, isNotNull);
      expect(alert.persistedDuration!.isNotEmpty, isTrue);
      expect(alert.escalationLevel, equals(ClinicalEscalationLevel.monitor));
      expect(alert.explanation.contains('WHAT CHANGED:'), isTrue);
      expect(alert.explanation.contains('WHY IT MATTERS:'), isTrue);
      expect(alert.explanation.contains('DATA CAUSING FLAG:'), isTrue);
      expect(alert.explanation.contains('HOW LONG PERSISTED:'), isTrue);
      expect(alert.explanation.contains('NEXT STEP:'), isTrue);
    });

    test('RecoveryEngine processes extreme sensor observation and generates structured alert', () async {
      final db = HealthDatabase();
      await db.initialize();
      await db.seedDefaultHealthProfile();

      final engine = RecoveryEngine();

      // Submit extreme resting heart rate observation
      await engine.processObservation(
        metricName: 'resting_heart_rate',
        observedValue: 135.0,
      );

      final alerts = await db.getAlerts();
      final hrAlert = alerts.firstWhere((a) => a.metricOrSource == 'resting_heart_rate');

      expect(hrAlert.whatChanged, contains('Resting heart rate'));
      expect(hrAlert.dataCausedFlag, contains('Observed resting_heart_rate of 135.00'));
      expect(hrAlert.whyItMatters, contains('tachycardia'));
      expect(hrAlert.explanation.contains('WHAT CHANGED:'), isTrue);
      expect(hrAlert.explanation.contains('DATA CAUSING FLAG:'), isTrue);
    });
  });

  group('Phase 4: Adaptive Check-in Questioning Tests', () {
    test('Adaptive questioning dynamically reacts to high pain input', () {
      final engine = RecoveryEngine();
      final question = engine.generateAdaptiveFollowUpQuestion([], currentPain: 7);
      expect(question.contains('When did your pain increase to 7/10'), isTrue);
    });

    test('Adaptive questioning dynamically reacts to low sleep input', () {
      final engine = RecoveryEngine();
      final question = engine.generateAdaptiveFollowUpQuestion([], currentSleep: 4.5);
      expect(question.contains('Did anything make it difficult to sleep (4.5 hrs)'), isTrue);
    });

    test('Adaptive questioning dynamically reacts to missed medication input', () {
      final engine = RecoveryEngine();
      final question = engine.generateAdaptiveFollowUpQuestion([], currentTookMeds: false);
      expect(question.contains('Did you miss or delay any prescribed medication today?'), isTrue);
    });
  });

  group('Phase 4: Privacy & Sanitized Logger Tests', () {
    test('SanitizedLogger redacts sensitive health details in debug outputs', () {
      const rawLog = 'Patient Alex Rivera phone 9876543210 with SSN 123-45-6789';
      final sanitized = SanitizedLogger.sanitize(rawLog);

      expect(sanitized.contains('Alex Rivera'), isFalse);
      expect(sanitized.contains('9876543210'), isFalse);
      expect(sanitized.contains('123-45-6789'), isFalse);
      expect(sanitized.contains('[REDACTED_PHI]'), isTrue);
      expect(sanitized.contains('[REDACTED_PHONE]'), isTrue);
    });
  });

  group('Phase 4: Resource Manager Safe Model Verification Tests', () {
    test('ResourceManager registers all 17 models without touching medical data', () async {
      final db = HealthDatabase();
      await db.initialize();
      await db.seedDefaultHealthProfile();

      final resourceManager = ResourceManager();
      await resourceManager.initialize();

      expect(resourceManager.models.length, equals(17));

      // Verify medical database remains intact
      final conditions = await db.getConditions();
      final meds = await db.getMedicines();
      expect(conditions.isNotEmpty, isTrue);
      expect(meds.isNotEmpty, isTrue);
    });
  });
}
