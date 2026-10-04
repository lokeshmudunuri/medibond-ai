import '../../models/provenance.dart';
import '../health_context/health_context_engine.dart';

enum DoctorSummaryType {
  generalDoctor,
  specialist,
  followUp,
  recoveryReview,
  secondOpinion,
  urgentConsultation,
}

class DoctorSummaryReport {
  final DoctorSummaryType summaryType;
  final String title;
  final String patientHeader;
  final String activeConditionsSection;
  final String currentMedicationsSection;
  final String allergiesSection;
  final String surgicalHistorySection;
  final String recentReportsSection;
  final String recoveryStatusSection;
  final String recentSymptomsSection;
  final String safetyFlagsSection;
  final String genomicContextSection;
  final String clinicianQuestionsSection;
  final DateTime generatedDate;

  DoctorSummaryReport({
    required this.summaryType,
    required this.title,
    required this.patientHeader,
    required this.activeConditionsSection,
    required this.currentMedicationsSection,
    required this.allergiesSection,
    required this.surgicalHistorySection,
    required this.recentReportsSection,
    required this.recoveryStatusSection,
    required this.recentSymptomsSection,
    required this.safetyFlagsSection,
    required this.genomicContextSection,
    required this.clinicianQuestionsSection,
    required this.generatedDate,
  });

  String toFormattedPlainText() {
    final buffer = StringBuffer();
    buffer.writeln('===============================================================');
    buffer.writeln(' CAREBOND AI — CLINICAL HANDOFF & HEALTH CONTEXT SUMMARY');
    buffer.writeln('===============================================================');
    buffer.writeln('Summary Type: ${title.toUpperCase()}');
    buffer.writeln('Generated: ${generatedDate.toIso8601String().split('T').first} at ${generatedDate.hour.toString().padLeft(2, '0')}:${generatedDate.minute.toString().padLeft(2, '0')}');
    buffer.writeln('---------------------------------------------------------------');
    buffer.writeln(patientHeader);
    buffer.writeln('\n--- 1. DOCUMENTED CONDITIONS ---');
    buffer.writeln(activeConditionsSection);
    buffer.writeln('\n--- 2. CURRENT ACTIVE MEDICATIONS ---');
    buffer.writeln(currentMedicationsSection);
    buffer.writeln('\n--- 3. KNOWN ALLERGIES & CONTRAINDICATIONS ---');
    buffer.writeln(allergiesSection);
    buffer.writeln('\n--- 4. SURGICAL & PROCEDURAL HISTORY ---');
    buffer.writeln(surgicalHistorySection);
    buffer.writeln('\n--- 5. RECOVERY STATUS & POST-OP TIMELINE ---');
    buffer.writeln(recoveryStatusSection);
    buffer.writeln('\n--- 6. RECENT LABS & DIAGNOSTIC REPORTS ---');
    buffer.writeln(recentReportsSection);
    buffer.writeln('\n--- 7. RECENT PATIENT-REPORTED SYMPTOMS ---');
    buffer.writeln(recentSymptomsSection);
    if (safetyFlagsSection.isNotEmpty) {
      buffer.writeln('\n--- 8. SAFETY FLAGS & SYSTEM-DETECTED ALERTS ---');
      buffer.writeln(safetyFlagsSection);
    }
    if (genomicContextSection.isNotEmpty) {
      buffer.writeln('\n--- 9. GENOMIC / PHARMACOGENETIC CONTEXT ---');
      buffer.writeln(genomicContextSection);
    }
    buffer.writeln('\n--- 10. RELEVANT CLINICIAN REVIEW PROMPTS ---');
    buffer.writeln(clinicianQuestionsSection);
    buffer.writeln('\n===============================================================');
    buffer.writeln('NOTICE: Prepared from patient longitudinal records with provenance tags.');
    buffer.writeln('[DOC] = Clinically Documented | [USER] = User-Reported | [SYS] = System-Detected | [REVIEW] = Requires Review | [URGENT] = Urgent Escalation');
    buffer.writeln('===============================================================');
    return buffer.toString();
  }
}

