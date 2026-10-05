import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { DocumentVaultService, DocumentVaultRecord } from '../services/DocumentVaultService';
import { useCaseStore } from '../store/useCaseStore';

export const DocumentVaultScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { activeCaseId, activeCase } = useCaseStore();
  const [records, setRecords] = useState<DocumentVaultRecord[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<string>('ALL');
  const [activeModalRecord, setActiveModalRecord] = useState<DocumentVaultRecord | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const loadRecords = () => {
    if (activeCaseId) {
      setRecords(DocumentVaultService.getRecordsForCase(activeCaseId));
    } else {
      setRecords(DocumentVaultService.getAllRecords());
    }
  };

  useEffect(() => {
    loadRecords();
  }, [activeCaseId]);

  const docTypes = ['ALL', 'Prescription', 'LabReport', 'DischargeSummary', 'DoctorNote', 'ImagingReport'];

  const filteredRecords = selectedDocType === 'ALL'
    ? records
    : records.filter(r => r.documentType === selectedDocType);

  const handleOpenDoc = (rec: DocumentVaultRecord) => {
    setActiveModalRecord(rec);
    setEditingText(rec.userVerifiedText || rec.rawOcrText);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (activeModalRecord && activeCaseId) {
      const updated = DocumentVaultService.updateUserVerification(
        activeCaseId,
        activeModalRecord.id,
        editingText
      );
      if (updated) {
        setActiveModalRecord(updated);
        setIsEditing(false);
        loadRecords();
        Alert.alert('Record Confirmed', 'Extracted medical document text has been confirmed and saved.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (navigation ? navigation.goBack() : null)}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical Document Vault</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {activeCase ? `Scoped to: ${activeCase.title}` : 'All On-Device Patient Records'}
        </Text>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {docTypes.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.filterPill, selectedDocType === t && styles.activeFilterPill]}
              onPress={() => setSelectedDocType(t)}
            >
              <Text style={[styles.filterPillText, selectedDocType === t && styles.activeFilterPillText]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyTitle}>No Documents in Vault</Text>
            <Text style={styles.emptyText}>
              Scan a prescription, lab report, or doctor note using the camera to store original documents here.
            </Text>
          </View>
        ) : (
          filteredRecords.map(rec => (
            <TouchableOpacity
              key={rec.id}
              style={styles.recordCard}
              onPress={() => handleOpenDoc(rec)}
            >
              <View style={styles.recordHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{rec.documentType}</Text>
                </View>
                <View style={[
                  styles.confidenceBadge,
                  rec.confidence === 'HIGH' ? styles.confHigh : rec.confidence === 'MEDIUM' ? styles.confMed : styles.confLow,
                ]}>
                  <Text style={styles.confidenceText}>
                    {rec.isHandwritten ? '✍️ Handwriting: ' : '🖨️ '}
                    {rec.confidence}
                  </Text>
                </View>
              </View>

              <Text style={styles.recordTitle}>{rec.title}</Text>
              <Text style={styles.recordDate}>Captured: {new Date(rec.captureDate).toLocaleDateString()} • {rec.fileSizeFormatted}</Text>

              {rec.structuredLabResults && rec.structuredLabResults.length > 0 && (
                <View style={styles.labSnippet}>
                  <Text style={styles.labSnippetTitle}>📊 Structured Lab Values ({rec.structuredLabResults.length} parameters):</Text>
                  {rec.structuredLabResults.slice(0, 3).map((l, i) => (
                    <Text key={i} style={[styles.labItemText, l.isAbnormal && styles.abnormalText]}>
                      • {l.testName}: <Text style={styles.bold}>{l.value} {l.unit}</Text> {l.isAbnormal ? '⚠️ [Abnormal]' : '✓'}
                    </Text>
                  ))}
                </View>
              )}

              <Text style={styles.ocrSnippet} numberOfLines={2}>
                "{rec.userVerifiedText || rec.rawOcrText}"
              </Text>

              <View style={styles.footerRow}>
                <Text style={styles.statusTag}>Status: {rec.status}</Text>
                <Text style={styles.viewDocLink}>View Original & Extracted Info →</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Document Detail Modal */}
      {activeModalRecord && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setActiveModalRecord(null)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <TouchableOpacity onPress={() => setActiveModalRecord(null)} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>{activeModalRecord.title}</Text>
                  <Text style={styles.modalSubtitle}>{activeModalRecord.documentType} • {activeModalRecord.fileSizeFormatted}</Text>
                </View>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Original Image Section */}
              <Text style={styles.sectionHeading}>🖼️ Original Captured Image (Preserved)</Text>
              <View style={styles.imagePreviewBox}>
                {activeModalRecord.originalImageUri && activeModalRecord.originalImageUri.startsWith('http') || activeModalRecord.originalImageUri.startsWith('file') ? (
                  <Image source={{ uri: activeModalRecord.originalImageUri }} style={styles.fullImage} resizeMode="contain" />
                ) : (
                  <View style={styles.placeholderImg}>
                    <Text style={styles.placeholderImgIcon}>📄</Text>
                    <Text style={styles.placeholderImgText}>Original high-resolution scan preserved locally</Text>
                  </View>
                )}
              </View>

              {/* Lab Results Table */}
              {activeModalRecord.structuredLabResults && activeModalRecord.structuredLabResults.length > 0 && (
                <View style={styles.labSection}>
                  <Text style={styles.sectionHeading}>🧪 Extracted Laboratory Values</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeadCell, { flex: 2 }]}>Test</Text>
                      <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>Value</Text>
                      <Text style={[styles.tableHeadCell, { flex: 1.5 }]}>Ref Range</Text>
                      <Text style={[styles.tableHeadCell, { flex: 1 }]}>Status</Text>
                    </View>
                    {activeModalRecord.structuredLabResults.map((lab, i) => (
                      <View key={i} style={[styles.tableRow, lab.isAbnormal && styles.tableRowAbnormal]}>
                        <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>{lab.testName}</Text>
                        <Text style={[styles.tableCell, { flex: 1.2 }]}>{lab.value} {lab.unit}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5, fontSize: 11, color: '#64748b' }]}>{lab.referenceRange}</Text>
                        <Text style={[styles.tableCell, { flex: 1, color: lab.isAbnormal ? '#dc2626' : '#16a34a', fontWeight: '700' }]}>
                          {lab.isAbnormal ? 'High' : 'Normal'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* OCR & Handwriting Verification */}
              <View style={styles.ocrSection}>
                <View style={styles.ocrHeadingRow}>
                  <Text style={styles.sectionHeading}>
                    {activeModalRecord.isHandwritten ? '✍️ Handwriting Recognition' : '🖨️ OCR Extracted Text'}
                  </Text>
                  {!isEditing ? (
                    <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editPill}>
                      <Text style={styles.editPillText}>✏️ Edit Text</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={handleSaveEdit} style={styles.savePill}>
                      <Text style={styles.savePillText}>💾 Save & Confirm</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isEditing ? (
                  <TextInput
                    style={styles.textEditor}
                    multiline
                    value={editingText}
                    onChangeText={setEditingText}
                  />
                ) : (
                  <View style={styles.textDisplayBox}>
                    <Text style={styles.extractedText}>{activeModalRecord.userVerifiedText || activeModalRecord.rawOcrText}</Text>
                  </View>
                )}
              </View>

              {/* AI Clinical Explanation */}
              {activeModalRecord.aiExplanation && (
                <View style={styles.aiCard}>
                  <Text style={styles.aiTitle}>🤖 Local AI Clinical Explanation</Text>
                  <Text style={styles.aiText}>{activeModalRecord.aiExplanation}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0f172a', padding: 16, paddingTop: 16 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 10,
  },
  backBtnText: { color: '#38bdf8', fontSize: 13, fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  headerSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2, marginBottom: 12 },
  filterBar: { flexDirection: 'row', marginTop: 4 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 8,
  },
  activeFilterPill: { backgroundColor: '#0284c7' },
  filterPillText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  activeFilterPillText: { color: '#ffffff' },
  content: { padding: 16, paddingBottom: 40 },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 32, alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  recordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { color: '#0369a1', fontSize: 11, fontWeight: '700' },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  confHigh: { backgroundColor: '#dcfce7' },
  confMed: { backgroundColor: '#fef9c3' },
  confLow: { backgroundColor: '#fee2e2' },
  confidenceText: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  recordTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  recordDate: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  labSnippet: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  labSnippetTitle: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 },
  labItemText: { fontSize: 12, color: '#475569', marginVertical: 1 },
  bold: { fontWeight: '700', color: '#0f172a' },
  abnormalText: { color: '#dc2626' },
  ocrSnippet: { fontSize: 12, color: '#475569', fontStyle: 'italic', marginBottom: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  statusTag: { fontSize: 11, fontWeight: '600', color: '#0284c7' },
  viewDocLink: { fontSize: 12, fontWeight: '700', color: '#0284c7' },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    backgroundColor: '#0f172a',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  modalSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  closeBtn: { padding: 8 },
  closeBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 16 },
  sectionHeading: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  imagePreviewBox: {
    backgroundColor: '#000000',
    borderRadius: 12,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  fullImage: { width: '100%', height: '100%' },
  placeholderImg: { alignItems: 'center' },
  placeholderImgIcon: { fontSize: 40, marginBottom: 6 },
  placeholderImgText: { color: '#94a3b8', fontSize: 12 },
  labSection: { marginBottom: 16 },
  table: { backgroundColor: '#ffffff', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 8 },
  tableHeadCell: { fontSize: 11, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
  tableRowAbnormal: { backgroundColor: '#fef2f2' },
  tableCell: { fontSize: 12, color: '#1e293b' },
  ocrSection: { marginBottom: 16 },
  ocrHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  editPill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  editPillText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  savePill: { backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  savePillText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  textEditor: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0284c7',
    fontSize: 13,
    color: '#0f172a',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  textDisplayBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  extractedText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  aiCard: { backgroundColor: '#f0f9ff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#bae6fd', marginBottom: 20 },
  aiTitle: { fontSize: 13, fontWeight: '700', color: '#0369a1', marginBottom: 4 },
  aiText: { fontSize: 12, color: '#0c4a6e', lineHeight: 18 },
});
