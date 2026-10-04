import { AllergyEntity, MedicineEntity } from '../types';

export enum SafetyFlagSeverity {
  CriticalContraindication = 'CRITICAL_CONTRAINDICATION',
  PotentialInteraction = 'POTENTIAL_INTERACTION',
  DuplicateTherapy = 'DUPLICATE_THERAPY',
  PrecautionWarning = 'PRECAUTION_WARNING',
}

export interface MedicationSafetyFlag {
  flagType: SafetyFlagSeverity;
  title: string;
  description: string;
  affectedMedicines: string[];
  recommendation: string;
}

export class MedicationSafetyChecker {
  private static readonly KNOWN_DRUG_CLASSES: Record<string, string[]> = {
    penicillin: ['amoxicillin', 'ampicillin', 'augmentin', 'penicillin', 'piperacillin', 'cloxacillin'],
    nsaid: ['ibuprofen', 'naproxen', 'aspirin', 'diclofenac', 'ketorolac', 'celecoxib'],
    statin: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin'],
    arb_ace: ['telmisartan', 'losartan', 'valsartan', 'enalapril', 'ramipril', 'lisinopril'],
    beta_blocker: ['metoprolol', 'atenolol', 'bisoprolol', 'carvedilol', 'propranolol'],
    antiplatelet: ['clopidogrel', 'aspirin', 'ticagrelor', 'prasugrel'],
  };

  public static evaluateSafety(
    currentMedicines: MedicineEntity[],
    documentedAllergies: AllergyEntity[],
    newCandidateMedicine: MedicineEntity
  ): MedicationSafetyFlag[] {
    const flags: MedicationSafetyFlag[] = [];
    const candidateName = newCandidateMedicine.name.toLowerCase();
    const candidateGeneric = newCandidateMedicine.genericName.toLowerCase();

    // 1. Check Allergy Contraindications
    for (const allergy of documentedAllergies) {
      const allergen = allergy.allergen.toLowerCase();
      
      // Check direct allergen match or drug family match
      let isAllergic = false;
      if (candidateName.includes(allergen) || candidateGeneric.includes(allergen)) {
        isAllergic = true;
      }

      // Check Penicillin family
      if (allergen.includes('penicillin') || allergen.includes('amoxicillin')) {
        for (const drug of this.KNOWN_DRUG_CLASSES.penicillin) {
          if (candidateName.includes(drug) || candidateGeneric.includes(drug)) {
            isAllergic = true;
            break;
          }
        }
      }

      // Check NSAID family
      if (allergen.includes('nsaid') || allergen.includes('aspirin') || allergen.includes('ibuprofen')) {
        for (const drug of this.KNOWN_DRUG_CLASSES.nsaid) {
          if (candidateName.includes(drug) || candidateGeneric.includes(drug)) {
            isAllergic = true;
            break;
          }
        }
      }

      if (isAllergic) {
        flags.push({
          flagType: SafetyFlagSeverity.CriticalContraindication,
          title: `Severe Allergy Contraindication: ${allergy.allergen}`,
          description: `Patient has documented allergy to ${allergy.allergen} (Reaction: ${allergy.reaction}, Severity: ${allergy.severity}). Prescribing ${newCandidateMedicine.name} is strictly contraindicated.`,
          affectedMedicines: [newCandidateMedicine.name],
          recommendation: 'DO NOT administer. Seek immediate clinical alternative with treating physician.',
        });
      }
    }

    // 2. Check Duplicate Therapies
    for (const existing of currentMedicines) {
      if (!existing.isActive) continue;
      const exName = existing.name.toLowerCase();
      const exGeneric = existing.genericName.toLowerCase();

      // Exact generic duplicate
      if (
        (candidateGeneric && exGeneric && candidateGeneric === exGeneric) ||
        (candidateName.split(' ')[0] === exName.split(' ')[0])
      ) {
        flags.push({
          flagType: SafetyFlagSeverity.DuplicateTherapy,
          title: `Duplicate Therapy Detected: ${existing.name}`,
          description: `${newCandidateMedicine.name} contains the same active ingredient or brand family as active medication ${existing.name}.`,
          affectedMedicines: [existing.name, newCandidateMedicine.name],
          recommendation: 'Verify whether this is a replacement dosage or duplicate entry before confirming.',
        });
      }

      // Dual Antiplatelet / Anticoagulant warning
      const isCandidateAntiplatelet = this.KNOWN_DRUG_CLASSES.antiplatelet.some(d => candidateName.includes(d) || candidateGeneric.includes(d));
      const isExistingAntiplatelet = this.KNOWN_DRUG_CLASSES.antiplatelet.some(d => exName.includes(d) || exGeneric.includes(d));
      if (isCandidateAntiplatelet && isExistingAntiplatelet && exName !== candidateName) {
        flags.push({
          flagType: SafetyFlagSeverity.PotentialInteraction,
          title: 'Dual Antiplatelet / Bleeding Precaution',
          description: `Combining ${newCandidateMedicine.name} with ${existing.name} increases gastrointestinal and systemic bleeding risk.`,
          affectedMedicines: [existing.name, newCandidateMedicine.name],
          recommendation: 'Ensure dual antiplatelet therapy was intentionally prescribed with gastroprotection (PPI).',
        });
      }
    }

    return flags;
  }

  public static checkSafety(
    medicines: MedicineEntity[],
    allergies: AllergyEntity[]
  ): { hasSevereInteraction: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let hasSevere = false;

    // Check allergies against all medicines
    for (const med of medicines) {
      const flags = this.evaluateSafety(medicines, allergies, med);
      for (const flag of flags) {
        if (flag.flagType === SafetyFlagSeverity.CriticalContraindication) {
          hasSevere = true;
          warnings.push(flag.title);
        } else if (flag.flagType === SafetyFlagSeverity.PotentialInteraction) {
          warnings.push(flag.title);
        }
      }
    }

    return {
      hasSevereInteraction: hasSevere,
      warnings,
    };
  }
}

