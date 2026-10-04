import '../../core/database/health_database.dart';
import '../../models/allergy.dart';
import '../../models/check_in.dart';
import '../../models/condition.dart';
import '../../models/doctor_instruction.dart';
import '../../models/genomic_context.dart';
import '../../models/medicine.dart';
import '../../models/patient.dart';
import '../../models/personal_baseline.dart';
import '../../models/procedure.dart';
import '../../models/recovery_plan.dart';
import '../../models/report.dart';
import '../../models/symptom.dart';
import '../../models/timeline_event.dart';
import '../../models/alert_entity.dart';
import '../../models/chat_message.dart';

class HealthMemoryService {
  static final HealthMemoryService _instance = HealthMemoryService._internal();
  factory HealthMemoryService() => _instance;
  HealthMemoryService._internal();

  final HealthDatabase _db = HealthDatabase();

  Future<void> initialize() async {
    await _db.initialize();
  }

  // Patient Profile
  Future<PatientProfile> getPatientProfile() => _db.getPatientProfile();
  Future<void> savePatientProfile(PatientProfile profile) => _db.savePatientProfile(profile);

  // Conditions
  Future<List<ConditionEntity>> getConditions() => _db.getConditions();
  Future<void> addCondition(ConditionEntity condition) => _db.addCondition(condition);
  Future<void> deleteCondition(String id) => _db.deleteCondition(id);

  // Allergies
  Future<List<AllergyEntity>> getAllergies() => _db.getAllergies();
  Future<void> addAllergy(AllergyEntity allergy) => _db.addAllergy(allergy);

  // Medicines
  Future<List<MedicineEntity>> getActiveMedicines() => _db.getMedicines(onlyActive: true);
  Future<List<MedicineEntity>> getAllMedicines() => _db.getMedicines(onlyActive: false);
  Future<void> addMedicine(MedicineEntity medicine) => _db.addMedicine(medicine);
  Future<void> updateMedicine(MedicineEntity medicine) => _db.updateMedicine(medicine);
  Future<void> saveMedicine(MedicineEntity medicine) async {
    final existing = await _db.getMedicines(onlyActive: false);
    if (existing.any((m) => m.id == medicine.id)) {
      await _db.updateMedicine(medicine);
    } else {
      await _db.addMedicine(medicine);
    }
  }
  Future<void> deleteMedicine(String id) => _db.deleteMedicine(id);

  // Reports
  Future<List<ReportEntity>> getReports() => _db.getReports();
  Future<void> addReport(ReportEntity report) => _db.addReport(report);

  // Procedures
  Future<List<ProcedureEntity>> getProcedures() => _db.getProcedures();
  Future<void> addProcedure(ProcedureEntity procedure) => _db.addProcedure(procedure);

  // Symptoms
  Future<List<SymptomEntity>> getRecentSymptoms({int limit = 20}) => _db.getSymptoms(limit: limit);
  Future<void> logSymptom(SymptomEntity symptom) => _db.logSymptom(symptom);

  // Doctor Instructions
  Future<List<DoctorInstructionEntity>> getDoctorInstructions() => _db.getDoctorInstructions();
  Future<void> addDoctorInstruction(DoctorInstructionEntity instruction) => _db.addDoctorInstruction(instruction);

  // Recovery Plan & Check-ins
  Future<RecoveryPlanEntity?> getActiveRecoveryPlan() => _db.getActiveRecoveryPlan();
  Future<void> saveRecoveryPlan(RecoveryPlanEntity plan) => _db.saveRecoveryPlan(plan);
  Future<List<DailyCheckInEntity>> getRecentCheckIns({int limit = 14}) => _db.getCheckIns(limit: limit);
  Future<void> logCheckIn(DailyCheckInEntity checkIn) => _db.saveCheckIn(checkIn);

  // Baselines & Alerts
  Future<PersonalBaselineEntity?> getBaseline(String metric) => _db.getPersonalBaseline(metric);
  Future<List<PersonalBaselineEntity>> getAllBaselines() => _db.getAllBaselines();
  Future<void> saveBaseline(PersonalBaselineEntity baseline) => _db.savePersonalBaseline(baseline);
  Future<List<AlertEntity>> getRecentAlerts({int limit = 20}) => _db.getAlerts(limit: limit);
  Future<void> logAlert(AlertEntity alert) => _db.logAlert(alert);

  // Timeline
  Future<List<TimelineEventEntity>> getTimeline({int limit = 50}) => _db.getTimelineEvents(limit: limit);
  Future<void> addTimelineEvent(TimelineEventEntity event) => _db.addTimelineEvent(event);

  // Genomic Context
  Future<List<GeneDrugSafetyFlag>> getGeneDrugFlags() => _db.getGeneDrugSafetyFlags();
  Future<void> addGeneDrugFlag(GeneDrugSafetyFlag flag) => _db.addGeneDrugFlag(flag);

  // Profile Management
  Future<void> clearSampleDataForFreshProfile() => _db.clearSampleDataForFreshProfile();
  Future<void> seedSampleData() => _db.seedSampleData();

  // Chat History
  Future<List<ChatMessageEntity>> getChatMessages({String conversationId = 'default_conversation', int limit = 100}) =>
      _db.getChatMessages(conversationId: conversationId, limit: limit);
  Future<void> saveChatMessage(ChatMessageEntity message) => _db.saveChatMessage(message);
  Future<void> clearChatHistory({String conversationId = 'default_conversation'}) =>
      _db.clearChatHistory(conversationId: conversationId);
}
