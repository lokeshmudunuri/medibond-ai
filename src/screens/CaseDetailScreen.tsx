import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { useCaseStore } from '../store/useCaseStore';
import { HealthMemoryService } from '../services/HealthMemoryService';
import { ProvenanceTag } from '../components/ProvenanceTag';

interface CaseDetailScreenProps {
  navigation: any;
  caseId: string;
}

export const CaseDetailScreen: React.FC<CaseDetailScreenProps> = ({ navigation, caseId }) => {
  const { cases, updateCase } = useCaseStore();
  const memory = HealthMemoryService.getInstance();

  const activeCase = cases.find((c) => c.id === caseId);

  const [activeTab, setActiveTab] = useState<'meds' | 'reports' | 'instructions' | 'diet'>('meds');
  const [newInstruction, setNewInstruction] = useState('');
  const [showAddInstruction, setShowAddInstruction] = useState(false);

  if (!activeCase) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Case File Not Found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Return to Cases</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const caseMeds = memory.getMedicinesByCase(activeCase.id);
  const caseReports = memory.getReportsByCase(activeCase.id);

  const handleAddInstruction = () => {
    if (!newInstruction.trim()) return;
    memory.addInstructionToCase(activeCase.id, newInstruction.trim());
    updateCase(activeCase.id, {
      doctorInstructions: [...activeCase.doctorInstructions, newInstruction.trim()],
    });
    setNewInstruction('');
    setShowAddInstruction(false);
    Alert.alert('Instruction Added', 'Doctor advice recorded in Case File.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Case Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backArrowBtn}>
            <Text style={styles.backArrowText}>← Cases</Text>
          </TouchableOpacity>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{activeCase.status}</Text>
          </View>
        </View>

        <Text style={styles.caseTitle}>{activeCase.title}</Text>
        <Text style={styles.caseDoctor}>
          👨‍⚕️ {activeCase.doctorName} • 🏥 {activeCase.hospitalName}
        </Text>
        {activeCase.specialty && (
          <Text style={styles.caseSpecialty}>Specialty: {activeCase.specialty}</Text>
        )}
      </View>

      {/* Quick Action Bar */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Documents', { preselectedCaseId: activeCase.id })}
        >
          <Text style={styles.actionIcon}>📷</Text>
          <Text style={styles.actionText}>Scan Rx</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Documents', { preselectedCaseId: activeCase.id })}
        >
          <Text style={styles.actionIcon}>🧪</Text>
          <Text style={styles.actionText}>Scan Report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardHighlight]}
          onPress={() => navigation.navigate('Voice', { caseId: activeCase.id })}
        >
          <Text style={styles.actionIcon}>🎙️</Text>
          <Text style={[styles.actionText, styles.actionTextHighlight]}>Speak</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Chat', { caseId: activeCase.id })}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>Case AI</Text>
        </TouchableOpacity>
      </View>

      {/* Follow-up Reminder Banner */}
      {activeCase.followUpDate && (
        <View style={styles.followUpBanner}>
          <Text style={styles.followUpLabel}>🗓️ Next Scheduled Follow-up:</Text>
          <Text style={styles.followUpValue}>{activeCase.followUpDate}</Text>
        </View>
      )}

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'meds' && styles.tabBtnActive]}
          onPress={() => setActiveTab('meds')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'meds' && styles.tabBtnTextActive]}>
            💊 Meds ({caseMeds.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'reports' && styles.tabBtnActive]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'reports' && styles.tabBtnTextActive]}>
            📄 Reports ({caseReports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'instructions' && styles.tabBtnActive]}
          onPress={() => setActiveTab('instructions')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'instructions' && styles.tabBtnTextActive]}>
            📋 Advice ({activeCase.doctorInstructions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'diet' && styles.tabBtnActive]}
          onPress={() => setActiveTab('diet')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'diet' && styles.tabBtnTextActive]}>
            🥗 Diet
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView contentContainerStyle={styles.contentScroll}>
        {/* Prescriptions & Medications */}
        {activeTab === 'meds' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Prescribed Medications</Text>
              <TouchableOpacity
                style={styles.addSmallBtn}
                onPress={() =>
                  navigation.navigate('Documents', { preselectedCaseId: activeCase.id })
                }
              >
                <Text style={styles.addSmallBtnText}>+ Scan New Rx</Text>
              </TouchableOpacity>
            </View>

            {caseMeds.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>No Prescriptions Added Yet</Text>
                <Text style={styles.emptyCardSub}>
                  Scan the doctor's prescription paper or upload a photo to extract medicines automatically.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() =>
                    navigation.navigate('Documents', { preselectedCaseId: activeCase.id })
                  }
                >
                  <Text style={styles.emptyActionBtnText}>📷 Scan Prescription</Text>
                </TouchableOpacity>
              </View>
            ) : (
              caseMeds.map((med) => (
                <View key={med.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{med.name}</Text>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>{med.dosage}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemSub}>
                    {med.frequency} • {med.timing}
                  </Text>
                  {med.instructions && (
                    <Text style={styles.itemInstruction}>Doctor: {med.instructions}</Text>
                  )}
                  <View style={styles.provenanceWrap}>
                    <ProvenanceTag
                      source={med.provenance.source}
                      documentName={med.provenance.documentName}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Reports */}
        {activeTab === 'reports' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Laboratory & Diagnostic Reports</Text>
              <TouchableOpacity
                style={styles.addSmallBtn}
                onPress={() =>
                  navigation.navigate('Documents', { preselectedCaseId: activeCase.id })
                }
              >
                <Text style={styles.addSmallBtnText}>+ Scan Report</Text>
              </TouchableOpacity>
            </View>

            {caseReports.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>No Reports Added</Text>
                <Text style={styles.emptyCardSub}>
                  Upload or photograph blood tests, imaging reports, or discharge summaries.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() =>
                    navigation.navigate('Documents', { preselectedCaseId: activeCase.id })
                  }
                >
                  <Text style={styles.emptyActionBtnText}>🧪 Scan Lab Report</Text>
                </TouchableOpacity>
              </View>
            ) : (
              caseReports.map((rep) => (
                <View key={rep.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{rep.title}</Text>
                    <Text style={styles.reportDateText}>{rep.testDate}</Text>
                  </View>
                  <Text style={styles.itemSub}>Facility: {rep.laboratoryOrHospital}</Text>
                  <Text style={styles.itemSummary}>{rep.summary}</Text>

                  {rep.results && rep.results.length > 0 && (
                    <View style={styles.labValuesBox}>
                      {rep.results.map((r, i) => (
                        <Text key={i} style={styles.labValueLine}>
                          • {r.testName}: {r.value} {r.unit} (Ref: {r.referenceRange})
                        </Text>
                      ))}
                    </View>
                  )}
                  <View style={styles.provenanceWrap}>
                    <ProvenanceTag
                      source={rep.provenance.source}
                      documentName={rep.provenance.documentName}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Doctor Instructions */}
        {activeTab === 'instructions' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Doctor Advice & Protocol</Text>
              <TouchableOpacity
                style={styles.addSmallBtn}
                onPress={() => setShowAddInstruction(!showAddInstruction)}
              >
                <Text style={styles.addSmallBtnText}>+ Add Advice</Text>
              </TouchableOpacity>
            </View>

            {showAddInstruction && (
              <View style={styles.addInstructionCard}>
                <TextInput
                  style={styles.instructionInput}
                  placeholder="Enter specific advice given by your doctor..."
                  placeholderTextColor="#64748B"
                  value={newInstruction}
                  onChangeText={setNewInstruction}
                  multiline
                />
                <View style={styles.addInstructionBtnRow}>
                  <TouchableOpacity
                    style={styles.cancelSmallBtn}
                    onPress={() => setShowAddInstruction(false)}
                  >
                    <Text style={styles.cancelSmallBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveSmallBtn}
                    onPress={handleAddInstruction}
                  >
                    <Text style={styles.saveSmallBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeCase.doctorInstructions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>No Instructions Recorded</Text>
                <Text style={styles.emptyCardSub}>
                  Record doctor guidance on wound care, mobility, or medication instructions.
                </Text>
              </View>
            ) : (
              activeCase.doctorInstructions.map((inst, idx) => (
                <View key={idx} style={styles.instructionCard}>
                  <Text style={styles.instructionNumber}>{idx + 1}.</Text>
                  <Text style={styles.instructionText}>{inst}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Diet & Lifestyle Guidance */}
        {activeTab === 'diet' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Diet & Nutrition Protocol</Text>
            <View style={styles.dietCard}>
              <Text style={styles.dietIcon}>🥗</Text>
              <Text style={styles.dietText}>
                {activeCase.dietGuidance ||
                  'Standard balanced nutrition. Maintain adequate daily hydration and take medications as scheduled.'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    padding: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backArrowBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#0F172A',
    borderRadius: 6,
  },
  backArrowText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  statusBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: { color: '#34D399', fontSize: 10, fontWeight: '700' },
  caseTitle: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  caseDoctor: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  caseSpecialty: { fontSize: 12, color: '#38BDF8', marginTop: 2 },
  actionGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#0F172A',
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionCardHighlight: {
    backgroundColor: '#0284C722',
    borderColor: '#38BDF8',
  },
  actionIcon: { fontSize: 18, marginBottom: 2 },
  actionText: { fontSize: 11, fontWeight: '700', color: '#CBD5E1' },
  actionTextHighlight: { color: '#38BDF8' },
  followUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 10,
    backgroundColor: '#0284C722',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  followUpLabel: { fontSize: 12, color: '#BAE6FD', fontWeight: '600' },
  followUpValue: { fontSize: 12, color: '#38BDF8', fontWeight: '800' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },
  tabBtnActive: { backgroundColor: '#0284C7' },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  tabBtnTextActive: { color: '#FFFFFF' },
  contentScroll: { padding: 16 },
  tabSection: { marginBottom: 20 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  addSmallBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addSmallBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyCardTitle: { fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  emptyCardSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyActionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  itemCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  activePill: {
    backgroundColor: '#0284C722',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  activePillText: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
  itemSub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  itemInstruction: { fontSize: 11, color: '#34D399', fontStyle: 'italic', marginTop: 4 },
  itemSummary: { fontSize: 12, color: '#CBD5E1', marginTop: 6, lineHeight: 16 },
  reportDateText: { fontSize: 11, color: '#64748B' },
  labValuesBox: {
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  labValueLine: { fontSize: 11, color: '#E2E8F0', marginVertical: 1 },
  provenanceWrap: { marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#334155' },
  addInstructionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  instructionInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    height: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155',
  },
  addInstructionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelSmallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  cancelSmallBtnText: { color: '#E2E8F0', fontSize: 11, fontWeight: '600' },
  saveSmallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#0284C7',
  },
  saveSmallBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  instructionNumber: { fontSize: 13, fontWeight: '800', color: '#38BDF8', marginRight: 8 },
  instructionText: { fontSize: 13, color: '#E2E8F0', flex: 1, lineHeight: 18 },
  dietCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dietIcon: { fontSize: 28 },
  dietText: { fontSize: 13, color: '#E2E8F0', flex: 1, lineHeight: 18 },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  notFoundTitle: { fontSize: 18, color: '#F8FAFC', fontWeight: '700', marginBottom: 16 },
  backBtn: { backgroundColor: '#0284C7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
