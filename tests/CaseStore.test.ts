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

  test('should load realistic demo data when explicitly requested', () => {
    memory.loadDemoData();
    const demoCases = memory.getCases();
    expect(demoCases.length).toBe(2);
    expect(demoCases[0].title).toBeDefined();
    expect(demoCases[1].title).toBeDefined();
  });
});
