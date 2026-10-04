import 'package:uuid/uuid.dart';
import '../../models/allergy.dart';
import '../../models/check_in.dart';
import '../../models/condition.dart';
import '../../models/doctor_instruction.dart';
import '../../models/genomic_context.dart';
import '../../models/medicine.dart';
import '../../models/patient.dart';
import '../../models/personal_baseline.dart';
import '../../models/procedure.dart';
import '../../models/provenance.dart';
import '../../models/recovery_plan.dart';
import '../../models/report.dart';
import '../../models/sensor_observation.dart';
import '../../models/symptom.dart';
import '../../models/timeline_event.dart';
import '../../models/alert_entity.dart';
import '../../models/chat_message.dart';
import '../security/sanitized_logger.dart';
import 'database_helper.dart';

class HealthDatabase {
  static const String _tag = 'HealthDatabase';
  static final HealthDatabase _instance = HealthDatabase._internal();
  factory HealthDatabase() => _instance;
  HealthDatabase._internal();

  static const _uuid = Uuid();
  bool _useMemoryFallback = false;

  // In-memory caches / fallback stores
  PatientProfile? _cachedPatient;
  final Map<String, ConditionEntity> _conditions = {};
  final Map<String, AllergyEntity> _allergies = {};
  final Map<String, MedicineEntity> _medicines = {};
  final Map<String, ReportEntity> _reports = {};
  final Map<String, ProcedureEntity> _procedures = {};
  final Map<String, SymptomEntity> _symptoms = {};
  final Map<String, DoctorInstructionEntity> _doctorInstructions = {};
  final Map<String, RecoveryPlanEntity> _recoveryPlans = {};
  final Map<String, DailyCheckInEntity> _checkIns = {};
  final List<SensorObservationEntity> _sensorObservations = [];
  final Map<String, PersonalBaselineEntity> _personalBaselines = {};
  final List<AlertEntity> _alerts = [];
  final List<TimelineEventEntity> _timelineEvents = [];
  final List<GeneDrugSafetyFlag> _geneDrugFlags = [];
  final List<ChatMessageEntity> _chatMessages = [];

  Future<void> initialize() async {
    try {
      await DatabaseHelper().database.timeout(const Duration(milliseconds: 1200));
      SanitizedLogger.info(_tag, 'Connected to SQLite database successfully.');
      await _loadInitialDataFromDb();
    } catch (e) {
      _useMemoryFallback = true;
      SanitizedLogger.warning(_tag, 'SQLite native layer fallback to robust in-memory store: $e');
    }

    if (_conditions.isEmpty && _medicines.isEmpty) {
      await seedDefaultHealthProfile();
    }
  }

  Future<void> _loadInitialDataFromDb() async {
    // In full SQLite environment, hydration from disk occurs here
  }

  // --- PATIENT PROFILE ---
  Future<PatientProfile> getPatientProfile() async {
    if (_cachedPatient != null) return _cachedPatient!;
    _cachedPatient = PatientProfile(
      id: 'patient_default_1',
      name: 'Lokesh Sharma',
      age: 48,
      gender: 'Male',
      bloodGroup: 'B+',
      heightCm: 174.0,
      weightKg: 76.5,
      emergencyContactName: 'Ananya Sharma (Spouse)',
      emergencyContactPhone: '+91 98765 43210',
      preferredLanguage: 'en',
      provenance: Provenance.userReported(),
    );
    return _cachedPatient!;
  }

  Future<void> savePatientProfile(PatientProfile profile) async {
    _cachedPatient = profile;
    if (!_useMemoryFallback) {
      try {
        final db = await DatabaseHelper().database;
        await db.insert('patient', profile.toMap());
      } catch (_) {}
    }
  }

  // --- CONDITIONS ---
  Future<List<ConditionEntity>> getConditions() async {
    return _conditions.values.toList()..sort((a, b) => b.diagnosedDate.compareTo(a.diagnosedDate));
  }

  Future<void> addCondition(ConditionEntity condition) async {
    _conditions[condition.id] = condition;
    await addTimelineEvent(
      TimelineEventEntity(
        id: _uuid.v4(),
        title: 'Condition Added: ${condition.name}',
        description: 'Status: ${condition.status}. Notes: ${condition.notes}',
        eventType: TimelineEventType.conditionDiagnosed,
        eventDate: condition.diagnosedDate,
        relatedEntityId: condition.id,
        relatedEntityType: 'Condition',
        provenance: condition.provenance,
      ),
    );
  }

  Future<void> deleteCondition(String id) async {
    _conditions.remove(id);
  }

