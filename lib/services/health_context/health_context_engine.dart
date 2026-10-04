import '../../models/allergy.dart';
import '../../models/condition.dart';
import '../../models/doctor_instruction.dart';
import '../../models/genomic_context.dart';
import '../../models/medicine.dart';
import '../../models/patient.dart';
import '../../models/procedure.dart';
import '../../models/recovery_plan.dart';
import '../../models/report.dart';
import '../../models/symptom.dart';
import '../../models/alert_entity.dart';
import '../health_memory/health_memory_service.dart';

class PersonalHealthContext {
  final PatientProfile patient;
  final List<ConditionEntity> conditions;
  final List<AllergyEntity> allergies;
  final List<MedicineEntity> activeMedicines;
  final List<ProcedureEntity> procedures;
  final List<ReportEntity> recentReports;
  final List<SymptomEntity> recentSymptoms;
  final List<DoctorInstructionEntity> doctorInstructions;
  final RecoveryPlanEntity? activeRecoveryPlan;
  final List<AlertEntity> recentAlerts;
  final List<GeneDrugSafetyFlag> geneDrugFlags;
  final DateTime generatedAt;

  PersonalHealthContext({
    required this.patient,
    required this.conditions,
    required this.allergies,
    required this.activeMedicines,
    required this.procedures,
    required this.recentReports,
    required this.recentSymptoms,
    required this.doctorInstructions,
    this.activeRecoveryPlan,
    required this.recentAlerts,
    required this.geneDrugFlags,
    required this.generatedAt,
  });

  bool get hasActiveAllergies => allergies.isNotEmpty;
  bool get isInActiveRecovery => activeRecoveryPlan != null && activeRecoveryPlan!.isActive;

  String toStructuredPromptSummary() {
    final buffer = StringBuffer();
    buffer.writeln('=== PATIENT PERSONAL HEALTH CONTEXT ===');
    buffer.writeln('Patient: ${patient.name}, ${patient.age} y/o ${patient.gender} (Blood Group: ${patient.bloodGroup})');

    buffer.writeln('\n[DOCUMENTED CONDITIONS]');
    if (conditions.isEmpty) {
      buffer.writeln('- None documented');
    } else {
      for (var c in conditions) {
        buffer.writeln('- ${c.name} (${c.status}) [${c.provenance.source.name}]');
      }
    }

    buffer.writeln('\n[ACTIVE MEDICATIONS]');
    if (activeMedicines.isEmpty) {
      buffer.writeln('- None active');
    } else {
      for (var m in activeMedicines) {
        buffer.writeln('- ${m.name} | Dose: ${m.dosage} | Freq: ${m.frequency} | Timing: ${m.timing} [${m.provenance.source.name}]');
      }
    }

    buffer.writeln('\n[DOCUMENTED ALLERGIES]');
    if (allergies.isEmpty) {
      buffer.writeln('- No known allergies');
    } else {
      for (var a in allergies) {
        buffer.writeln('- ${a.allergen}: ${a.reaction} (${a.severity}) [${a.provenance.source.name}]');
      }
    }

    buffer.writeln('\n[SURGICAL / CLINICAL PROCEDURES]');
    if (procedures.isEmpty) {
      buffer.writeln('- None documented');
    } else {
      for (var p in procedures) {
        buffer.writeln('- ${p.name} on ${p.procedureDate.toIso8601String().split('T').first} (${p.recoveryStatus})');
      }
    }

    if (activeRecoveryPlan != null) {
      buffer.writeln('\n[ACTIVE RECOVERY STATUS]');
      buffer.writeln('Plan: ${activeRecoveryPlan!.title}');
      buffer.writeln('Day: ${activeRecoveryPlan!.currentDayNumber}/${activeRecoveryPlan!.targetDurationDays} (${activeRecoveryPlan!.currentPhase})');
    }

    if (geneDrugFlags.isNotEmpty) {
      buffer.writeln('\n[GENE-DRUG SAFETY CONTEXT (FOR CLINICIAN REVIEW)]');
      for (var g in geneDrugFlags) {
        buffer.writeln('- Gene ${g.gene} (${g.variantOrPhenotype}) -> Drug: ${g.affectedDrug}: ${g.clinicalImplication}');
      }
    }

    return buffer.toString();
  }
}

class HealthContextEngine {
  static final HealthContextEngine _instance = HealthContextEngine._internal();
  factory HealthContextEngine() => _instance;
  HealthContextEngine._internal();

  final HealthMemoryService _memory = HealthMemoryService();

  Future<PersonalHealthContext> buildCurrentContext() async {
    final patient = await _memory.getPatientProfile();
    final conditions = await _memory.getConditions();
    final allergies = await _memory.getAllergies();
    final activeMedicines = await _memory.getActiveMedicines();
    final procedures = await _memory.getProcedures();
    final recentReports = await _memory.getReports();
    final recentSymptoms = await _memory.getRecentSymptoms(limit: 5);
    final doctorInstructions = await _memory.getDoctorInstructions();
    final activeRecoveryPlan = await _memory.getActiveRecoveryPlan();
    final recentAlerts = await _memory.getRecentAlerts(limit: 5);
    final geneDrugFlags = await _memory.getGeneDrugFlags();

    return PersonalHealthContext(
      patient: patient,
      conditions: conditions,
      allergies: allergies,
      activeMedicines: activeMedicines,
      procedures: procedures,
      recentReports: recentReports,
      recentSymptoms: recentSymptoms,
      doctorInstructions: doctorInstructions,
      activeRecoveryPlan: activeRecoveryPlan,
      recentAlerts: recentAlerts,
      geneDrugFlags: geneDrugFlags,
      generatedAt: DateTime.now(),
    );
  }
}
