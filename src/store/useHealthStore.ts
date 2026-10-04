import { create } from 'zustand';
import {
  AllergyEntity,
  ConditionEntity,
  DailyCheckInEntity,
  MedicineEntity,
  PatientProfile,
  ProcedureEntity,
  RecoveryPlanEntity,
  ReportEntity,
} from '../types';
import { HealthMemoryService } from '../services/HealthMemoryService';
import { DynamicRecoveryScore, RecoveryEngine } from '../services/RecoveryEngine';

interface HealthState {
  patient: PatientProfile;
  conditions: ConditionEntity[];
  allergies: AllergyEntity[];
  medicines: MedicineEntity[];
  procedures: ProcedureEntity[];
  reports: ReportEntity[];
  recoveryPlan: RecoveryPlanEntity | null;
  checkIns: DailyCheckInEntity[];
  recoveryScore: DynamicRecoveryScore;
  refreshData: () => void;
  logCheckIn: (checkIn: DailyCheckInEntity) => void;
  addCheckIn: (checkIn: DailyCheckInEntity) => void;
  addMedicine: (med: MedicineEntity) => void;
  addCondition: (cond: ConditionEntity) => void;
  addAllergy: (allergy: AllergyEntity) => void;
  addReport: (rep: ReportEntity) => void;
}

export const useHealthStore = create<HealthState>((set, get) => {
  const memory = HealthMemoryService.getInstance();
  const initialCheckIns = memory.getCheckIns();
  const initialPlan = memory.getActiveRecoveryPlan();

  return {
    patient: memory.getPatientProfile(),
    conditions: memory.getConditions(),
    allergies: memory.getAllergies(),
    medicines: memory.getMedicines(),
    procedures: memory.getProcedures(),
    reports: memory.getReports(),
    recoveryPlan: initialPlan,
    checkIns: initialCheckIns,
    recoveryScore: RecoveryEngine.calculateRecoveryIndex(initialCheckIns, initialPlan),

    refreshData: () => {
      const checkIns = memory.getCheckIns();
      const recoveryPlan = memory.getActiveRecoveryPlan();
      set({
        patient: memory.getPatientProfile(),
        conditions: memory.getConditions(),
        allergies: memory.getAllergies(),
        medicines: memory.getMedicines(),
        procedures: memory.getProcedures(),
        reports: memory.getReports(),
        recoveryPlan,
        checkIns,
        recoveryScore: RecoveryEngine.calculateRecoveryIndex(checkIns, recoveryPlan),
      });
    },

    logCheckIn: (checkIn: DailyCheckInEntity) => {
      memory.addCheckIn(checkIn);
      get().refreshData();
    },

    addCheckIn: (checkIn: DailyCheckInEntity) => {
      memory.addCheckIn(checkIn);
      get().refreshData();
    },

    addMedicine: (med: MedicineEntity) => {
      memory.addMedicine(med);
      get().refreshData();
    },

    addCondition: (cond: ConditionEntity) => {
      memory.addCondition(cond);
      get().refreshData();
    },

    addAllergy: (allergy: AllergyEntity) => {
      memory.addAllergy(allergy);
      get().refreshData();
    },

    addReport: (rep: ReportEntity) => {
      memory.addReport(rep);
      get().refreshData();
    },
  };
});
