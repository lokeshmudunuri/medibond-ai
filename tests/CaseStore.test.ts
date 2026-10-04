import { HealthMemoryService } from '../src/services/HealthMemoryService';

describe('CareBond General Health Track — Case Files System', () => {
  let memory: HealthMemoryService;

  beforeEach(() => {
    memory = HealthMemoryService.getInstance();
    memory.clearAllData();
  });

  test('should initialize with 0 cases in clean empty state', () => {
    const cases = memory.getCases();
    expect(cases.length).toBe(0);
  });

  test('should create a new Case File with doctor, hospital, and instructions', () => {
    const created = memory.createCase({
      title: 'Dr Ravi - Rashi Hospital',
      doctorName: 'Dr. Ravi Swaminathan',
      hospitalName: 'Rashi Hospital',
      specialty: 'Cardiology',
      description: 'Hypertension check and lipid panel review',
      initialInstructions: 'Take Telmisartan 40mg every morning after breakfast.',
      followUpDate: '2026-11-15',
      dietGuidance: 'Low sodium diet, reduce processed food.',
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Dr Ravi - Rashi Hospital');
    expect(created.status).toBe('ACTIVE');
    expect(created.doctorInstructions.length).toBe(1);

    const allCases = memory.getCases();
    expect(allCases.length).toBe(1);
    expect(allCases[0].id).toBe(created.id);
  });

  test('should associate medicines and reports specifically with a Case File', () => {
    const createdCase = memory.createCase({
      title: 'Dr Kumar - Apollo',
      doctorName: 'Dr. Kumar Sharma',
      hospitalName: 'Apollo Clinic',
    });

    // Add medicine scoped to this case
    memory.addMedicineToCase(createdCase.id, {
      id: 'med_test_1',
      caseId: createdCase.id,
      name: 'Telmisartan 40mg',
      genericName: 'Telmisartan',
      dosage: '40mg',
      frequency: 'Once daily',
      timing: 'Morning after food',
      instructions: 'Do not skip doses',
      startDate: '2026-10-04',
      isActive: true,
      isConfirmedByUser: true,
      reminderTimes: ['08:30'],
      prescribedForCondition: 'Hypertension',
      prescribingDoctor: 'Dr. Kumar Sharma',
      provenance: {
        source: 'DOC' as any,
        confidence: 0.95,
        recordedAt: '2026-10-04',
      },
    });

    const caseMeds = memory.getMedicinesByCase(createdCase.id);
    expect(caseMeds.length).toBe(1);
    expect(caseMeds[0].name).toBe('Telmisartan 40mg');
  });

  test('should generate focused case-scoped context for local LLM prompt', () => {
    const createdCase = memory.createCase({
      title: 'Appendix Surgery - Raju Hospital',
      doctorName: 'Dr. Sarah Chen',
      hospitalName: 'Raju Surgical Hospital',
      dietGuidance: 'Soft bland diet for 7 days.',
      initialInstructions: 'Keep incision dressing dry.',
    });

    const contextStr = memory.buildCaseContext(createdCase.id);
    expect(contextStr).toContain('Appendix Surgery - Raju Hospital');
    expect(contextStr).toContain('Dr. Sarah Chen');
    expect(contextStr).toContain('Raju Surgical Hospital');
    expect(contextStr).toContain('Soft bland diet for 7 days.');
  });

  test('should guarantee strict case isolation between multiple cases', () => {
    const caseA = memory.createCase({
      title: 'Diabetes Clinic - Dr Kumar',
      doctorName: 'Dr. Kumar',
      hospitalName: 'Apollo Care',
      dietGuidance: 'Low carb, strictly avoid sugar',
      initialInstructions: 'Monitor fasting blood sugar daily',
    });

    memory.addMedicineToCase(caseA.id, {
      id: 'med_metformin',
      caseId: caseA.id,
      name: 'Metformin 500mg',
      genericName: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      timing: 'With meals',
      instructions: 'Take with food',
      startDate: '2026-10-04',
      isActive: true,
      isConfirmedByUser: true,
      reminderTimes: ['08:00', '20:00'],
      prescribedForCondition: 'Type 2 Diabetes',
      prescribingDoctor: 'Dr. Kumar',
      provenance: { source: 'DOC' as any, confidence: 0.99, recordedAt: '2026-10-04' },
    });

    const caseB = memory.createCase({
      title: 'Fracture Recovery - Rashi Hospital',
      doctorName: 'Dr. Rashi Verma',
      hospitalName: 'Rashi Ortho Center',
      dietGuidance: 'High calcium and protein',
      initialInstructions: 'Keep left leg elevated on pillows',
    });

    memory.addMedicineToCase(caseB.id, {
      id: 'med_calcium',
      caseId: caseB.id,
      name: 'Calcium + Vitamin D3 500mg',
      genericName: 'Calcium Carbonate',
      dosage: '500mg',
      frequency: 'Once daily',
      timing: 'Night',
      instructions: 'Take after dinner',
      startDate: '2026-10-04',
      isActive: true,
      isConfirmedByUser: true,
      reminderTimes: ['21:00'],
      prescribedForCondition: 'Bone Healing',
      prescribingDoctor: 'Dr. Rashi Verma',
      provenance: { source: 'DOC' as any, confidence: 0.95, recordedAt: '2026-10-04' },
    });

    // Test Scoped Context for Case A
    const contextA = memory.buildCaseContext(caseA.id);
    expect(contextA).toContain('Diabetes Clinic - Dr Kumar');
    expect(contextA).toContain('Metformin 500mg');
    expect(contextA).toContain('Low carb, strictly avoid sugar');
    expect(contextA).not.toContain('Fracture Recovery');
    expect(contextA).not.toContain('Calcium + Vitamin D3');
    expect(contextA).not.toContain('Keep left leg elevated');

    // Test Scoped Context for Case B
    const contextB = memory.buildCaseContext(caseB.id);
    expect(contextB).toContain('Fracture Recovery - Rashi Hospital');
    expect(contextB).toContain('Calcium + Vitamin D3');
    expect(contextB).toContain('Keep left leg elevated');
    expect(contextB).not.toContain('Diabetes Clinic');
    expect(contextB).not.toContain('Metformin 500mg');
    expect(contextB).not.toContain('Low carb, strictly avoid sugar');
  });

  test('should load realistic demo data when explicitly requested', () => {
    memory.loadDemoData();
    const demoCases = memory.getCases();
    expect(demoCases.length).toBe(2);
    expect(demoCases[0].title).toBeDefined();
    expect(demoCases[1].title).toBeDefined();
  });
});