  // --- ALLERGIES ---
  Future<List<AllergyEntity>> getAllergies() async {
    return _allergies.values.toList()..sort((a, b) => b.identifiedDate.compareTo(a.identifiedDate));
  }

  Future<void> addAllergy(AllergyEntity allergy) async {
    _allergies[allergy.id] = allergy;
    await addTimelineEvent(
      TimelineEventEntity(
        id: _uuid.v4(),
        title: 'Allergy Documented: ${allergy.allergen}',
        description: 'Reaction: ${allergy.reaction} (Severity: ${allergy.severity})',
        eventType: TimelineEventType.conditionDiagnosed,
        eventDate: allergy.identifiedDate,
        relatedEntityId: allergy.id,
        relatedEntityType: 'Allergy',
        provenance: allergy.provenance,
      ),
    );
  }

  // --- MEDICINES ---
  Future<List<MedicineEntity>> getMedicines({bool onlyActive = false}) async {
    final list = _medicines.values.toList();
    if (onlyActive) {
      return list.where((m) => m.isActive).toList();
    }
    return list..sort((a, b) => b.startDate.compareTo(a.startDate));
  }

  Future<void> addMedicine(MedicineEntity medicine) async {
    _medicines[medicine.id] = medicine;
    await addTimelineEvent(
      TimelineEventEntity(
        id: _uuid.v4(),
        title: 'Medication Started: ${medicine.name}',
        description: 'Dose: ${medicine.dosage}, Frequency: ${medicine.frequency}, Timing: ${medicine.timing}',
        eventType: TimelineEventType.medicationStarted,
        eventDate: medicine.startDate,
        relatedEntityId: medicine.id,
        relatedEntityType: 'Medicine',
        provenance: medicine.provenance,
      ),
    );
  }

  Future<void> updateMedicine(MedicineEntity medicine) async {
    _medicines[medicine.id] = medicine;
  }

  Future<void> deleteMedicine(String id) async {
    final med = _medicines.remove(id);
    if (med != null) {
      await addTimelineEvent(
        TimelineEventEntity(
          id: _uuid.v4(),
          title: 'Medication Discontinued: ${med.name}',
          description: 'Medication removed from active regimen.',
          eventType: TimelineEventType.medicationStopped,
          eventDate: DateTime.now(),
          relatedEntityId: id,
          relatedEntityType: 'Medicine',
          provenance: Provenance.userReported(),
        ),
      );
    }
  }

  // --- REPORTS ---
  Future<List<ReportEntity>> getReports() async {
    return _reports.values.toList()..sort((a, b) => b.testDate.compareTo(a.testDate));
  }

  Future<void> addReport(ReportEntity report) async {
    _reports[report.id] = report;
    await addTimelineEvent(
      TimelineEventEntity(
        id: _uuid.v4(),
        title: 'Report Received: ${report.title}',
        description: report.summary.isNotEmpty ? report.summary : '${report.type} report added.',
        eventType: TimelineEventType.labReportReceived,
        eventDate: report.testDate,
        relatedEntityId: report.id,
        relatedEntityType: 'Report',
        provenance: report.provenance,
      ),
    );
  }

  // --- PROCEDURES ---
  Future<List<ProcedureEntity>> getProcedures() async {
    return _procedures.values.toList()..sort((a, b) => b.procedureDate.compareTo(a.procedureDate));
  }

  Future<void> addProcedure(ProcedureEntity procedure) async {
    _procedures[procedure.id] = procedure;
    await addTimelineEvent(
      TimelineEventEntity(
        id: _uuid.v4(),
        title: 'Procedure: ${procedure.name}',
        description: 'Hospital: ${procedure.hospital}, Status: ${procedure.recoveryStatus}',
        eventType: TimelineEventType.procedureDone,
        eventDate: procedure.procedureDate,
        relatedEntityId: procedure.id,
        relatedEntityType: 'Procedure',
        provenance: procedure.provenance,
      ),
    );
  }

  // --- SYMPTOMS ---
  Future<List<SymptomEntity>> getSymptoms({int limit = 30}) async {
    final list = _symptoms.values.toList()..sort((a, b) => b.loggedAt.compareTo(a.loggedAt));
    return list.take(limit).toList();
  }

  Future<void> logSymptom(SymptomEntity symptom) async {
    _symptoms[symptom.id] = symptom;
  }

  // --- DOCTOR INSTRUCTIONS ---
  Future<List<DoctorInstructionEntity>> getDoctorInstructions() async {
    return _doctorInstructions.values.toList()..sort((a, b) => b.givenDate.compareTo(a.givenDate));
  }

