import '../../models/allergy.dart';
import '../../models/medicine.dart';
import '../../models/provenance.dart';

enum SafetyFlagSeverity {
  mild,
  moderate,
  severe,
  contraindicated,
}

class MedicationSafetyFlag {
  final String title;
  final String description;
  final SafetyFlagSeverity severity;
  final List<String> involvedMedications;
  final String recommendation;

  MedicationSafetyFlag({
    required this.title,
    required this.description,
    required this.severity,
    required this.involvedMedications,
    required this.recommendation,
  });
}

class MedicationSafetyChecker {
  // Known cross-reactivity mapping for allergy checking
  static final Map<String, List<String>> _allergyClassCrossReactivity = {
    'penicillin': ['amoxicillin', 'ampicillin', 'augmentin', 'penicillin', 'piperacillin'],
    'sulfa': ['sulfamethoxazole', 'bactrim', 'septra', 'sulfasalazine', 'celecoxib'],
    'aspirin': ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac'],
  };

  // Known clinically significant drug interactions
  static final List<Map<String, dynamic>> _interactionRules = [
    {
      'drugA': 'telmisartan',
      'drugB': 'potassium',
      'severity': SafetyFlagSeverity.moderate,
      'title': 'Hyperkalemia Risk',
      'desc': 'Telmisartan (ARB) combined with potassium supplements can increase serum potassium levels.',
      'rec': 'Monitor serum potassium and renal function periodically.',
    },
    {
      'drugA': 'telmisartan',
      'drugB': 'ibuprofen',
      'severity': SafetyFlagSeverity.moderate,
      'title': 'Reduced Antihypertensive & Renal Risk',
      'desc': 'NSAIDs like Ibuprofen may diminish the blood pressure lowering effect of Telmisartan and increase renal impairment risk.',
      'rec': 'Consult doctor. Paracetamol is generally preferred for mild pain.',
    },
    {
      'drugA': 'metformin',
      'drugB': 'iodinated contrast',
      'severity': SafetyFlagSeverity.severe,
      'title': 'Lactic Acidosis / Renal Contrast Risk',
      'desc': 'Metformin should generally be withheld prior to iodinated radiologic contrast procedures.',
      'rec': 'Notify radiology clinician regarding active Metformin therapy.',
    },
    {
      'drugA': 'tramadol',
      'drugB': 'ssri',
      'severity': SafetyFlagSeverity.severe,
      'title': 'Serotonin Syndrome Risk',
      'desc': 'Concomitant Tramadol with serotonergic agents can increase serotonin toxicity risk.',
      'rec': 'Clinician review mandatory.',
    },
  ];

  static List<MedicationSafetyFlag> evaluateSafety({
    required List<MedicineEntity> currentMedicines,
    required List<AllergyEntity> documentedAllergies,
    MedicineEntity? newCandidateMedicine,
  }) {
    final flags = <MedicationSafetyFlag>[];
    final allMeds = List<MedicineEntity>.from(currentMedicines);
    if (newCandidateMedicine != null) {
      allMeds.add(newCandidateMedicine);
    }

    // 1. Check Allergy Contraindications
    for (var allergy in documentedAllergies) {
      final allergyKey = allergy.allergen.toLowerCase();
      for (var med in allMeds) {
        final medName = (med.genericName.isNotEmpty ? med.genericName : med.name).toLowerCase();
        
        bool isMatch = false;
        if (medName.contains(allergyKey) || allergyKey.contains(medName)) {
          isMatch = true;
        } else {
          // Check class mapping
          for (var entry in _allergyClassCrossReactivity.entries) {
            if (allergyKey.contains(entry.key)) {
              if (entry.value.any((item) => medName.contains(item))) {
                isMatch = true;
                break;
              }
            }
          }
        }

        if (isMatch) {
          flags.add(
            MedicationSafetyFlag(
              title: 'Allergy Contraindication Detected: ${allergy.allergen}',
              description: 'Medication "${med.name}" matches or cross-reacts with documented allergy to ${allergy.allergen} (Reaction: ${allergy.reaction}).',
              severity: SafetyFlagSeverity.contraindicated,
              involvedMedications: [med.name],
              recommendation: 'DO NOT TAKE without immediate clinician consultation. Risk of allergic reaction.',
            ),
          );
        }
      }
    }

    // 2. Check Drug-Drug Interactions
    for (int i = 0; i < allMeds.length; i++) {
      for (int j = i + 1; j < allMeds.length; j++) {
        final nameA = (allMeds[i].genericName.isNotEmpty ? allMeds[i].genericName : allMeds[i].name).toLowerCase();
        final nameB = (allMeds[j].genericName.isNotEmpty ? allMeds[j].genericName : allMeds[j].name).toLowerCase();

        for (var rule in _interactionRules) {
          final ruleA = (rule['drugA'] as String).toLowerCase();
          final ruleB = (rule['drugB'] as String).toLowerCase();

          if ((nameA.contains(ruleA) && nameB.contains(ruleB)) ||
              (nameA.contains(ruleB) && nameB.contains(ruleA))) {
            flags.add(
              MedicationSafetyFlag(
                title: rule['title'],
                description: rule['desc'],
                severity: rule['severity'],
                involvedMedications: [allMeds[i].name, allMeds[j].name],
                recommendation: rule['rec'],
              ),
            );
          }
        }
      }
    }

    // 3. Duplicate Therapeutic Subclass Detection
    final seenGenerics = <String, MedicineEntity>{};
    for (var med in allMeds) {
      final gen = med.genericName.trim().toLowerCase();
      if (gen.isNotEmpty) {
        if (seenGenerics.containsKey(gen)) {
          flags.add(
            MedicationSafetyFlag(
              title: 'Duplicate Active Medication Detected: ${med.genericName}',
              description: 'Both "${seenGenerics[gen]!.name}" and "${med.name}" contain the same active ingredient (${med.genericName}).',
              severity: SafetyFlagSeverity.moderate,
              involvedMedications: [seenGenerics[gen]!.name, med.name],
              recommendation: 'Verify with clinician to prevent accidental double-dosing.',
            ),
          );
        } else {
          seenGenerics[gen] = med;
        }
      }
    }

    return flags;
  }

  List<String> checkMedicationContraindications({
    required String proposedMedicine,
    required List<AllergyEntity> patientAllergies,
    required List<MedicineEntity> currentMedicines,
  }) {
    final candidate = MedicineEntity(
      id: 'temp_candidate',
      name: proposedMedicine,
      dosage: '',
      frequency: '',
      startDate: DateTime.now(),
      provenance: Provenance.userReported(),
    );
    final flags = evaluateSafety(
      currentMedicines: currentMedicines,
      documentedAllergies: patientAllergies,
      newCandidateMedicine: candidate,
    );
    return flags.map((f) => '${f.title}: ${f.description}').toList();
  }
}