class DoctorHandoffEngine {
  static final DoctorHandoffEngine _instance = DoctorHandoffEngine._internal();
  factory DoctorHandoffEngine() => _instance;
  DoctorHandoffEngine._internal();

  final HealthContextEngine _contextEngine = HealthContextEngine();

  Future<DoctorSummaryReport> generateSummary({
    required DoctorSummaryType type,
    String? targetedSpecialty,
  }) async {
    final context = await _contextEngine.buildCurrentContext();
    final p = context.patient;

    final patientHeader = 'PATIENT: ${p.name} | Age: ${p.age} | Sex: ${p.gender} | Blood: ${p.bloodGroup}\n'
        'Emergency Contact: ${p.emergencyContactName} (${p.emergencyContactPhone})';

    // 1. Conditions
    final condBuf = StringBuffer();
    if (context.conditions.isEmpty) {
      condBuf.writeln('No documented chronic conditions.');
    } else {
      for (var c in context.conditions) {
        condBuf.writeln('• [${c.provenance.source.shortCode}] ${c.name} (${c.status.toUpperCase()}) — Diagnosed: ${c.diagnosedDate.toIso8601String().split('T').first}. Notes: ${c.notes}');
      }
    }

    // 2. Medications
    final medBuf = StringBuffer();
    if (context.activeMedicines.isEmpty) {
      medBuf.writeln('No active medications recorded.');
    } else {
      for (var m in context.activeMedicines) {
        medBuf.writeln('• [${m.provenance.source.shortCode}] ${m.name} | Dose: ${m.dosage} | Freq: ${m.frequency} | Timing: ${m.timing}');
        if (m.instructions.isNotEmpty) {
          medBuf.writeln('   Instructions: ${m.instructions}');
        }
      }
    }

    // 3. Allergies
    final allgBuf = StringBuffer();
    if (context.allergies.isEmpty) {
      allgBuf.writeln('No known allergies recorded.');
    } else {
      for (var a in context.allergies) {
        allgBuf.writeln('• [${a.provenance.source.shortCode}] ⚠️ ALLERGY: ${a.allergen} — Reaction: ${a.reaction} (Severity: ${a.severity})');
      }
    }

    // 4. Procedures
    final procBuf = StringBuffer();
    if (context.procedures.isEmpty) {
      procBuf.writeln('No surgical procedures recorded.');
    } else {
      for (var pr in context.procedures) {
        procBuf.writeln('• [${pr.provenance.source.shortCode}] ${pr.name} on ${pr.procedureDate.toIso8601String().split('T').first} (${pr.hospital}). Status: ${pr.recoveryStatus}');
      }
    }

    // 5. Recovery Status
    final recBuf = StringBuffer();
    if (context.activeRecoveryPlan != null) {
      final pl = context.activeRecoveryPlan!;
      recBuf.writeln('Protocol: ${pl.title}');
      recBuf.writeln('Progress: Day ${pl.currentDayNumber} of ${pl.targetDurationDays} (${pl.currentPhase})');
      recBuf.writeln('Daily Target: ${pl.targetDailySteps.toInt()} steps | Target Rest: ${pl.targetRestHours} hrs');
    } else {
      recBuf.writeln('Patient is not currently under an active surgical recovery protocol.');
    }

    // 6. Reports
    final repBuf = StringBuffer();
    if (context.recentReports.isEmpty) {
      repBuf.writeln('No recent laboratory or radiology reports on file.');
    } else {
      for (var r in context.recentReports) {
        repBuf.writeln('• [${r.provenance.source.shortCode}] ${r.title} (${r.testDate.toIso8601String().split('T').first}):');
        for (var res in r.results) {
          final flag = res.isAbnormal ? ' [ABNORMAL]' : '';
          repBuf.writeln('   - ${res.testName}: ${res.value} ${res.unit} (Ref: ${res.referenceRange})$flag');
        }
      }
    }

    // 7. Symptoms
    final symBuf = StringBuffer();
    if (context.recentSymptoms.isEmpty) {
      symBuf.writeln('No recent acute symptoms logged.');
    } else {
      for (var s in context.recentSymptoms) {
        symBuf.writeln('• [${s.provenance.source.shortCode}] ${s.symptom} (Severity: ${s.severity}/10) at ${s.location} — Logged: ${s.loggedAt.toIso8601String().split('T').first}');
      }
    }

    // 8. Alerts & Safety Flags
    final alertBuf = StringBuffer();
    for (var al in context.recentAlerts) {
      alertBuf.writeln('• [${al.provenance.source.shortCode}] [${al.severity.name.toUpperCase()}] ${al.title}: ${al.explanation}');
    }

    // 9. Genomic Context
    final genBuf = StringBuffer();
    for (var g in context.geneDrugFlags) {
      genBuf.writeln('• [${g.provenance.source.shortCode}] Gene ${g.gene} (${g.variantOrPhenotype}) -> ${g.affectedDrug}: ${g.clinicalImplication}');
    }

    // 10. Clinician Prompts
    final promptBuf = StringBuffer();
    switch (type) {
      case DoctorSummaryType.generalDoctor:
        promptBuf.writeln('1. Review current antihypertensive and antidiabetic regimen adherence.');
        promptBuf.writeln('2. Confirm reconciliation of post-discharge medications.');
        break;
      case DoctorSummaryType.specialist:
        promptBuf.writeln('1. Specific focus for ${targetedSpecialty ?? "Specialist"}: Review medication interactions with ${context.activeMedicines.map((m) => m.name).join(", ")}.');
        promptBuf.writeln('2. Note severe penicillin allergy before prescribing antimicrobial therapy.');
        break;
      case DoctorSummaryType.recoveryReview:
        promptBuf.writeln('1. Inspect abdominal laparoscopic trocar port wound sites.');
        promptBuf.writeln('2. Evaluate readiness to transition from Phase 2 to full daily mobility.');
        break;
      case DoctorSummaryType.urgentConsultation:
        promptBuf.writeln('1. Urgent evaluation of acute symptom onset in context of post-surgical timeline.');
        promptBuf.writeln('2. Check for surgical site infection or systemic red flags.');
        break;
      default:
        promptBuf.writeln('1. Comprehensive health context review and medication reconciliation.');
    }

    String title;
    switch (type) {
      case DoctorSummaryType.generalDoctor:
        title = 'General Physician Health Context Summary';
        break;
      case DoctorSummaryType.specialist:
        title = 'Specialist Consultation Summary (${targetedSpecialty ?? "Specialty"})';
        break;
      case DoctorSummaryType.followUp:
        title = 'Clinical Follow-up Summary';
        break;
      case DoctorSummaryType.recoveryReview:
        title = 'Post-Operative Recovery Review Summary';
        break;
      case DoctorSummaryType.secondOpinion:
        title = 'Second Opinion Clinical Dossier';
        break;
      case DoctorSummaryType.urgentConsultation:
        title = 'Urgent Clinical Consultation Handoff';
        break;
    }

    return DoctorSummaryReport(
      summaryType: type,
      title: title,
      patientHeader: patientHeader,
      activeConditionsSection: condBuf.toString().trim(),
      currentMedicationsSection: medBuf.toString().trim(),
      allergiesSection: allgBuf.toString().trim(),
      surgicalHistorySection: procBuf.toString().trim(),
      recentReportsSection: repBuf.toString().trim(),
      recoveryStatusSection: recBuf.toString().trim(),
      recentSymptomsSection: symBuf.toString().trim(),
      safetyFlagsSection: alertBuf.toString().trim(),
      genomicContextSection: genBuf.toString().trim(),
      clinicianQuestionsSection: promptBuf.toString().trim(),
      generatedDate: DateTime.now(),
    );
  }
}
