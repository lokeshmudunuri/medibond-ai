import { DocumentProcessor } from '../src/services/DocumentProcessor';
import { ProvenanceSource } from '../src/types';

describe('DocumentProcessor Extraction & Provenance Tracking', () => {
  let processor: DocumentProcessor;

  beforeEach(() => {
    processor = DocumentProcessor.getInstance();
  });

  test('should parse prescription text and extract medications with provenance', async () => {
    const rxText = `
CLINIC PRESCRIPTION
Dr. Arvind Swaminathan
Rx:
1. Tab. Amoxicillin-Clavulanate 625mg - 1 tab BD x 7 days
2. Tab. Pantoprazole 40mg - 1 tab OD before breakfast
    `;

    const result = await processor.processDocument(rxText, 'Cardiology Prescription');
    expect(result.detectedDocumentType).toBe('Prescription');
    expect(result.extractedMedicines.length).toBeGreaterThan(0);

    const amox = result.extractedMedicines.find((m) => m.name.includes('Amoxicillin'));
    expect(amox).toBeDefined();
    expect(amox?.dosage).toBe('625mg');
    expect(amox?.provenance.source).toBe(ProvenanceSource.ClinicallyDocumented);
    expect(amox?.provenance.documentName).toBe('Cardiology Prescription');
  });

  test('should parse lab report text and extract CBC values', async () => {
    const labText = `
BLOOD WORK TEST REPORT
CBC:
- Hemoglobin: 13.8 g/dL
- Platelet Count: 240 x10^3/uL
- Serum Creatinine: 0.9 mg/dL
    `;

    const result = await processor.processDocument(labText, 'Routine CBC Panel');
    expect(result.detectedDocumentType).toBe('Lab');
    expect(result.extractedLabResults.length).toBeGreaterThan(0);

    const hb = result.extractedLabResults.find((r) => r.testName === 'Hemoglobin');
    expect(hb).toBeDefined();
    expect(hb?.value).toBe('13.8');
  });
});