  Future<void> addDoctorInstruction(DoctorInstructionEntity instruction) async {
    _doctorInstructions[instruction.id] = instruction;
    await addTimelineEvent(
      TimelineEventEntity(
        id: _uuid.v4(),
        title: 'Doctor Instruction: ${instruction.title}',
        description: instruction.instruction,
        eventType: TimelineEventType.doctorInstructionGiven,
        eventDate: instruction.givenDate,
        relatedEntityId: instruction.id,
        relatedEntityType: 'DoctorInstruction',
        provenance: instruction.provenance,
      ),
    );
  }

  // --- RECOVERY PLANS ---
  Future<RecoveryPlanEntity?> getActiveRecoveryPlan() async {
    if (_recoveryPlans.isEmpty) return null;
    final active = _recoveryPlans.values.where((p) => p.isActive).toList();
    if (active.isNotEmpty) return active.last;
    return _recoveryPlans.values.last;
  }

  Future<void> saveRecoveryPlan(RecoveryPlanEntity plan) async {
    _recoveryPlans[plan.id] = plan;
  }

  // --- CHECK-INS ---
  Future<List<DailyCheckInEntity>> getCheckIns({int limit = 14}) async {
    final list = _checkIns.values.toList()..sort((a, b) => b.checkInDate.compareTo(a.checkInDate));
    return list.take(limit).toList();
  }

  Future<void> saveCheckIn(DailyCheckInEntity checkIn) async {
    _checkIns[checkIn.id] = checkIn;
    await addTimelineEvent(
      TimelineEventEntity(
        id: _uuid.v4(),
        title: 'Daily Recovery Check-in',
        description: 'Pain Score: ${checkIn.painScore}/10, Sleep: ${checkIn.sleepHours} hrs.',
        eventType: TimelineEventType.checkInLogged,
        eventDate: checkIn.checkInDate,
        relatedEntityId: checkIn.id,
        relatedEntityType: 'CheckIn',
        provenance: checkIn.provenance,
      ),
    );
  }

  // --- SENSOR OBSERVATIONS ---
  Future<void> logSensorObservation(SensorObservationEntity observation) async {
    _sensorObservations.add(observation);
    if (_sensorObservations.length > 500) {
      _sensorObservations.removeRange(0, 100);
    }
  }

  Future<List<SensorObservationEntity>> getRecentSensorObservations(String sensorType, {int limit = 50}) async {
    return _sensorObservations
        .where((o) => o.sensorType == sensorType)
        .toList()
        .reversed
        .take(limit)
        .toList()
        .reversed
        .toList();
  }

  // --- PERSONAL BASELINES ---
  Future<PersonalBaselineEntity?> getPersonalBaseline(String metricName) async {
    return _personalBaselines[metricName];
  }

  Future<List<PersonalBaselineEntity>> getAllBaselines() async {
    return _personalBaselines.values.toList();
  }

  Future<void> savePersonalBaseline(PersonalBaselineEntity baseline) async {
    _personalBaselines[baseline.metricName] = baseline;
  }

  // --- ALERTS ---
  Future<List<AlertEntity>> getAlerts({int limit = 20}) async {
    return _alerts.reversed.take(limit).toList();
  }

  Future<void> logAlert(AlertEntity alert) async {
    _alerts.add(alert);
    if (_alerts.length > 100) {
      _alerts.removeAt(0);
    }
    await addTimelineEvent(
      TimelineEventEntity(
        id: _uuid.v4(),
        title: 'Alert: ${alert.title}',
        description: alert.explanation,
        eventType: TimelineEventType.recoveryAlertTriggered,
        eventDate: alert.timestamp,
        relatedEntityId: alert.id,
        relatedEntityType: 'Alert',
        provenance: alert.provenance,
      ),
    );
  }

  // --- TIMELINE EVENTS ---
  Future<List<TimelineEventEntity>> getTimelineEvents({int limit = 50}) async {
    return _timelineEvents.reversed.take(limit).toList();
  }

  Future<void> addTimelineEvent(TimelineEventEntity event) async {
    _timelineEvents.add(event);
  }

  // --- GENE-DRUG SAFETY FLAGS ---
  Future<List<GeneDrugSafetyFlag>> getGeneDrugSafetyFlags() async {
    return List.unmodifiable(_geneDrugFlags);
  }

  Future<void> addGeneDrugFlag(GeneDrugSafetyFlag flag) async {
    _geneDrugFlags.add(flag);
  }

