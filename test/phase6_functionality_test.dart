import 'package:flutter_test/flutter_test.dart';
import 'package:carewatch_ai_recovery_watch/core/events/health_event_bus.dart';
import 'package:carewatch_ai_recovery_watch/core/localization/app_localizations.dart';
import 'package:carewatch_ai_recovery_watch/models/allergy.dart';
import 'package:carewatch_ai_recovery_watch/models/check_in.dart';
import 'package:carewatch_ai_recovery_watch/models/condition.dart';
import 'package:carewatch_ai_recovery_watch/models/discharge_summary.dart';
import 'package:carewatch_ai_recovery_watch/models/provenance.dart';
import 'package:carewatch_ai_recovery_watch/services/health_memory/health_memory_service.dart';
import 'package:carewatch_ai_recovery_watch/services/nutrition/food_guidance_engine.dart';
import 'package:carewatch_ai_recovery_watch/services/recovery/recovery_engine.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 6: 6-Language Localization System Tests', () {
    test('LanguageManager supports all 6 target languages with native names', () {
      final lm = LanguageManager();
      expect(AppLanguage.values.length, 6);

      lm.setLanguage(AppLanguage.english);
      expect(lm.currentLanguage.code, 'en');
      expect(lm.currentLanguage.nativeName, 'English');

      lm.setLanguage(AppLanguage.hindi);
      expect(lm.currentLanguage.code, 'hi');
      expect(lm.currentLanguage.nativeName, 'हिन्दी');

      lm.setLanguage(AppLanguage.telugu);
      expect(lm.currentLanguage.code, 'te');
      expect(lm.currentLanguage.nativeName, 'తెలుగు');

      lm.setLanguage(AppLanguage.kannada);
      expect(lm.currentLanguage.code, 'kn');
      expect(lm.currentLanguage.nativeName, 'ಕನ್ನಡ');

      lm.setLanguage(AppLanguage.tamil);
      expect(lm.currentLanguage.code, 'ta');
      expect(lm.currentLanguage.nativeName, 'தமிழ்');

      lm.setLanguage(AppLanguage.marathi);
      expect(lm.currentLanguage.code, 'mr');
      expect(lm.currentLanguage.nativeName, 'मराठी');

      // Reset to English
      lm.setLanguage(AppLanguage.english);
    });

    test('Translation dictionaries contain key UI terms across all 6 languages', () {
      final locEn = AppLocalizations(AppLanguage.english);
      final locHi = AppLocalizations(AppLanguage.hindi);
      final locTe = AppLocalizations(AppLanguage.telugu);
      final locKn = AppLocalizations(AppLanguage.kannada);
      final locTa = AppLocalizations(AppLanguage.tamil);
      final locMr = AppLocalizations(AppLanguage.marathi);

      expect(locEn.translate('tabToday'), 'Today');
      expect(locHi.translate('tabToday').contains('आज'), isTrue);
      expect(locTe.translate('tabToday').contains('ఈరోజు'), isTrue);
      expect(locKn.translate('tabToday').contains('ಇಂದು'), isTrue);
      expect(locTa.translate('tabToday').contains('இன்று'), isTrue);
      expect(locMr.translate('tabToday').contains('आज'), isTrue);

      expect(locEn.translate('selectLanguage'), 'Select Preferred Language');
      expect(locHi.translate('selectLanguage').contains('भाषा'), isTrue);
      expect(locTe.translate('selectLanguage').contains('భాష'), isTrue);
    });
  });

  group('Phase 6: Food Guidance Context-Aware Engine Tests', () {
    test('Provides post-operative surgical diet when recovery condition exists', () async {
      final conditions = [
        ConditionEntity(
          id: 'c1',
          name: 'Post-Op Laparoscopic Cholecystectomy',
          diagnosedDate: DateTime.now().subtract(const Duration(days: 3)),
          status: 'Active',
          provenance: Provenance.userReported(),
        ),
      ];

      final guidance = await FoodGuidanceEngine.generateGuidance(
        conditions: conditions,
        medicines: [],
        allergies: [],
      );

      expect(guidance.matchedContextReasons.any((r) => r.contains('post-operative')), isTrue);
      expect(guidance.recommended.any((r) => r.title.contains('Gentle Digestion')), isTrue);
      expect(guidance.limitOrAvoid.any((r) => r.title.contains('Heavy, Oily')), isTrue);
    });

    test('Includes strict allergen exclusion warning when allergy is documented', () async {
      final allergies = [
        AllergyEntity(
          id: 'a1',
          allergen: 'Peanuts',
          reaction: 'Anaphylaxis and hives',
          severity: 'Severe',
          identifiedDate: DateTime.now().subtract(const Duration(days: 30)),
          provenance: Provenance.userReported(),
        ),
      ];

      final guidance = await FoodGuidanceEngine.generateGuidance(
        conditions: [],
        medicines: [],
        allergies: allergies,
      );

      expect(guidance.limitOrAvoid.any((r) => r.title.contains('Peanuts')), isTrue);
    });
  });

  group('Phase 6: Deterministic Recovery Index & Explainable Alerts', () {
    test('Calculates dynamic recovery score and decreases score on elevated pain and low sleep', () async {
      final memory = HealthMemoryService();
      await memory.clearSampleDataForFreshProfile();

      // Log a high pain, low sleep check-in
      final badCheckIn = DailyCheckInEntity(
        id: 'chk_test_1',
        checkInDate: DateTime.now(),
        painScore: 8,
        fatigueScore: 7,
        moodScore: 2,
        sleepHours: 3.5,
        tookAllMedications: false,
        reportedSymptoms: 'Incision throbbing',
        provenance: Provenance.userReported(),
      );
      await memory.logCheckIn(badCheckIn);

      final status = await RecoveryEngine().calculateDynamicRecoveryIndex();

      expect(status.recoveryScore < 70.0, isTrue);
      expect(status.status == RecoveryIndexStatus.attentionRequired || status.status == RecoveryIndexStatus.moderateDeviation, isTrue);
      expect(status.explanation.contains('8/10'), isTrue);
    });
  });

  group('Phase 6: Health Event Bus Real-Time Synchronization', () {
    test('HealthEventBus broadcasts events to active listeners', () async {
      final bus = HealthEventBus();
      bool receivedNotification = false;

      final sub = bus.stream.listen((event) {
        if (event.type == HealthEventType.dataChanged) {
          receivedNotification = true;
        }
      });

      bus.notifyDataChanged();
      await Future.delayed(const Duration(milliseconds: 50));

      expect(receivedNotification, isTrue);
      await sub.cancel();
    });
  });

  group('Phase 6: Structured Discharge Summary Entity & Provenance', () {
    test('DischargeSummaryEntity serializes and deserializes correctly', () {
      final discharge = DischargeSummaryEntity(
        id: 'ds_101',
        title: 'Discharge Summary — Post-Op',
        hospitalName: 'Apollo City Hospital',
        attendingPhysician: 'Dr. Rao, MS',
        admissionDate: DateTime(2026, 9, 28),
        dischargeDate: DateTime(2026, 10, 2),
        primaryDiagnoses: ['Acute Appendicitis', 'Post-Op Laparoscopy'],
        proceduresPerformed: ['Laparoscopic Appendectomy'],
        dischargeMedications: ['Cefuroxime 500mg', 'Paracetamol 650mg'],
        activityRestrictions: 'No heavy lifting for 2 weeks',
        woundCareInstructions: 'Keep incision clean and dry',
        dietInstructions: 'Soft, low-oil diet for 5 days',
        redFlagWarningSigns: ['Fever > 101F', 'Wound redness'],
        followUpInstructions: 'Review in OPD in 7 days',
        provenance: Provenance.documented(documentId: 'ds_101', documentName: 'Discharge Summary'),
      );

      final map = discharge.toMap();
      final fromMap = DischargeSummaryEntity.fromMap(map);

      expect(fromMap.id, 'ds_101');
      expect(fromMap.hospitalName, 'Apollo City Hospital');
      expect(fromMap.primaryDiagnoses.length, 2);
      expect(fromMap.proceduresPerformed.first, 'Laparoscopic Appendectomy');
      expect(fromMap.provenance.source, ProvenanceSource.documented);
    });
  });
}
