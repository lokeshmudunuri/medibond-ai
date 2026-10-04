import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useHealthStore } from '../store/useHealthStore';
import { ProvenanceTag } from '../components/ProvenanceTag';
import { ProvenanceSource } from '../types';

export const HealthScreen: React.FC<{ navigation?: any }> = () => {
  const { patient, conditions, medicines, allergies, procedures, addMedicine, addCondition, addAllergy } =
    useHealthStore();

  const [activeTab, setActiveTab] = useState<'meds' | 'conditions' | 'allergies' | 'instructions'>('meds');
  const [modalType, setModalType] = useState<'none' | 'med' | 'condition' | 'allergy'>('none');

  // Modal input states
  const [inputName, setInputName] = useState('');
  const [inputDetail1, setInputDetail1] = useState('');
  const [inputDetail2, setInputDetail2] = useState('');

  const handleOpenModal = (type: 'med' | 'condition' | 'allergy') => {
    setInputName('');
    setInputDetail1('');
    setInputDetail2('');
    setModalType(type);
  };

  const handleSaveModal = () => {
    if (!inputName.trim()) {
      Alert.alert('Required Field', 'Please enter a name.');
      return;
    }

    const timestamp = new Date().toISOString();

    if (modalType === 'med') {
      addMedicine({
        id: `med_${Date.now()}`,
        name: inputName,
        genericName: inputDetail1 || inputName,
        dosage: inputDetail2 || '500mg',
        frequency: 'Daily',
        timing: 'After meals',
        instructions: 'User recorded medication',
        startDate: timestamp.split('T')[0],
        isActive: true,
        isConfirmedByUser: true,
        reminderTimes: ['09:00'],
        prescribedForCondition: 'General Health',
        prescribingDoctor: 'User Record',
        provenance: {
          source: ProvenanceSource.UserReported,
          confidence: 1.0,
          recordedAt: timestamp,
        },
      });
    } else if (modalType === 'condition') {
      addCondition({
        id: `cond_${Date.now()}`,
        name: inputName,
        icdOrCategory: inputDetail1 || 'General Diagnosis',
        diagnosedDate: timestamp.split('T')[0],
        status: 'active',
        notes: inputDetail2 || 'Reported by patient',
        provenance: {
          source: ProvenanceSource.UserReported,
          confidence: 1.0,
          recordedAt: timestamp,
        },
      });
    } else if (modalType === 'allergy') {
      addAllergy({
        id: `alg_${Date.now()}`,
        allergen: inputName,
        reaction: inputDetail1 || 'Mild rash',
        severity: (inputDetail2 as any) || 'Moderate',
        identifiedDate: timestamp.split('T')[0],
        provenance: {
          source: ProvenanceSource.UserReported,
          confidence: 1.0,
          recordedAt: timestamp,
        },
      });
    }

    setModalType('none');
    Alert.alert('Saved', 'Record successfully added to Health Memory.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Patient Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View>
            <Text style={styles.profileName}>{patient.name}</Text>
            <Text style={styles.profileMeta}>
              {patient.age} yrs • {patient.gender} • Blood Group: {patient.bloodGroup}
            </Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified Patient</Text>
          </View>
        </View>
        <Text style={styles.contactText}>
          Emergency Contact: {patient.emergencyContactName} ({patient.emergencyContactPhone})
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'meds' && styles.tabButtonActive]}
          onPress={() => setActiveTab('meds')}
        >
          <Text style={[styles.tabText, activeTab === 'meds' && styles.tabTextActive]}>
            💊 Meds ({medicines.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'conditions' && styles.tabButtonActive]}
          onPress={() => setActiveTab('conditions')}
        >
          <Text style={[styles.tabText, activeTab === 'conditions' && styles.tabTextActive]}>
            🩺 Conditions ({conditions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'allergies' && styles.tabButtonActive]}
          onPress={() => setActiveTab('allergies')}
        >
          <Text style={[styles.tabText, activeTab === 'allergies' && styles.tabTextActive]}>
            ⚠️ Allergies ({allergies.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Medications Tab */}
        {activeTab === 'meds' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Documented Active Medications</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleOpenModal('med')}
              >
                <Text style={styles.addBtnText}>+ Add Med</Text>
              </TouchableOpacity>
            </View>

            {medicines.map((m) => (
              <View key={m.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{m.name}</Text>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>{m.isActive ? 'Active' : 'Past'}</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>
                  Generic: {m.genericName} • Dosage: {m.dosage}
                </Text>
                <Text style={styles.cardNotes}>
                  Frequency: {m.frequency} ({m.timing})
                </Text>
                {m.instructions ? (
                  <Text style={styles.instructions}>Doctor Instruction: {m.instructions}</Text>
                ) : null}
                <View style={styles.provenanceBox}>
                  <ProvenanceTag
                    source={m.provenance.source}
                    documentName={m.provenance.documentName}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Conditions Tab */}
        {activeTab === 'conditions' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Documented Health Conditions</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleOpenModal('condition')}
              >
                <Text style={styles.addBtnText}>+ Add Condition</Text>
              </TouchableOpacity>
            </View>

            {conditions.map((c) => (
              <View key={c.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{c.name}</Text>
                  <Text style={styles.statusBadge}>{c.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.cardSub}>
                  Category: {c.icdOrCategory} • Diagnosed: {c.diagnosedDate}
                </Text>
                <Text style={styles.cardNotes}>{c.notes}</Text>
                <View style={styles.provenanceBox}>
                  <ProvenanceTag
                    source={c.provenance.source}
                    documentName={c.provenance.documentName}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Allergies Tab */}
        {activeTab === 'allergies' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Known Drug & Environmental Allergies</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleOpenModal('allergy')}
              >
                <Text style={styles.addBtnText}>+ Add Allergy</Text>
              </TouchableOpacity>
            </View>

            {allergies.map((a) => (
              <View key={a.id} style={[styles.card, styles.allergyCard]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.allergyTitle}>⚠️ {a.allergen}</Text>
                  <View style={styles.severityBadge}>
                    <Text style={styles.severityBadgeText}>{a.severity}</Text>
                  </View>
                </View>
                <Text style={styles.allergySub}>Clinical Reaction: {a.reaction}</Text>
                <View style={styles.provenanceBox}>
                  <ProvenanceTag
                    source={a.provenance.source}
                    documentName={a.provenance.documentName}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Record Modal */}
      <Modal visible={modalType !== 'none'} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add {modalType === 'med' ? 'Medication' : modalType === 'condition' ? 'Condition' : 'Allergy'}
            </Text>

            <Text style={styles.inputLabel}>
              {modalType === 'med' ? 'Medicine Name' : modalType === 'condition' ? 'Condition Name' : 'Allergen Name'}:
            </Text>
            <TextInput
              style={styles.textInput}
              value={inputName}
              onChangeText={setInputName}
              placeholder="e.g. Paracetamol"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputLabel}>
              {modalType === 'med' ? 'Generic Name' : modalType === 'condition' ? 'Category / ICD' : 'Reaction'}:
            </Text>
            <TextInput
              style={styles.textInput}
              value={inputDetail1}
              onChangeText={setInputDetail1}
              placeholder="e.g. Acetaminophen"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputLabel}>
              {modalType === 'med' ? 'Dosage' : modalType === 'condition' ? 'Clinical Notes' : 'Severity (Mild/Moderate/Severe)'}:
            </Text>
            <TextInput
              style={styles.textInput}
              value={inputDetail2}
              onChangeText={setInputDetail2}
              placeholder="e.g. 500mg"
              placeholderTextColor="#64748B"
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalType('none')}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveModal}>
                <Text style={styles.modalSaveBtnText}>Save to Memory</Text>
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
  profileCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileName: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  profileMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  verifiedBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: { color: '#34D399', fontSize: 10, fontWeight: '700' },
  contactText: { fontSize: 11, color: '#64748B', marginTop: 8 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  tabButtonActive: { backgroundColor: '#0284C7' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  tabTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: 16 },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  addBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  allergyCard: { borderColor: '#EF444455', backgroundColor: '#450A0A33' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  allergyTitle: { fontSize: 15, fontWeight: '700', color: '#F87171' },
  activePill: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: { color: '#34D399', fontSize: 10, fontWeight: '700' },
  statusBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: '#0284C722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityBadge: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityBadgeText: { color: '#FEE2E2', fontSize: 10, fontWeight: '700' },
  cardSub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  allergySub: { fontSize: 12, color: '#FCA5A5', marginTop: 4 },
  cardNotes: { fontSize: 12, color: '#CBD5E1', marginTop: 4 },
  instructions: { fontSize: 11, color: '#38BDF8', fontStyle: 'italic', marginTop: 4 },
  provenanceBox: { marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#334155' },
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
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginBottom: 14 },
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
  modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#334155' },
  modalCancelBtnText: { color: '#E2E8F0', fontWeight: '600' },
  modalSaveBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#0284C7' },
  modalSaveBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
