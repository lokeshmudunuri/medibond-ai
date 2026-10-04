import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useCaseStore } from '../store/useCaseStore';
import { CaseType } from '../types/case';

interface CreateCaseModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (caseId: string) => void;
  defaultType?: CaseType;
}

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({
  visible,
  onClose,
  onCreated,
  defaultType = 'GENERAL',
}) => {
  const { createCase } = useCaseStore();

  const [title, setTitle] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [dietGuidance, setDietGuidance] = useState('');
  const [initialInstructions, setInitialInstructions] = useState('');
  const [caseType, setCaseType] = useState<CaseType>(defaultType);

  const handleCreate = () => {
    if (!title.trim() || !doctorName.trim() || !hospitalName.trim()) {
      Alert.alert(
        'Required Fields',
        'Please enter Case Title, Doctor Name, and Hospital/Clinic Name.'
      );
      return;
    }

    const newCase = createCase({
      title: title.trim(),
      doctorName: doctorName.trim(),
      hospitalName: hospitalName.trim(),
      specialty: specialty.trim() || undefined,
      description: description.trim() || undefined,
      caseType,
      followUpDate: followUpDate.trim() || undefined,
      dietGuidance: dietGuidance.trim() || undefined,
      initialInstructions: initialInstructions.trim() || undefined,
    });

    // Reset fields
    setTitle('');
    setDoctorName('');
    setHospitalName('');
    setSpecialty('');
    setDescription('');
    setFollowUpDate('');
    setDietGuidance('');
    setInitialInstructions('');

    onClose();
    if (onCreated) {
      onCreated(newCase.id);
    }
  };

  const handleQuickTemplate = (templateTitle: string, doc: string, hosp: string, spec: string) => {
    setTitle(templateTitle);
    setDoctorName(doc);
    setHospitalName(hosp);
    setSpecialty(spec);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Create New Health Case</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Organize prescriptions, reports, medications, and AI explanations under a specific doctor or situation.
          </Text>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Quick Template Suggestions */}
            <Text style={styles.quickTemplateLabel}>Quick Examples:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateRow}>
              <TouchableOpacity
                style={styles.templateBadge}
                onPress={() =>
                  handleQuickTemplate(
                    'Dr Ravi - Rashi Hospital',
                    'Dr. Ravi Swaminathan',
                    'Rashi Hospital',
                    'Cardiology'
                  )
                }
              >
                <Text style={styles.templateText}>Cardiology Visit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.templateBadge}
                onPress={() =>
                  handleQuickTemplate(
                    'Dr Kumar - Apollo',
                    'Dr. Kumar Sharma',
                    'Apollo Clinic',
                    'General Medicine'
                  )
                }
              >
                <Text style={styles.templateText}>Diabetes Follow-up</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.templateBadge}
                onPress={() =>
                  handleQuickTemplate(
                    'Appendix Surgery - Raju Hospital',
                    'Dr. Sarah Chen',
                    'Raju Surgical Hospital',
                    'Surgery'
                  )
                }
              >
                <Text style={styles.templateText}>Post-Op Surgery</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Form Fields */}
            <Text style={styles.inputLabel}>
              Case Title <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dr Ravi - Rashi Hospital"
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>
              Doctor Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dr. Ravi Swaminathan, MD"
              placeholderTextColor="#64748B"
              value={doctorName}
              onChangeText={setDoctorName}
            />

            <Text style={styles.inputLabel}>
              Hospital / Clinic Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rashi Multi-Specialty Hospital"
              placeholderTextColor="#64748B"
              value={hospitalName}
              onChangeText={setHospitalName}
            />

            <Text style={styles.inputLabel}>Specialty (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cardiology, Orthopedics, General"
              placeholderTextColor="#64748B"
              value={specialty}
              onChangeText={setSpecialty}
            />

            <Text style={styles.inputLabel}>Reason for Visit / Description</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Annual hypertension check and lipid review"
              placeholderTextColor="#64748B"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.inputLabel}>Next Follow-up Date (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-11-15 or In 4 Weeks"
              placeholderTextColor="#64748B"
              value={followUpDate}
              onChangeText={setFollowUpDate}
            />

            <Text style={styles.inputLabel}>Initial Doctor Instructions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Take BP tablet every morning, walk 30 mins daily"
              placeholderTextColor="#64748B"
              value={initialInstructions}
              onChangeText={setInitialInstructions}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Diet & Lifestyle Guidance (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Low sodium diet, limit fried foods"
              placeholderTextColor="#64748B"
              value={dietGuidance}
              onChangeText={setDietGuidance}
            />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
              <Text style={styles.submitBtnText}>Create Case File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000B3',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  quickTemplateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  templateRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  templateBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  templateText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  formScroll: {
    maxHeight: 420,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    marginTop: 10,
    marginBottom: 4,
  },
  requiredStar: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  cancelBtnText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#0284C7',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
