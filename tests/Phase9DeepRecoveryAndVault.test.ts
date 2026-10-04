import { ContinuousRecoveryMonitor } from '../src/services/ContinuousRecoveryMonitor';
import { MultilingualService } from '../src/services/MultilingualService';
import { DoctorDirectoryService } from '../src/services/DoctorDirectoryService';
import { DocumentQualityService } from '../src/services/DocumentQualityService';
import { DocumentVaultService } from '../src/services/DocumentVaultService';
import { StorageAccountingService } from '../src/services/StorageAccountingService';

describe('Phase 9 — Deep Recovery Track, Vault, Multilingual & Doctor Tests', () => {
  const testCaseA = 'case_ravi_ortho_phase9';
  const testCaseB = 'case_patient2_phase9';

  describe('1. Continuous Recovery Monitoring & Delta Evaluation', () => {
    it('initializes a full recovery profile with 5 milestones and baseline parameters', () => {
      const profile = ContinuousRecoveryMonitor.getOrCreateProfile(testCaseA, {
        patientName: 'Ravi',
        doctorName: 'Dr. Ravi Kumar (Demo)',
        hospitalName: 'Rashi Orthopedic Hospital',
      });

      expect(profile.patientName).toBe('Ravi');
      expect(profile.currentDay).toBe(7);
      expect(profile.doctorSpecialty).toBe('Orthopedics');
      expect(profile.milestones.length).toBe(5);
      expect(profile.currentStatus).toBe('RECOVERING_WELL');
    });

    it('evaluates NO_CHANGE when parameters remain stable', () => {
      const prev = {
        id: 's1',
        recoveryCaseId: testCaseA,
        timestamp: new Date().toISOString(),
        painScore: 4,
        sleepHours: 7,
        medicationAdherence: 'FULL' as const,
        mobilityStatus: 'NORMAL' as const,
        reportedSymptoms: [],
        changeType: 'NO_CHANGE' as const,
        changeSummary: 'Stable',
      };

      const delta = ContinuousRecoveryMonitor.evaluateChange(prev, {
        painScore: 4,
        sleepHours: 7,
        medicationAdherence: 'FULL',
        mobilityStatus: 'NORMAL',
        reportedSymptoms: [],
      });

      expect(delta.changeType).toBe('NO_CHANGE');
      expect(delta.isConcerning).toBe(false);
    });

    it('detects MEANINGFUL_CHANGE when pain or sleep shifts moderately', () => {
      const prev = {
        id: 's1',
        recoveryCaseId: testCaseA,
        timestamp: new Date().toISOString(),
        painScore: 4,
        sleepHours: 7,
        medicationAdherence: 'FULL' as const,
        mobilityStatus: 'NORMAL' as const,
        reportedSymptoms: [],
        changeType: 'NO_CHANGE' as const,
        changeSummary: 'Stable',
      };

      const delta = ContinuousRecoveryMonitor.evaluateChange(prev, {
        painScore: 5,
        sleepHours: 6,
        medicationAdherence: 'FULL',
        mobilityStatus: 'NORMAL',
        reportedSymptoms: [],
      });

      expect(delta.changeType).toBe('MEANINGFUL_CHANGE');
      expect(delta.isConcerning).toBe(false);
    });

    it('detects CONCERNING_CHANGE when pain spikes >=3 points with reduced mobility', () => {
      const prev = {
        id: 's1',
        recoveryCaseId: testCaseA,
        timestamp: new Date().toISOString(),
        painScore: 4,
        sleepHours: 7,
        medicationAdherence: 'FULL' as const,
        mobilityStatus: 'NORMAL' as const,
        reportedSymptoms: [],
        changeType: 'NO_CHANGE' as const,
        changeSummary: 'Stable',
      };

      const delta = ContinuousRecoveryMonitor.evaluateChange(prev, {
        painScore: 7,
        sleepHours: 5,
        medicationAdherence: 'FULL',
        mobilityStatus: 'REDUCED',
        reportedSymptoms: ['Severe surgical site throbbing'],
      });

      expect(delta.changeType).toBe('CONCERNING_CHANGE');
      expect(delta.isConcerning).toBe(true);
    });

    it('records 10-minute snapshot and logs alert in recovery timeline', async () => {
      const snapshot = await ContinuousRecoveryMonitor.recordSnapshot(testCaseA, {
        painScore: 7,
        sleepHours: 5,
        medicationAdherence: 'FULL',
        mobilityStatus: 'REDUCED',
        rawUserInput: 'Pain is increasing and mobility is reduced',
      });

      expect(snapshot.changeType).toBe('CONCERNING_CHANGE');
      expect(snapshot.safetyEscalation?.isEscalated).toBe(true);

      const timeline = ContinuousRecoveryMonitor.getTimeline(testCaseA);
      expect(timeline.length).toBeGreaterThanOrEqual(1);
      expect(timeline[0].isAlert).toBe(true);
    });

    it('generates hourly recovery update with pain delta', () => {
      const update = ContinuousRecoveryMonitor.generateHourlyUpdate(testCaseA);
      expect(update.hourNumber).toBeDefined();
      expect(update.summaryText).toContain('Recovery Update');
      expect(update.modelUsed).toContain('Qwen 2.5 0.5B');
    });

    it('generates daily recovery summary with questions for doctor', () => {
      const daily = ContinuousRecoveryMonitor.generateDailySummary(testCaseA);
      expect(daily.dayNumber).toBe(7);
      expect(daily.questionsForDoctor.length).toBeGreaterThanOrEqual(3);
      expect(daily.questionsForDoctor[0]).toContain('pain medication');
    });
  });

  describe('2. Multilingual 4-Language Natural Recovery Parsing', () => {
    it('parses English statement: "My pain is higher than yesterday and I slept only five hours."', () => {
      const res = MultilingualService.extractMultilingualRecoveryState(
        'My pain is higher than yesterday and I slept only five hours.',
        4,
        7
      );

      expect(res.detectedLanguage).toBe('en');
      expect(res.painIncreased).toBe(true);
      expect(res.painScore).toBe(6);
      expect(res.sleepHours).toBe(5);
    });

    it('parses Telugu statement: "నాకు ఈరోజు నొప్పి నిన్నటికంటే ఎక్కువగా ఉంది మరియు 5 గంటలు నిద్రపోయాను"', () => {
      const res = MultilingualService.extractMultilingualRecoveryState(
        'నాకు ఈరోజు నొప్పి నిన్నటికంటే ఎక్కువగా ఉంది మరియు 5 గంటలు నిద్రపోయాను',
        4,
        7
      );

      expect(res.detectedLanguage).toBe('te');
      expect(res.painIncreased).toBe(true);
      expect(res.painScore).toBe(6);
      expect(res.sleepHours).toBe(5);
    });

    it('parses Hindi statement: "आज दर्द कल से ज्यादा है और मैं सिर्फ पांच घंटे सोया"', () => {
      const res = MultilingualService.extractMultilingualRecoveryState(
        'आज दर्द कल से ज्यादा है और मैं सिर्फ पांच घंटे सोया',
        4,
        7
      );

      expect(res.detectedLanguage).toBe('hi');
      expect(res.painIncreased).toBe(true);
      expect(res.painScore).toBe(6);
      expect(res.sleepHours).toBe(5);
    });

    it('parses Kannada statement: "ಇಂದು ನೋವು ನಿನ್ನೆಗಿಂತ ಹೆಚ್ಚಾಗಿದೆ ಮತ್ತು ಐದು ಗಂಟೆ ನಿದ್ರೆ ಮಾಡಿದೆ"', () => {
      const res = MultilingualService.extractMultilingualRecoveryState(
        'ಇಂದು ನೋವು ನಿನ್ನೆಗಿಂತ ಹೆಚ್ಚಾಗಿದೆ ಮತ್ತು ಐದು ಗಂಟೆ ನಿದ್ರೆ ಮಾಡಿದೆ',
        4,
        7
      );

      expect(res.detectedLanguage).toBe('kn');
      expect(res.painIncreased).toBe(true);
      expect(res.painScore).toBe(6);
      expect(res.sleepHours).toBe(5);
    });

    it('parses bilingual/mixed speech: "Doctor said 10 days rest, కానీ నాకు ఇంకా pain ఉంది"', () => {
      const res = MultilingualService.extractMultilingualRecoveryState(
        'Doctor said 10 days rest, కానీ నాకు ఇంకా pain ఉంది',
        4,
        7
      );

      expect(res.detectedLanguage).toBe('te');
      expect(res.painIncreased).toBe(true);
    });
  });

  describe('3. Doctor / Specialist Directory (12 Profiles)', () => {
    it('contains at least 12 fully populated specialist profiles', () => {
      const all = DoctorDirectoryService.getAllSpecialists();
      expect(all.length).toBeGreaterThanOrEqual(12);
    });

    it('includes all 12 core specialties', () => {
      const specialties = [
        'Orthopedics',
        'General Surgery',
        'Cardiology',
        'Neurology',
        'Physiotherapy',
        'Pulmonology',
        'Gastroenterology',
        'Dermatology',
        'ENT',
        'Urology',
        'Gynecology',
        'General Medicine',
      ];

      for (const spec of specialties) {
        const found = DoctorDirectoryService.getSpecialistsBySpecialty(spec);
        expect(found.length).toBeGreaterThanOrEqual(1);
        expect(found[0].isDemoProfile).toBe(true);
        expect(found[0].sampleInstructions.length).toBeGreaterThanOrEqual(2);
        expect(found[0].sampleRestrictions.length).toBeGreaterThanOrEqual(2);
        expect(found[0].typicalMilestones.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('searches doctors by condition name', () => {
      const results = DoctorDirectoryService.searchSpecialists('Knee Replacement');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].specialty).toBe('Orthopedics');
    });
  });

  describe('4. Medical Document Quality Gate & Handwriting Classification', () => {
    it('approves sharp high-resolution document scans', () => {
      const res = DocumentQualityService.assessImageQuality({
        uri: 'file:///images/prescription_clear.jpg',
        width: 1600,
        height: 2200,
        fileSizeBytes: 450000,
      });

      expect(res.isReadable).toBe(true);
      expect(res.qualityScore).toBeGreaterThanOrEqual(80);
      expect(res.recommendedAction).toBe('PROCEED');
    });

    it('flags blurry or poor-quality images with RETAKE recommendation', () => {
      const res = DocumentQualityService.assessImageQuality({
        uri: 'file:///images/blurry_scan.jpg',
        width: 1200,
        height: 1600,
      });

      expect(res.isReadable).toBe(false);
      expect(res.recommendedAction).toBe('RETAKE_BLURRY');
      expect(res.issues.length).toBeGreaterThan(0);
    });

    it('classifies Prescription documents accurately', () => {
      const text = 'Rx Tab Metformin 500mg PO BD after meals. Tab Telmisartan 40mg OD.';
      const res = DocumentQualityService.classifyDocument(text);
      expect(res.documentType).toBe('Prescription');
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('classifies Lab Reports accurately', () => {
      const text = 'Investigation CBC Diagnostic Laboratory. Hemoglobin 11.2 g/dL, Total Leukocyte Count 7200, Platelet Count 250000.';
      const res = DocumentQualityService.classifyDocument(text);
      expect(res.documentType).toBe('LabReport');
    });

    it('detects handwritten doctor scripts and shorthand abbreviations', () => {
      const text = 'Rx Tab Pantocid 40mg OD before breakfast. Cap Amox 500mg TDS x 5 days. c/o acute pain.';
      const res = DocumentQualityService.analyzeHandwriting(text, 'file:///images/handwritten_rx.jpg');

      expect(res.isHandwritten).toBe(true);
      expect(res.doctorShorthandDetected).toContain('rx');
      expect(res.doctorShorthandDetected).toContain('tab');
      expect(res.doctorShorthandDetected).toContain('od');
      expect(res.doctorShorthandDetected).toContain('tds');
    });
  });

  describe('5. Real Document Vault & Structured Lab Ingestion', () => {
    it('ingests lab reports and parses structured CBC / LFT values', () => {
      const raw = `Complete Blood Count (CBC)
Hemoglobin: 10.5 g/dL
WBC: 12500 cells/cumm
Platelet Count: 280000
Serum Creatinine: 1.1 mg/dL
AST: 32 U/L
ALT: 28 U/L`;

      const record = DocumentVaultService.addDocumentRecord(testCaseA, {
        title: 'CBC & Renal Panel',
        originalImageUri: 'file:///data/user/0/com.carewatch.medicalcompanion/files/images/cbc_scan.jpg',
        rawOcrText: raw,
        fileSizeBytes: 420000,
      });

      expect(record.documentType).toBe('LabReport');
      expect(record.originalImageUri).toContain('cbc_scan.jpg');
      expect(record.structuredLabResults?.length).toBeGreaterThanOrEqual(4);

      const hb = record.structuredLabResults?.find(l => l.testName.includes('Hemoglobin'));
      expect(hb?.value).toBe('10.5');
      expect(hb?.isAbnormal).toBe(true); // < 13.0
    });

    it('updates user verified text and transitions status to CONFIRMED', () => {
      const records = DocumentVaultService.getRecordsForCase(testCaseA);
      expect(records.length).toBeGreaterThan(0);

      const updated = DocumentVaultService.updateUserVerification(
        testCaseA,
        records[0].id,
        'Confirmed lab values: Hemoglobin 10.5 g/dL, WBC 12500.'
      );

      expect(updated?.status).toBe('CONFIRMED');
      expect(updated?.userVerifiedText).toContain('Confirmed lab values');
    });
  });

  describe('6. Storage Accounting & Safe Cache Cleanup', () => {
    it('calculates on-device storage breakdown across all categories', async () => {
      const breakdown = await StorageAccountingService.calculateStorageBreakdown();
      expect(breakdown.modelsBytes).toBeGreaterThan(0);
      expect(breakdown.totalAppBytes).toBeGreaterThan(0);
      expect(breakdown.modelsFormatted).toBeDefined();
      expect(breakdown.recordsFormatted).toBeDefined();
    });

    it('safely clears temporary cache without removing models or records', () => {
      const res = StorageAccountingService.clearCache();
      expect(res.freedBytes).toBeGreaterThan(0);
      expect(res.message).toContain('remain protected');
    });
  });

  describe('7. Case Isolation (Case A vs Case B)', () => {
    it('enforces strict activeCaseId scoping for recovery and documents', async () => {
      // Ingest into Case B
      ContinuousRecoveryMonitor.getOrCreateProfile(testCaseB, {
        patientName: 'Test Patient 2',
        doctorName: 'Dr. Priya Sharma (Demo)',
      });

      await ContinuousRecoveryMonitor.recordSnapshot(testCaseB, {
        painScore: 2,
        sleepHours: 8,
        medicationAdherence: 'FULL',
        mobilityStatus: 'NORMAL',
        rawUserInput: 'Patient 2 is fully mobile with minimal pain.',
      });

      DocumentVaultService.addDocumentRecord(testCaseB, {
        title: 'Patient 2 Discharge Summary',
        originalImageUri: 'file:///images/patient2_doc.jpg',
        rawOcrText: 'Discharge Summary for Test Patient 2. Fully recovered.',
      });

      const caseARecords = DocumentVaultService.getRecordsForCase(testCaseA);
      const caseBRecords = DocumentVaultService.getRecordsForCase(testCaseB);

      expect(caseARecords.some(r => r.title.includes('Patient 2'))).toBe(false);
      expect(caseBRecords.some(r => r.title.includes('Patient 2'))).toBe(true);

      const caseATimeline = ContinuousRecoveryMonitor.getTimeline(testCaseA);
      const caseBTimeline = ContinuousRecoveryMonitor.getTimeline(testCaseB);

      expect(caseATimeline.some(t => t.description.includes('Patient 2'))).toBe(false);
      expect(caseBTimeline.some(t => t.description.includes('Patient 2') || t.title.includes('Check-In'))).toBe(true);
    });
  });
});
