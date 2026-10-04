import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useDocumentStore } from '../store/useDocumentStore';
import { useHealthStore } from '../store/useHealthStore';
import { ProcessedDocumentResult } from '../services/DocumentProcessor';
import { ProvenanceSource, ReportEntity } from '../types';

export const DocumentsScreen: React.FC = () => {
  const { reports, scanDocument, isScanning } = useDocumentStore();
  const { addMedicine } = useHealthStore();

  const [activeTab, setActiveTab] = useState<'all' | 'prescriptions' | 'labs' | 'discharge'>('all');
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [docTitle, setDocTitle] = useState('New Medical Document');
  const [ocrInputText, setOcrInputText] = useState('');
  const [latestScanResult, setLatestScanResult] = useState<ProcessedDocumentResult | null>(null);

  const samplePrescription = `CLINIC PRESCRIPTION
Dr. Arvind Swaminathan, MD (Cardiology)
Date: 2026-10-04
Patient: Alex Rivera

Rx:
1. Tab. Amoxicillin-Clavulanate 625mg - 1 tab BD (After meals) x 7 days
2. Tab. Pantoprazole 40mg - 1 tab OD (Before breakfast) x 14 days
3. Tab. Paracetamol 650mg - 1 tab SOS (For pain/fever)
Instructions: Take complete antibiotic course.`;

  const sampleLabReport = `CAREWATCH CLINICAL LABORATORY REPORT
Patient: Alex Rivera | Ref: Dr. Sarah Chen
Date: 2026-10-02

COMPLETE BLOOD COUNT (CBC):
- Hemoglobin: 13.8 g/dL (Normal: 13.5 - 17.5)
- Platelet Count: 240 x10^3/uL (Normal: 150 - 450)
- Total WBC: 7,200 /uL (Normal: 4,000 - 11,000)
- Serum Creatinine: 0.9 mg/dL (Normal: 0.7 - 1.3)
Status: All values within normal physiological ranges.`;

  const handleOpenScan = (type: 'rx' | 'lab') => {
    if (type === 'rx') {
      setDocTitle('Cardiology Prescription');
      setOcrInputText(samplePrescription);
    } else {
      setDocTitle('Routine Blood Work Report');
      setOcrInputText(sampleLabReport);
    }
    setScanModalVisible(true);
  };

  const handleRunOcrProcess = async () => {
    if (!ocrInputText.trim()) {
      Alert.alert('Empty Document', 'Please enter or capture document text.');
      return;
    }

    try {
      const result = await scanDocument(ocrInputText, docTitle);
      setLatestScanResult(result);
      setScanModalVisible(false);
      Alert.alert(
        'Document Processed',
        `Successfully extracted ${result.extractedMedicines.length} medications and ${result.extractedLabResults.length} lab results directly into Health Memory.`
      );
    } catch (err: any) {
      Alert.alert('Processing Error', err?.message || 'Failed to process document');
    }
  };

  const filteredReports = reports.filter((r) => {
    if (activeTab === 'prescriptions') return r.type === 'Prescription';
    if (activeTab === 'labs') return r.type === 'Lab';
    if (activeTab === 'discharge') return r.type === 'Discharge';
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Medical Documents & OCR</Text>
          <Text style={styles.headerSubtitle}>Prescription Scanner • Lab Reports • Provenance Tracking</Text>
        </View>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.scanActionBtn} onPress={() => handleOpenScan('rx')}>
            <Text style={styles.scanActionBtnText}>📷 Scan Rx</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.scanActionBtn, styles.labActionBtn]} onPress={() => handleOpenScan('lab')}>
            <Text style={styles.scanActionBtnText}>🧪 Scan Lab</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {(['all', 'prescriptions', 'labs', 'discharge'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Document List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📄</Text>
            <Text style={styles.emptyTitle}>No Documents Found</Text>
            <Text style={styles.emptySubtitle}>
              Scan a prescription or medical report above to extract medications and test results automatically.
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{report.type}</Text>
                </View>
                <Text style={styles.reportDate}>{report.testDate}</Text>
              </View>

              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportFacility}>🏥 {report.laboratoryOrHospital}</Text>
              <Text style={styles.reportSummary}>{report.summary}</Text>

              {report.results && report.results.length > 0 && (
                <View style={styles.labResultsContainer}>
                  <Text style={styles.labResultsHeader}>Extracted Metrics:</Text>
                  {report.results.map((res, i) => (
                    <View key={i} style={styles.labRow}>
                      <Text style={styles.labName}>{res.testName}:</Text>
                      <Text style={styles.labValue}>
                        {res.value} {res.unit} (Ref: {res.referenceRange})
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.provenanceRow}>
                <Text style={styles.provenanceText}>
                  🛡️ Provenance: {report.provenance.source} (Confidence: {Math.round(report.provenance.confidence * 100)}%)
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Scan / OCR Processing Modal */}
      <Modal visible={scanModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scan / Ingest Medical Document</Text>
            <Text style={styles.modalSubtitle}>OCR will extract medications, dosages, and lab values locally.</Text>

            <Text style={styles.inputLabel}>Document Title:</Text>
            <TextInput
              style={styles.textInput}
              value={docTitle}
              onChangeText={setDocTitle}
              placeholder="e.g. Cardiology Prescription"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputLabel}>OCR Scanned Text Content:</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={ocrInputText}
              onChangeText={setOcrInputText}
              multiline={true}
              numberOfLines={8}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setScanModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalProcessBtn}
                onPress={handleRunOcrProcess}
                disabled={isScanning}
              >
                <Text style={styles.modalProcessBtnText}>
                  {isScanning ? 'Processing...' : 'Extract Entities'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  scanActionBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  labActionBtn: {
    backgroundColor: '#0D9488',
  },
  scanActionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  tabButtonActive: { backgroundColor: '#38BDF8' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  tabTextActive: { color: '#0F172A' },
  scrollContent: { padding: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', maxWidth: 280, marginTop: 6 },
  reportCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: {
    backgroundColor: '#0284C722',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  typeBadgeText: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
  reportDate: { color: '#94A3B8', fontSize: 12 },
  reportTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC', marginTop: 8 },
  reportFacility: { fontSize: 12, color: '#CBD5E1', marginTop: 2 },
  reportSummary: { fontSize: 13, color: '#94A3B8', marginTop: 8, lineHeight: 18 },
  labResultsContainer: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  labResultsHeader: { fontSize: 12, fontWeight: '700', color: '#38BDF8', marginBottom: 6 },
  labRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  labName: { fontSize: 12, color: '#E2E8F0', fontWeight: '600' },
  labValue: { fontSize: 12, color: '#94A3B8' },
  provenanceRow: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  provenanceText: { fontSize: 11, color: '#64748B' },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  modalSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 4, marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#CBD5E1', marginBottom: 4 },
  textInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  textArea: { height: 140, textAlignVertical: 'top' },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  modalCancelBtnText: { color: '#E2E8F0', fontWeight: '600' },
  modalProcessBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  modalProcessBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