  // --- SEED DEFAULT HIGH-REALISM DATA FOR CAREBOND PROFILE ---
  Future<void> seedDefaultHealthProfile() async {
    final now = DateTime.now();

    _cachedPatient = PatientProfile(
      id: 'patient_demo_1',
      name: 'Alex Rivera (Demo Patient)',
      age: 48,
      gender: 'Male',
      bloodGroup: 'B+',
      heightCm: 174.0,
      weightKg: 76.5,
      emergencyContactName: 'Taylor Rivera (Spouse)',
      emergencyContactPhone: '+1 (555) 234-5678',
      preferredLanguage: 'en',
      provenance: Provenance.documented(documentName: 'Demo Patient Dossier'),
    );

    // 1. Conditions
    final cond1 = ConditionEntity(
      id: 'cond_htn',
      name: 'Essential Hypertension (Stage 1)',
      icdOrCategory: 'Cardiovascular (I10)',
      diagnosedDate: now.subtract(const Duration(days: 720)),
      status: 'managed',
      notes: 'Well controlled with Telmisartan 40mg. Monitor BP weekly.',
      provenance: Provenance.documented(documentName: 'Cardiology Clinic Visit Note', confidence: 0.98),
    );
    final cond2 = ConditionEntity(
      id: 'cond_t2dm',
      name: 'Type 2 Diabetes Mellitus',
      icdOrCategory: 'Endocrine (E11)',
      diagnosedDate: now.subtract(const Duration(days: 450)),
      status: 'managed',
      notes: 'HbA1c target < 6.8%. Following diabetic diet and exercise.',
      provenance: Provenance.documented(documentName: 'Endocrinology Summary', confidence: 0.96),
    );
    _conditions[cond1.id] = cond1;
    _conditions[cond2.id] = cond2;

    // 2. Allergies
    final allg1 = AllergyEntity(
      id: 'allg_penicillin',
      allergen: 'Penicillin / Amoxicillin',
      reaction: 'Urticarial rash & facial edema',
      severity: 'Severe',
      identifiedDate: now.subtract(const Duration(days: 1200)),
      provenance: Provenance.documented(documentName: 'Allergy Record - Apollo Hospital'),
    );
    _allergies[allg1.id] = allg1;

    // 3. Active Medicines
    final med1 = MedicineEntity(
      id: 'med_telmisartan',
      name: 'Telmisartan 40mg',
      genericName: 'Telmisartan',
      dosage: '40mg (1 tablet)',
      frequency: 'Once daily (OD)',
      timing: 'Morning after breakfast',
      instructions: 'Take consistently at 8:00 AM. Monitor blood pressure.',
      startDate: now.subtract(const Duration(days: 700)),
      isActive: true,
      isConfirmedByUser: true,
      reminderTimes: ['08:00'],
      prescribedForCondition: 'Essential Hypertension',
      prescribingDoctor: 'Dr. V. Raman (Cardiologist)',
      provenance: Provenance.documented(documentName: 'Prescription Rx-782'),
    );

    final med2 = MedicineEntity(
      id: 'med_metformin',
      name: 'Metformin XR 500mg',
      genericName: 'Metformin Hydrochloride (Extended Release)',
      dosage: '500mg (1 tablet)',
      frequency: 'Once daily with dinner',
      timing: 'With dinner',
      instructions: 'Swallow whole with food to avoid gastric irritation.',
      startDate: now.subtract(const Duration(days: 420)),
      isActive: true,
      isConfirmedByUser: true,
      reminderTimes: ['20:30'],
      prescribedForCondition: 'Type 2 Diabetes Mellitus',
      prescribingDoctor: 'Dr. S. Kulkarni (Endocrinologist)',
      provenance: Provenance.documented(documentName: 'Prescription Rx-901'),
    );

    final med3 = MedicineEntity(
      id: 'med_pantoprazole',
      name: 'Pantoprazole 40mg',
      genericName: 'Pantoprazole Sodium',
      dosage: '40mg (1 tablet)',
      frequency: 'Once daily before breakfast',
      timing: 'Empty stomach (30 mins before food)',
      instructions: 'Post-procedure gastric protection. 14 days course.',
      startDate: now.subtract(const Duration(days: 4)),
      endDate: now.add(const Duration(days: 10)),
      isActive: true,
      isConfirmedByUser: true,
      reminderTimes: ['07:30'],
      prescribedForCondition: 'Post-procedure Care',
      prescribingDoctor: 'Dr. Ramesh Rao (Surgeon)',
      provenance: Provenance.documented(documentName: 'Discharge Summary DSC-2026'),
    );

    _medicines[med1.id] = med1;
    _medicines[med2.id] = med2;
    _medicines[med3.id] = med3;

    // 3b. Uncertain Extracted Medicine (Requires Review Demo)
    final med4 = MedicineEntity(
      id: 'med_becozinc',
      name: 'Becozinc Capsule',
      genericName: 'Multivitamin with Zinc',
      dosage: '1 capsule',
      frequency: 'Once daily after lunch',
      timing: 'After lunch',
      instructions: 'Nutritional supplement during recovery',
      startDate: now.subtract(const Duration(days: 2)),
      isActive: true,
      isConfirmedByUser: false,
      reminderTimes: ['13:30'],
      prescribedForCondition: 'Post-op Recovery Support',
      prescribingDoctor: 'Dr. Ramesh Rao',
      provenance: Provenance(
        source: ProvenanceSource.requiresReview,
        documentName: 'Prescription Photo Scanned #104',
        confidence: 0.72,
        recordedAt: now.subtract(const Duration(days: 2)),
      ),
    );
    _medicines[med4.id] = med4;

    // 4. Procedures & Active Recovery Plan
    final proc1 = ProcedureEntity(
      id: 'proc_lap_app',
      name: 'Laparoscopic Appendectomy',
      procedureDate: now.subtract(const Duration(days: 4)),
      hospital: 'Manipal Hospital, Bangalore',
      surgeon: 'Dr. Ramesh Rao, MS, FRCS',
      notes: 'Uncomplicated laparoscopic appendectomy. 3 ports. Discharged on Day 2 in stable condition.',
      recoveryStatus: 'In Recovery (Day 5)',
      provenance: Provenance.documented(documentName: 'Surgical Operative Note #9482'),
    );
    _procedures[proc1.id] = proc1;

    final recoveryPlan = RecoveryPlanEntity(
      id: 'plan_appendectomy_recovery',
      title: 'Post-Laparoscopic Appendectomy 14-Day Recovery Protocol',
      procedureName: 'Laparoscopic Appendectomy',
      startDate: now.subtract(const Duration(days: 4)),
      targetDurationDays: 14,
      currentPhase: 'Phase 2: Gradual Mobility & Wound Healing (Days 4-7)',
      targetDailySteps: 2500,
      targetRestHours: 8.5,
      isActive: true,
      milestones: [
        RecoveryMilestone(
          dayNumber: 1,
          title: 'Post-op Day 1: Hospital Discharge',
          description: 'Tolerating soft liquids, pain managed via oral medications.',
          isCompleted: true,
        ),
        RecoveryMilestone(
          dayNumber: 3,
          title: 'Post-op Day 3: Gentle Ambulation',
          description: 'Light walking inside room (5-10 mins). Keep port incisions dry.',
          isCompleted: true,
        ),
        RecoveryMilestone(
          dayNumber: 7,
          title: 'Post-op Day 7: Wound Inspection',
          description: 'Check port sites for redness or discharge. Target 2,500 daily steps.',
          isCompleted: false,
        ),
        RecoveryMilestone(
          dayNumber: 14,
          title: 'Post-op Day 14: Return to Light Daily Routine',
          description: 'Follow-up appointment with surgeon. Resume driving and normal diet.',
          isCompleted: false,
        ),
      ],
      provenance: Provenance.documented(documentName: 'Discharge Recovery Instructions'),
    );
    _recoveryPlans[recoveryPlan.id] = recoveryPlan;

    // 4b. Daily Check-in History (4 days)
    _checkIns['chk_day1'] = DailyCheckInEntity(
      id: 'chk_day1',
      checkInDate: now.subtract(const Duration(days: 4)),
      painScore: 5,
      fatigueScore: 4,
      moodScore: 3,
      sleepHours: 6.0,
      tookAllMedications: true,
      reportedSymptoms: 'Incision tenderness and mild nausea',
      patientSpokenTranscript: 'Pain is around 5 out of 10 around the umbilical incision.',
      adaptiveFollowUpQuestion: 'Are you tolerating liquids and oral medications well?',
      adaptiveFollowUpAnswer: 'Yes, had soft soup and kept medicines down.',
      provenance: Provenance.userReported(),
    );
    _checkIns['chk_day2'] = DailyCheckInEntity(
      id: 'chk_day2',
      checkInDate: now.subtract(const Duration(days: 3)),
      painScore: 4,
      fatigueScore: 4,
      moodScore: 3,
      sleepHours: 6.5,
      tookAllMedications: true,
      reportedSymptoms: 'Tired, decreased movement due to soreness',
      patientSpokenTranscript: 'Feeling very sleepy and moved very little today.',
      adaptiveFollowUpQuestion: 'Did you experience sharp pain when walking?',
      adaptiveFollowUpAnswer: 'No sharp pain, just dull ache.',
      provenance: Provenance.userReported(),
    );
    _checkIns['chk_day3'] = DailyCheckInEntity(
      id: 'chk_day3',
      checkInDate: now.subtract(const Duration(days: 2)),
      painScore: 3,
      fatigueScore: 3,
      moodScore: 4,
      sleepHours: 7.5,
      tookAllMedications: true,
      reportedSymptoms: 'Mild soreness on standing',
      patientSpokenTranscript: 'Walked in the living room three times today.',
      adaptiveFollowUpQuestion: 'How is your mobility progressing compared to yesterday?',
      adaptiveFollowUpAnswer: 'Much easier to get in and out of bed.',
      provenance: Provenance.userReported(),
    );
    _checkIns['chk_day4'] = DailyCheckInEntity(
      id: 'chk_day4',
      checkInDate: now.subtract(const Duration(days: 1)),
      painScore: 2,
      fatigueScore: 2,
      moodScore: 4,
      sleepHours: 8.0,
      tookAllMedications: true,
      reportedSymptoms: 'Incision healing well, no redness',
      patientSpokenTranscript: 'Feeling much stronger. Took all medications on time.',
      adaptiveFollowUpQuestion: 'Did you inspect the surgical dressing today?',
      adaptiveFollowUpAnswer: 'Dressing is clean and dry.',
      provenance: Provenance.userReported(),
    );

    // 4c. Symptoms Logged
    _symptoms['symp_1'] = SymptomEntity(
      id: 'symp_1',
      symptom: 'Incision Tenderness',
      severity: 3,
      location: 'Lower abdomen / umbilical port',
      loggedAt: now.subtract(const Duration(days: 2)),
      notes: 'Expected post-laparoscopic soreness around umbilical port.',
      provenance: Provenance.userReported(),
    );

    // 5. Doctor Instructions
    final inst1 = DoctorInstructionEntity(
      id: 'inst_wound',
      title: 'Incision & Wound Care',
      instruction: 'Keep abdominal dressing clean and dry. No soaking in bathtub or swimming for 2 weeks.',
      category: 'WoundCare',
      givenDate: now.subtract(const Duration(days: 4)),
      doctorName: 'Dr. Ramesh Rao',
      provenance: Provenance.documented(documentName: 'Discharge Summary'),
    );
    final inst2 = DoctorInstructionEntity(
      id: 'inst_activity',
      title: 'Lifting Restrictions',
      instruction: 'Do not lift objects heavier than 5 kg (10 lbs) for 3 weeks to prevent port hernia.',
      category: 'Activity',
      givenDate: now.subtract(const Duration(days: 4)),
      doctorName: 'Dr. Ramesh Rao',
      provenance: Provenance.documented(documentName: 'Discharge Summary'),
    );
    _doctorInstructions[inst1.id] = inst1;
    _doctorInstructions[inst2.id] = inst2;

    // 6. Recent Lab Reports
    final rep1 = ReportEntity(
      id: 'rep_cbc_postop',
      title: 'Post-Op Complete Blood Count & Electrolytes',
      type: 'Lab',
      testDate: now.subtract(const Duration(days: 3)),
      laboratoryOrHospital: 'Manipal Diagnostics',
      summary: 'Hemoglobin and platelets are within normal limits. White blood cell count recovering nicely toward baseline.',
      rawOcrText: 'CBC Report: Hb 13.8 g/dL, WBC 8,400 /uL, Platelets 220,000 /uL, Creatinine 0.85 mg/dL',
      results: [
        LabResultItem(testName: 'Hemoglobin', value: '13.8', unit: 'g/dL', referenceRange: '13.0 - 17.0', isAbnormal: false),
        LabResultItem(testName: 'Total Leukocyte Count (WBC)', value: '8,400', unit: '/uL', referenceRange: '4,000 - 11,000', isAbnormal: false),
        LabResultItem(testName: 'Platelets', value: '220,000', unit: '/uL', referenceRange: '150,000 - 450,000', isAbnormal: false),
        LabResultItem(testName: 'Serum Creatinine', value: '0.85', unit: 'mg/dL', referenceRange: '0.7 - 1.2', isAbnormal: false),
        LabResultItem(testName: 'Fasting Blood Sugar', value: '118', unit: 'mg/dL', referenceRange: '70 - 100', isAbnormal: true, interpretation: 'Elevated (Preprandial)'),
      ],
      provenance: Provenance.documented(documentName: 'Lab Report #LR-5581'),
    );
    _reports[rep1.id] = rep1;

    final rep2 = ReportEntity(
      id: 'rep_usg_preop',
      title: 'Pre-Operative Abdominal Ultrasound',
      type: 'Imaging',
      testDate: now.subtract(const Duration(days: 5)),
      laboratoryOrHospital: 'City Scan & Imaging Institute',
      summary: 'Non-compressible tubular structure in RIF measuring 9.2mm. Diagnosis: Acute uncomplicated appendicitis.',
      rawOcrText: 'Ultrasound Abdomen & Pelvis: Appendix is dilated (9.2mm outer diameter) with surrounding hyperechoic mesenteric fat. No evidence of appendicolith perforation or abscess.',
      results: [
        LabResultItem(testName: 'Appendix Caliber', value: '9.2', unit: 'mm', referenceRange: '< 6.0', isAbnormal: true, interpretation: 'Dilated / Inflamed'),
        LabResultItem(testName: 'Free Peritoneal Fluid', value: 'Minimal', unit: '', referenceRange: 'None', isAbnormal: false),
      ],
      provenance: Provenance.documented(documentName: 'Ultrasound Report #US-9912'),
    );
    _reports[rep2.id] = rep2;

    // 7. Personal Baselines (EWMA + MAD)
    _personalBaselines['mobility_intensity'] = PersonalBaselineEntity(
      id: 'base_mobility',
      metricName: 'mobility_intensity',
      baselineMean: 0.65,
      stdDevOrMAD: 0.12,
      cusumHigh: 0.0,
      cusumLow: 0.0,
      sampleCount: 120,
      lastUpdated: now,
      provenance: Provenance.systemDetected(),
    );
    _personalBaselines['resting_heart_rate'] = PersonalBaselineEntity(
      id: 'base_rhr',
      metricName: 'resting_heart_rate',
      baselineMean: 72.0,
      stdDevOrMAD: 4.5,
      sampleCount: 96,
      lastUpdated: now,
      provenance: Provenance.systemDetected(),
    );

    // 7b. Seeded Explainable Alert (Day 2 Mobility Drop)
    final alert1 = AlertEntity(
      id: 'alert_mobility_day2',
      title: 'Mobility Below Personal Baseline (Resolved)',
      metricOrSource: 'mobility_intensity',
      observedValue: 0.38,
      baselineValue: 0.65,
      deviation: -0.42,
      severity: AlertSeverity.warning,
      whatChanged: 'Mobility intensity dropped 42% below your personal baseline on Day 2 post-op.',
      whyItMatters: 'Post-laparoscopic ambulation promotes bowel motility and reduces risk of venous thromboembolism.',
      dataCausedFlag: 'Observed accelerometer average = 0.38 m/s² vs personal baseline mean = 0.65 m/s² (Z-score: -2.25).',
      persistedDuration: 'Persisted across 4 consecutive observation windows after discharge.',
      escalationLevel: ClinicalEscalationLevel.monitor,
      explanation: 'WHAT CHANGED: Observed mobility intensity dropped 42% below your recovery baseline on Day 2.\nWHY IT MATTERS: Early post-surgical ambulation prevents deep vein stasis and promotes healing.\nDATA CAUSING FLAG: 0.38 m/s² vs 0.65 m/s² baseline (EWMA shift).\nHOW LONG PERSISTED: 4 consecutive 2-hour observation windows.\nNEXT STEP: [MONITOR] Perform 5-10 minutes of gentle room walking. Mobility recovered to baseline on Day 3.',
      recommendedAction: 'Engage in gentle 10-minute assisted room ambulation as pain permits.',
      timestamp: now.subtract(const Duration(days: 3)),
      isAcknowledged: true,
      provenance: Provenance.systemDetected(),
    );
    _alerts.add(alert1);

    // 7c. Seeded Sensor Observations (Past 24 hours)
    for (int i = 0; i < 6; i++) {
      _sensorObservations.add(
        SensorObservationEntity(
          id: 'sens_mob_$i',
          timestamp: now.subtract(Duration(hours: i * 4)),
          sensorType: 'accelerometer',
          value: 0.58 + (i * 0.02),
          unit: 'm/s²',
          provenance: Provenance.systemDetected(),
        ),
      );
      _sensorObservations.add(
        SensorObservationEntity(
          id: 'sens_hr_$i',
          timestamp: now.subtract(Duration(hours: i * 4)),
          sensorType: 'heart_rate',
          value: 71.0 + (i % 3),
          unit: 'BPM',
          provenance: Provenance.systemDetected(),
        ),
      );
    }

    // 8. Gene-Drug Safety Flag
    _geneDrugFlags.add(
      GeneDrugSafetyFlag(
        gene: 'CYP2C19',
        variantOrPhenotype: '*2/*2 (Poor Metabolizer)',
        affectedDrug: 'Clopidogrel (Plavix)',
        clinicalImplication: 'Substantially reduced conversion to active metabolite. If antiplatelet therapy is indicated in future, Ticagrelor or Prasugrel is clinically preferred over Clopidogrel.',
        recommendationLevel: 'Requires Clinician Review',
        provenance: Provenance.documented(documentName: 'Genomic Panel Lab Report #GN-1102'),
      ),
    );

    // 9. Initial Timeline Events
    _timelineEvents.add(
      TimelineEventEntity(
        id: _uuid.v4(),
        title: 'Laparoscopic Appendectomy Completed',
        description: '3-port laparoscopic procedure under GA at Manipal Hospital.',
        eventType: TimelineEventType.procedureDone,
        eventDate: now.subtract(const Duration(days: 4)),
        relatedEntityId: proc1.id,
        relatedEntityType: 'Procedure',
        provenance: proc1.provenance,
      ),
    );
    _timelineEvents.add(
      TimelineEventEntity(
        id: _uuid.v4(),
        title: 'Discharge Summary & Medications Registered',
        description: 'Started Pantoprazole 40mg. Resumed Telmisartan & Metformin.',
        eventType: TimelineEventType.medicationStarted,
        eventDate: now.subtract(const Duration(days: 3)),
        provenance: Provenance.documented(documentName: 'Discharge Summary DSC-2026'),
      ),
    );
  }

