import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Image,
} from 'react-native';
import { useDocumentStore } from '../store/useDocumentStore';
import { HealthMemoryService } from '../services/HealthMemoryService';
import { MedicalDocumentReasoningService } from '../services/MedicalDocumentReasoningService';
import { MedicationReminderService } from '../services/MedicationReminderService';
import { DocumentVaultService } from '../services/DocumentVaultService';
import { DocumentClassificationType } from '../services/DocumentProcessor';
import { CaseFile, HealthTimelineEvent, MedicineEntity, ReportEntity } from '../types';

export const DocumentsScreen: React.FC<{ navigation?: any; params?: any }> = ({ navigation, params }) => {
  const {
    reports,
    processingState,
    statusMessage,
    activeScanResult,
    captureFromCamera,
    pickFromGallery,
    importFile,
    reprocessWithOcrText,
    confirmAndCommitToCase,
    deleteReport,
    resetActiveScan,
    refreshReports,
  } = useDocumentStore();

  const memory = HealthMemoryService.getInstance();
  const reasoningService = MedicalDocumentReasoningService.getInstance();
  const reminderService = MedicationReminderService.getInstance();

  const [activeTab, setActiveTab] = useState<'all' | 'prescriptions' | 'labs' | 'discharge' | 'timeline'>('all');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportEntity | null>(null);

  const [editableOcrText, setEditableOcrText] = useState('');
  const [isEditingOcr, setIsEditingOcr] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(undefined);
  const [cases, setCases] = useState<CaseFile[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<HealthTimelineEvent[]>([]);

  // Local AI Explanation & Question State
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [userCaseQuery, setUserCaseQuery] = useState('');

  // Medication review state in modal
  const [reviewedMeds, setReviewedMeds] = useState<MedicineEntity[]>([]);

  useEffect(() => {
    refreshReports();
    setCases(memory.getCases());
    setTimelineEvents(memory.getTimelineEvents(selectedCaseId));
  }, [selectedCaseId]);

  useEffect(() => {
    if (activeScanResult) {
      setEditableOcrText(activeScanResult.rawOcrText);
      setReviewedMeds([...(activeScanResult.extractedMedicines || [])]);
      setReviewModalVisible(true);
    }
  }, [activeScanResult]);

  useEffect(() => {
    if (params?.scanMode === 'prescription') {
      handleScanPrescription();
    } else if (params?.scanMode === 'lab') {
      handleScanReport();
    }
  }, [params?.scanMode]);

  const handleScanPrescription = async () => {
    try {
      await captureFromCamera();
    } catch (err: any) {
      Alert.alert('Prescription Scan Error', err?.message || 'Failed to capture prescription');
    }
  };

  const handleScanReport = async () => {
    try {
      await captureFromCamera();
    } catch (err: any) {
      Alert.alert('Report Scan Error', err?.message || 'Failed to capture report');
    }
  };

  const handleGalleryPick = async () => {
    try {
      await pickFromGallery();
    } catch (err: any) {
      Alert.alert('Gallery Selection Error', err?.message || 'Failed to pick image from gallery');
    }
  };

  const handleFileImport = async () => {
    try {
      await importFile();
    } catch (err: any) {
      Alert.alert('File Import Error', err?.message || 'Failed to import medical document');
    }
  };

  const handleReanalyzeOcr = async () => {
    try {
      await reprocessWithOcrText(editableOcrText);
      setIsEditingOcr(false);
    } catch (err: any) {
      Alert.alert('Re-analysis Error', err?.message || 'Failed to parse edited text');
    }
  };

  const handleConfirmMedicine = (index: number) => {
    const updated = [...reviewedMeds];
    updated[index] = {
      ...updated[index],
      isConfirmedByUser: true,
      confirmationStatus: 'CONFIRMED',
    };
    setReviewedMeds(updated);
  };

  const handleRejectMedicine = (index: number) => {
    const updated = [...reviewedMeds];
    updated[index] = {
      ...updated[index],
      isConfirmedByUser: false,
      confirmationStatus: 'REJECTED',
      isActive: false,
    };
    setReviewedMeds(updated);
  };

  const handleScheduleReminder = async (med: MedicineEntity, timeSlot: string) => {
    try {
      if (!med.isConfirmedByUser) {
        Alert.alert('Confirmation Required', 'Please confirm the medication dosage before setting a reminder.');
        return;
      }
      await reminderService.scheduleReminderForMedicine(med, timeSlot);
      Alert.alert('Reminder Scheduled', `Medication reminder set for ${med.name} at ${timeSlot}.`);
    } catch (err: any) {
      Alert.alert('Reminder Error', err?.message || 'Failed to schedule reminder.');
    }
  };

  const handleExplainWithLocalAI = async () => {
    if (!activeScanResult) return;
    setIsExplaining(true);
    setAiExplanation('');

    try {
      const stream = reasoningService.explainDocument(activeScanResult, selectedCaseId);
      let full = '';
      for await (const chunk of stream) {
        full += chunk.token;
        setAiExplanation(full);
      }
    } catch (err: any) {
      Alert.alert('Medical AI Error', err?.message || 'Failed to generate local explanation');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleAskCaseQuestion = async () => {
    if (!userCaseQuery.trim()) return;
    setIsExplaining(true);
    setAiExplanation('');

    try {
      const stream = reasoningService.answerCaseQuestion(userCaseQuery.trim(), selectedCaseId);
      let full = '';
      for await (const chunk of stream) {
        full += chunk.token;
        setAiExplanation(full);
      }
    } catch (err: any) {
      Alert.alert('Case Intelligence Error', err?.message || 'Failed to answer question');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleConfirmSave = () => {
    if (!activeScanResult) return;
    // Commit with reviewed medicines
    activeScanResult.extractedMedicines = reviewedMeds;
    confirmAndCommitToCase(selectedCaseId);

    // Also persist to DocumentVaultService
    DocumentVaultService.addDocumentRecord(selectedCaseId || 'default_case', {
      title: activeScanResult.documentTitle || 'Confirmed Medical Document',
      originalImageUri: activeScanResult.localFilePath || activeScanResult.report?.localFilePath || 'file:///default_image.jpg',
      rawOcrText: activeScanResult.rawOcrText,
      userVerifiedText: editableOcrText,
      doctorName: activeScanResult.doctorInfo?.doctorName,
      hospitalName: activeScanResult.doctorInfo?.hospitalName,
      status: 'STORED',
    });

    setTimelineEvents(memory.getTimelineEvents(selectedCaseId));
    setReviewModalVisible(false);
    setAiExplanation('');
    Alert.alert(
      'Document Confirmed & Saved',
      `Document and structured medical records were committed to ${
        selectedCaseId ? 'Case File' : 'Health Vault'
      }.`
    );
  };

  const handleDeleteReport = (report: ReportEntity) => {
    Alert.alert(
      'Delete Medical Document',
      `Are you sure you want to delete "${report.title}"? Associated extracted medical entities will be removed from memory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteReport(report.id);
            setTimelineEvents(memory.getTimelineEvents(selectedCaseId));
            setDetailModalVisible(false);
            setSelectedReport(null);
          },
        },
      ]
    );
  };

  const filteredReports = reports.filter((r) => {
    if (selectedCaseId && r.caseId !== selectedCaseId) return false;
    if (activeTab === 'prescriptions') return r.type === 'Prescription';
    if (activeTab === 'labs') return r.type === 'Lab';
    if (activeTab === 'discharge') return r.type === 'Discharge';
    return true;
  });

  const isBusy =
    processingState === 'PREPARING_IMAGE' ||
    processingState === 'LOADING_OCR' ||
    processingState === 'EXTRACTING_TEXT' ||
    processingState === 'ANALYZING_DOCUMENT';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (navigation ? navigation.goBack() : null)}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Medical Document Intelligence</Text>
            <Text style={styles.headerSubtitle}>
              Offline OCR • Clinical Extraction • Case Memory • Local Medical AI
            </Text>
          </View>
        </View>

        {/* 4 Dedicated Document Capture Triggers */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rxBtn]}
            onPress={handleScanPrescription}
            disabled={isBusy}
          >
            <Text style={styles.actionBtnText}>📋 Scan Prescription</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.labScanBtn]}
            onPress={handleScanReport}
            disabled={isBusy}
          >
            <Text style={styles.actionBtnText}>🔬 Scan Lab Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.galleryBtn]}
            onPress={handleGalleryPick}
            disabled={isBusy}
          >
            <Text style={styles.actionBtnText}>🖼️ Choose Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.fileBtn]}
            onPress={handleFileImport}
            disabled={isBusy}
          >
            <Text style={styles.actionBtnText}>📁 Upload Document</Text>
          </TouchableOpacity>
        </View>

        {/* Active Case Selector Strip */}
        <View style={styles.caseSelectorBox}>
          <Text style={styles.caseSelectorLabel}>Active Case Memory Scope:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            <TouchableOpacity
              style={[styles.caseChip, selectedCaseId === undefined && styles.caseChipActive]}
              onPress={() => setSelectedCaseId(undefined)}
            >
              <Text style={[styles.caseChipText, selectedCaseId === undefined && styles.caseChipTextActive]}>
                🌐 All Health Records
              </Text>
            </TouchableOpacity>

            {cases.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.caseChip, selectedCaseId === c.id && styles.caseChipActive]}
                onPress={() => setSelectedCaseId(c.id)}
              >
                <Text style={[styles.caseChipText, selectedCaseId === c.id && styles.caseChipTextActive]}>
                  🏥 {c.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Case Intelligence & Diet Question Bar */}
        <View style={styles.caseQuestionRow}>
          <TextInput
            style={styles.caseQuestionInput}
            placeholder={
              selectedCaseId
                ? 'Ask about this case (e.g. "What did doctor prescribe?", "Can I eat biryani?")'
                : 'Ask about latest report, prescriptions, or diet guidance...'
            }
            placeholderTextColor="#64748B"
            value={userCaseQuery}
            onChangeText={setUserCaseQuery}
          />
          <TouchableOpacity
            style={styles.caseAskBtn}
            onPress={handleAskCaseQuestion}
            disabled={isExplaining}
          >
            <Text style={styles.caseAskBtnText}>{isExplaining ? '...' : 'Ask AI'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Case Intelligence Streaming Answer Box */}
      {aiExplanation ? (
        <View style={styles.aiExplanationBanner}>
          <View style={styles.aiExplanationHeader}>
            <Text style={styles.aiExplanationTitle}>🤖 Clinical Reasoning & Case Intelligence</Text>
            <TouchableOpacity onPress={() => setAiExplanation('')}>
              <Text style={{ color: '#94A3B8', fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.aiExplanationText}>{aiExplanation}</Text>
        </View>
      ) : null}

      {/* In-Progress Pipeline Indicator */}
      {isBusy && (
        <View style={styles.busyBanner}>
          <ActivityIndicator size="small" color="#38BDF8" />
          <Text style={styles.busyText}>{statusMessage}</Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {(['all', 'prescriptions', 'labs', 'discharge', 'timeline'] as const).map((tab) => (
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

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'timeline' ? (
          /* Health Timeline View */
          <View>
            <Text style={styles.timelineHeading}>
              Chronological Health Timeline ({timelineEvents.length} Events)
            </Text>
            {timelineEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>⏱️</Text>
                <Text style={styles.emptyTitle}>No Timeline Events</Text>
                <Text style={styles.emptySubtitle}>
                  Confirmed prescriptions, lab reports, doctor notes, and symptoms will automatically appear here.
                </Text>
              </View>
            ) : (
              timelineEvents.map((evt) => (
                <View key={evt.id} style={styles.timelineCard}>
                  <View style={styles.timelineCardHeader}>
                    <Text style={styles.timelineEventTypeBadge}>{evt.eventType}</Text>
                    <Text style={styles.timelineDate}>
                      {new Date(evt.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.timelineTitle}>{evt.title}</Text>
                  <Text style={styles.timelineDescription}>{evt.description}</Text>
                  <Text style={styles.timelineProvenance}>
                    🏷️ Provenance: {evt.provenance.source} ({Math.round(evt.provenance.confidence * 100)}%)
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📄</Text>
            <Text style={styles.emptyTitle}>No Documents in Scope</Text>
            <Text style={styles.emptySubtitle}>
              Capture a prescription or lab report using the actions above.
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={styles.reportCard}
              onPress={() => {
                setSelectedReport(report);
                setDetailModalVisible(true);
              }}
            >
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
                  {report.results.slice(0, 3).map((res, i) => (
                    <View key={i} style={styles.labRow}>
                      <Text style={styles.labName}>{res.testName}:</Text>
                      <Text
                        style={[
                          styles.labValue,
                          res.isAbnormal && { color: '#F87171', fontWeight: 'bold' },
                        ]}
                      >
                        {res.value} {res.unit} (Ref: {res.referenceRange})
                        {res.isAbnormal ? ' [FLAGGED]' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.provenanceRow}>
                <Text style={styles.provenanceText}>
                  🛡️ Provenance: {report.provenance.source} • Confidence:{' '}
                  {Math.round(report.provenance.confidence * 100)}%
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* OCR EXTRACTION CONFIRMATION & REVIEW MODAL */}
      {/* ======================================================== */}
      <Modal visible={reviewModalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.reviewModalContainer}>
          <View style={styles.reviewModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  resetActiveScan();
                  setReviewModalVisible(false);
                }}
              >
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewModalTitle}>Document Verification & Review</Text>
                <Text style={styles.reviewModalSubtitle}>
                  Verify on-device clinical extraction before committing to Case Memory
                </Text>
              </View>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.reviewScrollContent}>
            {/* Preserved Original Captured Document Image Preview & Quality Check */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewSectionLabel}>ORIGINAL DOCUMENT PREVIEW (PRESERVED):</Text>
              {activeScanResult?.localFilePath ? (
                <View style={styles.scanImageContainer}>
                  <Image
                    source={{
                      uri: activeScanResult.localFilePath.startsWith('file://')
                        ? activeScanResult.localFilePath
                        : `file://${activeScanResult.localFilePath}`,
                    }}
                    style={styles.scanPreviewImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.noImagePlaceholder}>
                  <Text style={styles.noImageText}>📄 Document scanned directly from device</Text>
                </View>
              )}

              {/* Quality & Confidence Status */}
              <View style={styles.qualityCheckRow}>
                <View style={styles.qualityItem}>
                  <Text style={styles.qualityLabel}>Quality Check:</Text>
                  <Text style={styles.qualityValue}>
                    {(activeScanResult?.confidenceScore || 0.9) < 0.75
                      ? '⚠️ Attention Required'
                      : '✓ Good Contrast & Resolution'}
                  </Text>
                </View>
                <View style={styles.qualityItem}>
                  <Text style={styles.qualityLabel}>Confidence:</Text>
                  <Text
                    style={[
                      styles.qualityValue,
                      {
                        color:
                          (activeScanResult?.confidenceScore || 0.9) < 0.75
                            ? '#F87171'
                            : '#34D399',
                      },
                    ]}
                  >
                    {Math.round((activeScanResult?.confidenceScore || 0.9) * 100)}%
                  </Text>
                </View>
              </View>

              {/* Low Confidence Warning per Requirement 9 */}
              {(activeScanResult?.confidenceScore || 0.9) < 0.75 && (
                <View style={styles.lowConfidenceAlert}>
                  <Text style={styles.lowConfidenceTitle}>⚠️ Could not reliably read this document.</Text>
                  <Text style={styles.lowConfidenceDesc}>
                    Handwriting or low contrast detected. Do NOT silently save incorrect OCR. Please verify, edit text, or retake:
                  </Text>
                  <View style={styles.lowConfidenceActions}>
                    <TouchableOpacity
                      style={styles.retakeBtn}
                      onPress={() => {
                        setReviewModalVisible(false);
                        resetActiveScan();
                        handleScanPrescription();
                      }}
                    >
                      <Text style={styles.retakeBtnText}>📷 Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.galleryBtnSmall}
                      onPress={() => {
                        setReviewModalVisible(false);
                        resetActiveScan();
                        handleGalleryPick();
                      }}
                    >
                      <Text style={styles.galleryBtnSmallText}>🖼️ Use Gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.editOcrBtnSmall}
                      onPress={() => setIsEditingOcr(true)}
                    >
                      <Text style={styles.editOcrBtnSmallText}>✏️ Edit Text</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Document Classification */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewCardRow}>
                <Text style={styles.reviewSectionLabel}>CLASSIFIED TYPE:</Text>
                <View style={styles.typeBadgeLarge}>
                  <Text style={styles.typeBadgeLargeText}>
                    {activeScanResult?.detectedDocumentType.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.confidenceText}>
                Extraction Confidence: {Math.round((activeScanResult?.confidenceScore || 0.9) * 100)}% (Offline On-Device)
              </Text>
            </View>

            {/* Target Case File Selector */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewSectionLabel}>ASSOCIATE TO PATIENT CASE FILE:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.caseScrollRow}>
                <TouchableOpacity
                  style={[styles.caseChip, selectedCaseId === undefined && styles.caseChipActive]}
                  onPress={() => setSelectedCaseId(undefined)}
                >
                  <Text style={[styles.caseChipText, selectedCaseId === undefined && styles.caseChipTextActive]}>
                    🌐 Global Vault
                  </Text>
                </TouchableOpacity>

                {cases.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.caseChip, selectedCaseId === c.id && styles.caseChipActive]}
                    onPress={() => setSelectedCaseId(c.id)}
                  >
                    <Text style={[styles.caseChipText, selectedCaseId === c.id && styles.caseChipTextActive]}>
                      🏥 {c.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Extracted Medications with Edit / Confirm / Reject & Reminders */}
            {reviewedMeds.length > 0 && (
              <View style={styles.reviewCard}>
                <Text style={styles.reviewSectionLabel}>
                  EXTRACTED PRESCRIPTION MEDICINES ({reviewedMeds.length}):
                </Text>
                {reviewedMeds.map((med, index) => (
                  <View key={med.id || index} style={styles.medReviewItem}>
                    <View style={styles.medReviewHeader}>
                      <Text style={styles.medReviewName}>{med.name}</Text>
                      <Text style={styles.medReviewDosage}>{med.dosage}</Text>
                    </View>
                    <Text style={styles.medReviewGeneric}>Generic: {med.genericName}</Text>
                    <Text style={styles.medReviewInstruction}>
                      Dose: {med.dose || '1 tab'} • Freq: {med.frequency} • Duration: {med.duration || 'As prescribed'}
                    </Text>
                    <Text style={styles.medReviewInstruction}>Instructions: {med.instructions}</Text>
                    <Text style={styles.medReviewInstruction}>
                      Doctor: {med.prescribingDoctor} • Date: {med.startDate}
                    </Text>

                    {/* Status Badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: 'bold',
                          color: med.isConfirmedByUser ? '#4ADE80' : med.confirmationStatus === 'REJECTED' ? '#F87171' : '#FBBF24',
                        }}
                      >
                        Status: {med.isConfirmedByUser ? 'Confirmed' : med.confirmationStatus === 'REJECTED' ? 'Rejected' : 'Extracted — Please verify'}
                      </Text>
                    </View>

                    {/* Verification Actions */}
                    <View style={styles.medActionRow}>
                      <TouchableOpacity
                        style={[styles.medActionBtn, styles.medConfirmBtn]}
                        onPress={() => handleConfirmMedicine(index)}
                      >
                        <Text style={styles.medActionBtnText}>✓ Confirm</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.medActionBtn, styles.medRejectBtn]}
                        onPress={() => handleRejectMedicine(index)}
                      >
                        <Text style={styles.medActionBtnText}>✕ Reject</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Schedule Reminders (Only for confirmed medicines) */}
                    {med.isConfirmedByUser && (
                      <View style={styles.reminderSection}>
                        <Text style={styles.reminderTitle}>⏰ Add Daily Medication Reminder:</Text>
                        <View style={styles.reminderSlotsRow}>
                          {['9:00 AM', '9:00 PM', '10:00 AM', '10:00 PM'].map((timeStr) => {
                            const slot = timeStr === '9:00 AM' ? '09:00' : timeStr === '9:00 PM' ? '21:00' : timeStr === '10:00 AM' ? '10:00' : '22:00';
                            return (
                              <TouchableOpacity
                                key={timeStr}
                                style={styles.reminderSlotChip}
                                onPress={() => handleScheduleReminder(med, slot)}
                              >
                                <Text style={styles.reminderSlotText}>+ {timeStr}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Extracted Lab Metrics */}
            {activeScanResult?.extractedLabResults && activeScanResult.extractedLabResults.length > 0 && (
              <View style={styles.reviewCard}>
                <Text style={styles.reviewSectionLabel}>
                  EXTRACTED LAB METRICS ({activeScanResult.extractedLabResults.length}):
                </Text>
                {activeScanResult.extractedLabResults.map((lab, index) => (
                  <View key={index} style={styles.labReviewItem}>
                    <Text style={styles.labReviewName}>{lab.testName}</Text>
                    <Text
                      style={[
                        styles.labReviewValue,
                        lab.isAbnormal && { color: '#F87171', fontWeight: 'bold' },
                      ]}
                    >
                      {lab.value} {lab.unit} <Text style={{ color: '#64748B' }}>[Ref: {lab.referenceRange}]</Text>
                      {lab.isAbnormal ? ' (FLAGGED)' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Raw OCR Text View & Editor */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewCardRow}>
                <Text style={styles.reviewSectionLabel}>RAW ON-DEVICE OCR TRANSCRIPT:</Text>
                <TouchableOpacity onPress={() => setIsEditingOcr(!isEditingOcr)}>
                  <Text style={styles.editOcrToggleText}>
                    {isEditingOcr ? 'Done Editing' : '✏️ Edit Text'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditingOcr ? (
                <View>
                  <TextInput
                    style={styles.ocrTextInput}
                    value={editableOcrText}
                    onChangeText={setEditableOcrText}
                    multiline={true}
                    numberOfLines={8}
                  />
                  <TouchableOpacity style={styles.reanalyzeBtn} onPress={handleReanalyzeOcr}>
                    <Text style={styles.reanalyzeBtnText}>🔄 Re-Analyze Edited Text</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.ocrTextPreview} numberOfLines={8}>
                  {editableOcrText || 'No text recognized'}
                </Text>
              )}
            </View>

            {/* Local AI Clinical Explanation Section */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewCardRow}>
                <Text style={styles.reviewSectionLabel}>LOCAL AI CLINICAL EXPLANATION:</Text>
                <TouchableOpacity
                  style={styles.aiExplainBtn}
                  onPress={handleExplainWithLocalAI}
                  disabled={isExplaining}
                >
                  <Text style={styles.aiExplainBtnText}>
                    {isExplaining ? 'Generating...' : '✨ Explain with Local AI'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isExplaining && (
                <View style={styles.aiLoadingBox}>
                  <ActivityIndicator size="small" color="#38BDF8" />
                  <Text style={styles.aiLoadingText}>Streaming offline clinical explanation via llama.rn...</Text>
                </View>
              )}

              {aiExplanation ? (
                <View style={styles.aiExplanationBox}>
                  <Text style={styles.aiExplanationText}>{aiExplanation}</Text>
                </View>
              ) : null}
            </View>

            {/* Confirm & Save Button */}
            <View style={styles.reviewFooterButtons}>
              <TouchableOpacity style={styles.confirmSaveBtn} onPress={handleConfirmSave}>
                <Text style={styles.confirmSaveBtnText}>✓ Confirm & Commit to Case</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ======================================================== */}
      {/* SAVED DOCUMENT DETAIL VIEWER MODAL */}
      {/* ======================================================== */}
      <Modal visible={detailModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.detailHeader}>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={styles.backBtn}
              >
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.detailTitle}>{selectedReport?.title}</Text>
                <Text style={styles.detailMeta}>
                  {selectedReport?.type} • {selectedReport?.testDate}
                </Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.detailSectionHeading}>Facility / Doctor:</Text>
              <Text style={styles.detailBodyText}>{selectedReport?.laboratoryOrHospital}</Text>

              <Text style={styles.detailSectionHeading}>Clinical Summary:</Text>
              <Text style={styles.detailBodyText}>{selectedReport?.summary}</Text>

              {selectedReport?.results && selectedReport.results.length > 0 && (
                <>
                  <Text style={styles.detailSectionHeading}>Extracted Test Results:</Text>
                  {selectedReport.results.map((res, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.detailLabLine,
                        res.isAbnormal && { color: '#F87171', fontWeight: 'bold' },
                      ]}
                    >
                      • {res.testName}: {res.value} {res.unit} (Ref: {res.referenceRange})
                      {res.isAbnormal ? ' [FLAGGED]' : ''}
                    </Text>
                  ))}
                </>
              )}

              <Text style={styles.detailSectionHeading}>Raw Document OCR Text:</Text>
              <Text style={styles.detailOcrText}>{selectedReport?.rawOcrText}</Text>
            </ScrollView>

            <View style={styles.detailFooter}>
              <TouchableOpacity
                style={styles.detailDeleteBtn}
                onPress={() => selectedReport && handleDeleteReport(selectedReport)}
              >
                <Text style={styles.detailDeleteBtnText}>Delete Document</Text>
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  backBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 10,
  },
  backBtnText: { color: '#38BDF8', fontSize: 13, fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  scanImageContainer: {
    height: 180,
    backgroundColor: '#000000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    marginTop: 6,
  },
  scanPreviewImage: { width: '100%', height: '100%' },
  noImagePlaceholder: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  noImageText: { color: '#94A3B8', fontSize: 12 },
  qualityCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginBottom: 6,
  },
  qualityItem: { flexDirection: 'row', alignItems: 'center' },
  qualityLabel: { fontSize: 11, color: '#94A3B8', marginRight: 6 },
  qualityValue: { fontSize: 12, fontWeight: '700', color: '#F8FAFC' },
  lowConfidenceAlert: {
    backgroundColor: '#450A0A',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  lowConfidenceTitle: { color: '#F87171', fontSize: 13, fontWeight: '700' },
  lowConfidenceDesc: { color: '#FECACA', fontSize: 11, marginTop: 2, marginBottom: 8 },
  lowConfidenceActions: { flexDirection: 'row', gap: 6 },
  retakeBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  retakeBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  galleryBtnSmall: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  galleryBtnSmallText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  editOcrBtnSmall: {
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  editOcrBtnSmallText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  actionBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxBtn: { backgroundColor: '#0284C7' },
  labScanBtn: { backgroundColor: '#0D9488' },
  galleryBtn: { backgroundColor: '#475569' },
  fileBtn: { backgroundColor: '#6366F1' },
  actionBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  caseSelectorBox: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1E293B' },
  caseSelectorLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  caseQuestionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  caseQuestionInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  caseAskBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caseAskBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  aiExplanationBanner: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  aiExplanationHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  aiExplanationTitle: { fontSize: 12, fontWeight: '700', color: '#C084FC' },
  aiExplanationText: { fontSize: 12, color: '#E2E8F0', lineHeight: 18 },
  busyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0369A122',
    padding: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#38BDF8',
  },
  busyText: { color: '#38BDF8', fontSize: 12, fontWeight: '600' },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  tabButtonActive: { backgroundColor: '#38BDF8' },
  tabText: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  tabTextActive: { color: '#0F172A' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', maxWidth: 280, marginTop: 6 },
  timelineHeading: { fontSize: 14, fontWeight: '700', color: '#38BDF8', marginBottom: 12 },
  timelineCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  timelineCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineEventTypeBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
    backgroundColor: '#0284C722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timelineDate: { fontSize: 11, color: '#94A3B8' },
  timelineTitle: { fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginTop: 6 },
  timelineDescription: { fontSize: 12, color: '#CBD5E1', marginTop: 4, lineHeight: 16 },
  timelineProvenance: { fontSize: 10, color: '#64748B', marginTop: 6 },
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
  reviewModalContainer: { flex: 1, backgroundColor: '#0F172A' },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  reviewModalTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  reviewModalSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  closeReviewBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeReviewBtnText: { color: '#F87171', fontWeight: '700', fontSize: 12 },
  reviewScrollContent: { padding: 16, paddingBottom: 40 },
  reviewCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reviewCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewSectionLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1 },
  typeBadgeLarge: {
    backgroundColor: '#0369A1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeLargeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  confidenceText: { color: '#34D399', fontSize: 11, marginTop: 4, fontWeight: '600' },
  caseScrollRow: { flexDirection: 'row', marginTop: 8 },
  caseChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  caseChipActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  caseChipText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  caseChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  medReviewItem: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  medReviewHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  medReviewName: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 },
  medReviewDosage: { color: '#38BDF8', fontWeight: '700', fontSize: 12 },
  medReviewGeneric: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  medReviewInstruction: { color: '#CBD5E1', fontSize: 11, marginTop: 4 },
  medActionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  medActionBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  medConfirmBtn: { backgroundColor: '#10B981' },
  medRejectBtn: { backgroundColor: '#EF4444' },
  medActionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },
  reminderSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  reminderTitle: { fontSize: 11, fontWeight: '700', color: '#FBBF24', marginBottom: 4 },
  reminderSlotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reminderSlotChip: {
    backgroundColor: '#FBBF2422',
    borderColor: '#FBBF24',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reminderSlotText: { color: '#FBBF24', fontSize: 10, fontWeight: '700' },
  labReviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  labReviewName: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  labReviewValue: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  editOcrToggleText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  ocrTextPreview: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'monospace',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
  },
  ocrTextInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    fontFamily: 'monospace',
    fontSize: 11,
    height: 140,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  reanalyzeBtn: {
    backgroundColor: '#0284C7',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  reanalyzeBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  aiExplainBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  aiExplainBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  aiLoadingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  aiLoadingText: { color: '#38BDF8', fontSize: 11 },
  aiExplanationBox: {
    marginTop: 8,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  reviewFooterButtons: { marginTop: 10 },
  confirmSaveBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmSaveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'center',
    padding: 20,
  },
  detailModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  detailTitle: { fontSize: 17, fontWeight: '700', color: '#F8FAFC' },
  detailMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  detailCloseText: { fontSize: 18, color: '#94A3B8', fontWeight: '700' },
  detailSectionHeading: { fontSize: 11, fontWeight: '700', color: '#38BDF8', marginTop: 10, marginBottom: 2 },
  detailBodyText: { fontSize: 12, color: '#CBD5E1', lineHeight: 16 },
  detailLabLine: { fontSize: 12, color: '#E2E8F0', marginVertical: 2 },
  detailOcrText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  detailFooter: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 },
  detailDeleteBtn: { backgroundColor: '#EF444422', padding: 10, borderRadius: 8, alignItems: 'center' },
  detailDeleteBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 12 },
});

