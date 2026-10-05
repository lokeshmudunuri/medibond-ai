import { DocumentProcessor } from '../src/services/DocumentProcessor';
import { HealthMemoryService } from '../src/services/HealthMemoryService';
import { ProvenanceSource } from '../src/types';

describe('DocumentProcessor Extraction, Normalization & Case Memory Integration', () => {
  let processor: DocumentProcessor;
  let memory: HealthMemoryService;

  beforeEach(() => {
    processor = DocumentProcessor.getInstance();
    memory = HealthMemoryService.getInstance();
    memory.clearAllData();
  });

  test('should classify different medical document types accurately', () => {
    const rxText = 'Rx: Tab. Metformin 500mg 1 tab BD after meals. Dr. Kumar.';
    const labText = 'Clinical Laboratory Report: Hemoglobin 14.2 g/dL, Total WBC 6500 /uL, Reference range: 13.5 - 17.5.';
    const dischargeText = 'Hospital Discharge Summary: Admission Date 2026-09-20. Operative procedure: Laparoscopic Appendectomy. Post-op discharge instructions.';
    const doctorText = 'Consultation Note: Dr. Sarah Chen. Chief complaint: Mild right lower quadrant soreness on ambulation.';

    expect(processor.classifyDocument(rxText).type).toBe('Prescription');
    expect(processor.classifyDocument(labText).type).toBe('Lab');
    expect(processor.classifyDocument(dischargeText).type).toBe('Discharge');
    expect(processor.classifyDocument(doctorText).type).toBe('DoctorNote');
  });

  test('should parse prescription text and extract medications with provenance', async () => {
    const rxText = `
CLINIC PRESCRIPTION
Dr. Arvind Swaminathan
Rashi Multi-Specialty Hospital
Date: 2026-10-04

Rx:
1. Tab. Amoxicillin-Clavulanate 625mg - 1 tab BD x 7 days after food
2. Tab. Pantoprazole 40mg - 1 tab OD before breakfast
    `;

    const result = await processor.processDocument(rxText, 'Cardiology Prescription');
    expect(result.detectedDocumentType).toBe('Prescription');
    expect(result.extractedMedicines.length).toBe(2);

    const amox = result.extractedMedicines.find((m) => m.name.toLowerCase().includes('amoxicillin'));
    expect(amox).toBeDefined();
    expect(amox?.dosage).toBe('625mg');
    expect(amox?.frequency).toBe('Twice daily');
    expect(amox?.provenance.source).toBe(ProvenanceSource.ClinicallyDocumented);
    expect(amox?.provenance.documentName).toBe('Cardiology Prescription');

    const panto = result.extractedMedicines.find((m) => m.name.toLowerCase().includes('pantoprazole'));
    expect(panto).toBeDefined();
    expect(panto?.dosage).toBe('40mg');
    expect(panto?.timing).toContain('Before meals');
  });

  test('should perform medicine name normalization for misspelled OCR text', async () => {
    const fuzzyRx = `
Rx:
1. Tab. Metfornin 500 - 1 tab BD
    `;

    const result = await processor.processDocument(fuzzyRx, 'Diabetes Note');
    expect(result.extractedMedicines.length).toBeGreaterThan(0);
    const met = result.extractedMedicines[0];
    expect(met.name).toContain('Metformin');
    expect(met.genericName).toBe('Metformin Hydrochloride');
    expect(met.provenance.source).toBe(ProvenanceSource.RequiresReview); // flagged as requiring review due to fuzzy match
  });

  test('should parse lab report text and extract structured metrics', async () => {
    const labText = `
CAREWATCH DIAGNOSTICS LABORATORY REPORT
Date: 2026-10-02
Patient: Alex Rivera

COMPLETE BLOOD COUNT (CBC):
- Hemoglobin: 13.8 g/dL (Ref: 13.5 - 17.5)
- Platelet Count: 240 x10^3/uL (Ref: 150 - 450)
- Serum Creatinine: 0.9 mg/dL (Ref: 0.7 - 1.3)
    `;

    const result = await processor.processDocument(labText, 'Routine CBC Panel');
    expect(result.detectedDocumentType).toBe('Lab');
    expect(result.extractedLabResults.length).toBe(3);

    const hb = result.extractedLabResults.find((r) => r.testName === 'Hemoglobin');
    expect(hb).toBeDefined();
    expect(hb?.value).toBe('13.8');
    expect(hb?.unit).toBe('g/dL');
    expect(hb?.isAbnormal).toBe(false);
  });

  test('should parse discharge summary and extract recovery instructions', async () => {
    const dischargeText = `
APOLLO HOSPITAL DISCHARGE SUMMARY
Dr. Ramesh Rao, MS
Date: 2026-09-30
Operative procedure: Laparoscopic Appendectomy

Discharge Instructions:
1. Keep surgical dressing clean and dry.
2. Avoid lifting heavy weights for 3 weeks.
3. Walk 15 minutes daily inside the room.
4. Take Pantoprazole 40mg daily before breakfast.
    `;

    const result = await processor.processDocument(dischargeText, 'Appendectomy Discharge');
    expect(result.detectedDocumentType).toBe('Discharge');
    expect(result.dischargeInfo).toBeDefined();
    expect(result.dischargeInfo?.instructions.length).toBeGreaterThan(0);
    expect(result.extractedMedicines.length).toBeGreaterThan(0);
  });

  test('should commit confirmed document and scoped medications directly into target Case File', async () => {
    const targetCase = memory.createCase({
      title: 'Dr. Kumar Cardiology',
      doctorName: 'Dr. Kumar',
      hospitalName: 'Apollo Heart Center',
    });

    const rxText = `
Rx:
1. Tab. Telmisartan 40mg - 1 tab OD morning after food
    `;

    const result = await processor.processDocument(rxText, 'Hypertension Rx', undefined, 'Prescription', targetCase.id);
    processor.commitDocumentToCase(result, targetCase.id);

    // Verify document was attached to case
    const caseReports = memory.getReportsByCase(targetCase.id);
    expect(caseReports.length).toBe(1);
    expect(caseReports[0].caseId).toBe(targetCase.id);

    // Verify medicine was attached to case
    const caseMeds = memory.getMedicinesByCase(targetCase.id);
    expect(caseMeds.length).toBe(1);
    expect(caseMeds[0].caseId).toBe(targetCase.id);
    expect(caseMeds[0].name).toContain('Telmisartan');
  });

  test('should delete document and disable associated medicines from memory', async () => {
    const rxText = 'Rx: Tab. Pantoprazole 40mg OD';
    const result = await processor.processDocument(rxText, 'Gastric Rx');
    processor.commitDocumentToCase(result);

    const reportsBefore = memory.getReports();
    expect(reportsBefore.length).toBe(1);

    const deleteSuccess = processor.deleteDocument(result.docId);
    expect(deleteSuccess).toBe(true);

    const activeMeds = memory.getMedicines(true);
    expect(activeMeds.length).toBe(0);
  });

  test('should support medicine confirmation lifecycle and timeline event recording', async () => {
    const rxText = 'Rx: Tab. Metformin 500mg 1 tab OD x 30 days. Dr. Ravi.';
    const result = await processor.processDocument(rxText, 'Diabetes Prescription');
    expect(result.extractedMedicines.length).toBe(1);

    const med = result.extractedMedicines[0];
    expect(med.duration).toBe('30 days');
    expect(med.confirmationStatus).toBe('PENDING_REVIEW');
    expect(med.isConfirmedByUser).toBe(false);

    memory.addMedicine(med);

    // Confirm medicine
    const confirmed = memory.confirmMedicine(med.id);
    expect(confirmed).toBe(true);

    const storedMed = memory.getMedicines().find((m) => m.id === med.id);
    expect(storedMed?.isConfirmedByUser).toBe(true);
    expect(storedMed?.confirmationStatus).toBe('CONFIRMED');

    // Verify timeline event was recorded
    const timeline = memory.getTimelineEvents();
    const confEvent = timeline.find((e) => e.eventType === 'MEDICINE_CONFIRMED');
    expect(confEvent).toBeDefined();
    expect(confEvent?.title).toContain('Metformin');
  });

  test('should enforce strict case isolation between multiple cases', async () => {
    // Case A: Dr. Ravi Swaminathan (Cardiology)
    const caseA = memory.createCase({
      title: 'Dr. Ravi - Rashi Hospital',
      doctorName: 'Dr. Ravi Swaminathan',
      hospitalName: 'Rashi Hospital',
      dietGuidance: 'Low sodium diet, reduce salt intake',
    });

    const rxA = 'Rx: Tab. Telmisartan 40mg OD after food x 30 days';
    const resultA = await processor.processDocument(rxA, 'Hypertension Rx', undefined, 'Prescription', caseA.id);
    processor.commitDocumentToCase(resultA, caseA.id);

    // Case B: Dr. Kumar (Surgical)
    const caseB = memory.createCase({
      title: 'Dr. Kumar - Apollo',
      doctorName: 'Dr. Kumar',
      hospitalName: 'Apollo Hospital',
      dietGuidance: 'Soft bland diet for 1 week',
    });

    const rxB = 'Rx: Tab. Amoxicillin 500mg TDS after food x 7 days';
    const resultB = await processor.processDocument(rxB, 'Post-Op Antibiotics', undefined, 'Prescription', caseB.id);
    processor.commitDocumentToCase(resultB, caseB.id);

    // Verify Case A only contains Telmisartan
    const caseAMeds = memory.getMedicinesByCase(caseA.id);
    expect(caseAMeds.length).toBe(1);
    expect(caseAMeds[0].name).toContain('Telmisartan');
    expect(caseAMeds[0].name).not.toContain('Amoxicillin');

    // Verify Case B only contains Amoxicillin
    const caseBMeds = memory.getMedicinesByCase(caseB.id);
    expect(caseBMeds.length).toBe(1);
    expect(caseBMeds[0].name).toContain('Amoxicillin');
    expect(caseBMeds[0].name).not.toContain('Telmisartan');

    // Verify Case Context Strings have zero leakage
    const contextA = memory.buildCaseContext(caseA.id);
    expect(contextA).toContain('Telmisartan');
    expect(contextA).not.toContain('Amoxicillin');

    const contextB = memory.buildCaseContext(caseB.id);
    expect(contextB).toContain('Amoxicillin');
    expect(contextB).not.toContain('Telmisartan');
  });

  test('should provide grounded diet guidance based strictly on case instructions', () => {
    const caseA = memory.createCase({
      title: 'Dr. Ravi - Rashi Hospital',
      doctorName: 'Dr. Ravi',
      hospitalName: 'Rashi Hospital',
      dietGuidance: 'Low sodium diet, avoid salty and deep-fried snacks.',
    });

    const dietA = memory.getDietGuidance(caseA.id);
    expect(dietA.hasSpecificGuidance).toBe(true);
    expect(dietA.guidanceText).toContain('Low sodium diet');

    // Unspecified case
    const emptyCase = memory.createCase({
      title: 'General Checkup',
      doctorName: 'Dr. Smith',
      hospitalName: 'General Clinic',
    });

    const dietEmpty = memory.getDietGuidance(emptyCase.id);
    expect(dietEmpty.hasSpecificGuidance).toBe(false);
    expect(dietEmpty.guidanceText).toContain("I don't have enough information in this case to give you a reliable personalized answer");
  });

  test('should accurately parse Fixture A (Dolo 650, Augmentin 625, Montek-LC, BP, Pulse, SpO2) and retain 14 fields', async () => {
    const fixtureAText = `
Dr. R. K. Sharma, MD
CareWell Clinic
Date: 2026-10-05

Vitals:
BP: 110/70 mmHg
Pulse ~112 bpm
SpO2 ~96-97%

Rx:
1. Tab. Dolo 650 TDS after food
2. Tab. Augmentin 625 1 tab BD x 5 days
3. Tab. Montek-LC 1 tab OD at bedtime
    `;

    const result = await processor.processDocument(fixtureAText, 'Prescription Fixture A', 'fixtures/prescriptions/prescription_1.jpeg');

    // 14 Mandatory fields check
    const r = result.report;
    expect(r.originalImagePath).toBe('fixtures/prescriptions/prescription_1.jpeg');
    expect(r.documentType).toBe('Prescription');
    expect(r.rawOcrText).toBeDefined();
    expect(r.handwritingOcrText).toBeDefined();
    expect(r.mergedTranscript).toBeDefined();
    expect(r.extractedMedicines).toBeDefined();
    expect(r.extractedVitals).toBeDefined();
    expect(r.extractedLabs).toBeDefined();
    expect(r.extractedDoctor).toBeDefined();
    expect(r.extractedDate).toBeDefined();
    expect(r.confidence).toBeGreaterThan(0.7);
    expect(r.provenance).toBeDefined();
    expect(r.requiresReview).toBeDefined();
    expect(r.createdAt).toBeDefined();

    // Specific Fixture A clinical assertions
    const medNames = r.extractedMedicines!.map((m) => m.name.toLowerCase());
    expect(medNames.some((n) => n.includes('dolo 650') || n.includes('dolo'))).toBe(true);
    expect(medNames.some((n) => n.includes('augmentin 625') || n.includes('augmentin'))).toBe(true);
    expect(medNames.some((n) => n.includes('montek-lc') || n.includes('montek'))).toBe(true);

    // Vitals
    expect(r.extractedVitals?.bloodPressure).toBe('110/70');
    expect(r.extractedVitals?.pulse).toBe(112);
    expect(r.extractedVitals?.spo2).toBe(96);
  });

  test('should accurately parse Fixture B (Tazloc-CT, Amlip, Pantocid 40, Provigon-HP, Vitals)', async () => {
    const fixtureBText = `
Dr. Anita Desai
Apex Heart & Vascular
Date: 2026-10-04

Vitals:
BP 140/100
Pulse: 72 bpm
SpO2: 98%
Bilateral pedal edema present
Facial puffiness noted

Rx:
1. Tab. Tazloc-CT 40/12.5 OD morning
2. Tab. Amlip 5 OD
3. Tab. Pantocid 40 OD before breakfast
4. Tab. Provigon-HP OD
    `;

    const result = await processor.processDocument(fixtureBText, 'Prescription Fixture B', 'fixtures/prescriptions/prescription_2.jpeg');
    const r = result.report;

    const medNames = r.extractedMedicines!.map((m) => m.name.toLowerCase());
    expect(medNames.some((n) => n.includes('tazloc'))).toBe(true);
    expect(medNames.some((n) => n.includes('amlip') || n.includes('amlodipine'))).toBe(true);
    expect(medNames.some((n) => n.includes('pantocid') || n.includes('pantoprazole'))).toBe(true);
    expect(medNames.some((n) => n.includes('provigon'))).toBe(true);

    expect(r.extractedVitals?.bloodPressure).toBe('140/100');
    expect(r.extractedVitals?.pulse).toBe(72);
    expect(r.extractedVitals?.spo2).toBe(98);
    expect(r.extractedVitals?.observations?.some((o) => o.toLowerCase().includes('edema') || o.toLowerCase().includes('puffiness'))).toBe(true);
  });

  test('should accurately parse Fixture C (Pramipexole 0.25 mg, Syndopa-110, Rasagiline 0.5 mg, Amantadine)', async () => {
    const fixtureCText = `
Dr. Vikram Sengupta, DM Neurology
Movement Disorders Clinic
Date: 2026-10-03

Rx:
1. Tab. Pramipexole 0.25 mg TDS
2. Tab. Syndopa-110 TDS
3. Tab. Rasagiline 0.5 mg OD
4. Cap. Amantadine 100 mg BD (Mirapex continuation)
    `;

    const result = await processor.processDocument(fixtureCText, 'Prescription Fixture C', 'fixtures/prescriptions/prescription_3.jpeg');
    const r = result.report;

    const medNames = r.extractedMedicines!.map((m) => m.name.toLowerCase());
    expect(medNames.some((n) => n.includes('pramipexole'))).toBe(true);
    expect(medNames.some((n) => n.includes('syndopa'))).toBe(true);
    expect(medNames.some((n) => n.includes('rasagiline'))).toBe(true);
    expect(medNames.some((n) => n.includes('amantadine'))).toBe(true);
  });
});