  Future<void> clearSampleDataForFreshProfile() async {
    _conditions.clear();
    _allergies.clear();
    _medicines.clear();
    _reports.clear();
    _procedures.clear();
    _symptoms.clear();
    _doctorInstructions.clear();
    _recoveryPlans.clear();
    _checkIns.clear();
    _sensorObservations.clear();
    _personalBaselines.clear();
    _alerts.clear();
    _timelineEvents.clear();
    _geneDrugFlags.clear();
    _cachedPatient = PatientProfile(
      id: 'patient_me',
      name: 'Primary User',
      age: 0,
      gender: 'Unspecified',
      bloodGroup: 'Unspecified',
      emergencyContactName: '',
      emergencyContactPhone: '',
      provenance: Provenance.userReported(),
    );
  }

  Future<void> seedSampleData() async {
    await seedDefaultHealthProfile();
  }

  // Conversational History
  Future<List<ChatMessageEntity>> getChatMessages({String conversationId = 'default_conversation', int limit = 100}) async {
    if (!_useMemoryFallback) {
      try {
        final db = await DatabaseHelper().database;
        final rows = await db.query(
          'chat_messages',
          where: 'conversationId = ?',
          whereArgs: [conversationId],
          orderBy: 'timestamp ASC',
          limit: limit,
        );
        return rows.map((r) => ChatMessageEntity.fromMap(r)).toList();
      } catch (e) {
        SanitizedLogger.warning(_tag, 'Failed to query chat_messages: $e');
      }
    }
    final filtered = _chatMessages.where((m) => m.conversationId == conversationId).toList();
    filtered.sort((a, b) => a.timestamp.compareTo(b.timestamp));
    if (filtered.length > limit) {
      return filtered.sublist(filtered.length - limit);
    }
    return filtered;
  }

  Future<void> saveChatMessage(ChatMessageEntity message) async {
    _chatMessages.add(message);
    if (!_useMemoryFallback) {
      try {
        final db = await DatabaseHelper().database;
        await db.insert(
          'chat_messages',
          message.toMap(),
        );
      } catch (e) {
        SanitizedLogger.warning(_tag, 'Failed to insert chat_message: $e');
      }
    }
  }

  Future<void> clearChatHistory({String conversationId = 'default_conversation'}) async {
    _chatMessages.removeWhere((m) => m.conversationId == conversationId);
    if (!_useMemoryFallback) {
      try {
        final db = await DatabaseHelper().database;
        await db.delete(
          'chat_messages',
          where: 'conversationId = ?',
          whereArgs: [conversationId],
        );
      } catch (e) {
        SanitizedLogger.warning(_tag, 'Failed to clear chat_messages: $e');
      }
    }
  }
}
