import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Share,
  Alert,
} from 'react-native';
import { DoctorHandoffEngine, DoctorSummaryType } from '../services/DoctorHandoffEngine';
import { HealthMemoryService } from '../services/HealthMemoryService';

export const DoctorScreen: React.FC<{ navigation?: any }> = () => {
  const [selectedType, setSelectedType] = useState<DoctorSummaryType>(
    DoctorSummaryType.GeneralDoctor
  );
  const memory = HealthMemoryService.getInstance();
  const context = memory.buildCurrentContext();

  const generatedReport = DoctorHandoffEngine.generateSummary(context, selectedType);

  const handleShare = async () => {
    try {
      await Share.share({
        message: generatedReport,
        title: 'CareBond Clinical Health Handoff Summary',
      });
    } catch (e: any) {
      Alert.alert('Share Error', e?.message || 'Could not export clinical summary.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Doctor Clinical Handoff</Text>
          <Text style={styles.headerSubtitle}>
            Generates structured clinical dossiers with provenance tags
          </Text>
        </View>

        {/* Type Selectors */}
        <View style={styles.typeSelectorRow}>
          <TouchableOpacity
            style={[
              styles.typePill,
              selectedType === DoctorSummaryType.GeneralDoctor && styles.activePill,
            ]}
            onPress={() => setSelectedType(DoctorSummaryType.GeneralDoctor)}
          >
            <Text
              style={[
                styles.typeText,
                selectedType === DoctorSummaryType.GeneralDoctor && styles.activeTypeText,
              ]}
            >
              General Physician
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typePill,
              selectedType === DoctorSummaryType.Specialist && styles.activePill,
            ]}
            onPress={() => setSelectedType(DoctorSummaryType.Specialist)}
          >
            <Text
              style={[
                styles.typeText,
                selectedType === DoctorSummaryType.Specialist && styles.activeTypeText,
              ]}
            >
              Cardiology / Specialist
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typePill,
              selectedType === DoctorSummaryType.RecoveryReview && styles.activePill,
            ]}
            onPress={() => setSelectedType(DoctorSummaryType.RecoveryReview)}
          >
            <Text
              style={[
                styles.typeText,
                selectedType === DoctorSummaryType.RecoveryReview && styles.activeTypeText,
              ]}
            >
              Surgical Post-Op
            </Text>
          </TouchableOpacity>
        </View>

        {/* Report Output Preview */}
        <View style={styles.reportBox}>
          <Text style={styles.reportText}>{generatedReport}</Text>
        </View>

        {/* Export / Share Button */}
        <TouchableOpacity style={styles.exportBtn} onPress={handleShare}>
          <Text style={styles.exportBtnText}>📤 Export / Share Clinical Dossier</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { padding: 16 },
  header: { marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  typeSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activePill: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  typeText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  activeTypeText: { color: '#FFFFFF', fontWeight: '700' },
  reportBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reportText: { fontFamily: 'monospace', fontSize: 11, color: '#E2E8F0', lineHeight: 17 },
  exportBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  exportBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
