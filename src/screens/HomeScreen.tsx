import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useCaseStore } from '../store/useCaseStore';
import { CreateCaseModal } from './CreateCaseModal';
import { HealthMemoryService } from '../services/HealthMemoryService';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { cases, selectCase } = useCaseStore();
  const memory = HealthMemoryService.getInstance();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [activeTrack, setActiveTrack] = useState<'GENERAL' | 'RECOVERY'>('GENERAL');

  const handleOpenCase = (caseId: string) => {
    selectCase(caseId);
    navigation.navigate('CaseDetail', { caseId });
  };

  const handleCreatedCase = (newCaseId: string) => {
    handleOpenCase(newCaseId);
  };

  const activeCases = cases.filter((c) => c.status === 'ACTIVE');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top App Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>CareBond AI</Text>
          <Text style={styles.appSubtitle}>Offline Medical & Case Management Companion</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsBtnText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Track Mode Switcher */}
      <View style={styles.trackContainer}>
        <TouchableOpacity
          style={[styles.trackTab, activeTrack === 'GENERAL' && styles.trackTabActive]}
          onPress={() => setActiveTrack('GENERAL')}
        >
          <Text style={[styles.trackText, activeTrack === 'GENERAL' && styles.trackTextActive]}>
            🏥 General Health Cases
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.trackTab, activeTrack === 'RECOVERY' && styles.trackTabActive]}
          onPress={() => {
            setActiveTrack('RECOVERY');
            navigation.navigate('Recovery');
          }}
        >
          <Text style={[styles.trackText, activeTrack === 'RECOVERY' && styles.trackTextActive]}>
            📈 Recovery Track
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quick Action Grid */}
        <View style={styles.quickActionGrid}>
          <TouchableOpacity
            style={[styles.actionButton, styles.createCaseBtn]}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionTitle}>Create Case</Text>
            <Text style={styles.actionSubtitle}>Doctor / Visit situation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Documents', { scanMode: 'prescription' })}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionTitle}>Scan Rx</Text>
            <Text style={styles.actionSubtitle}>Prescription OCR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Documents', { scanMode: 'lab' })}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🧪</Text>
            <Text style={styles.actionTitle}>Scan Report</Text>
            <Text style={styles.actionSubtitle}>Lab / Diagnostic</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.voiceBtn]}
            onPress={() => navigation.navigate('Voice')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🎙️</Text>
            <Text style={[styles.actionTitle, styles.voiceTitle]}>Voice Agent</Text>
            <Text style={styles.actionSubtitle}>Talk to CareBond</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Vault')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📁</Text>
            <Text style={styles.actionTitle}>Record Vault</Text>
            <Text style={styles.actionSubtitle}>Scans & Labs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.modelsBtn]}
            onPress={() => navigation.navigate('Models')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🧠</Text>
            <Text style={[styles.actionTitle, styles.modelsTitle]}>Offline Models</Text>
            <Text style={styles.actionSubtitle}>Download & Manage</Text>
          </TouchableOpacity>
        </View>

        {/* Case Files Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Health Case Files</Text>
          {activeCases.length > 0 && (
            <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
              <Text style={styles.addCaseLink}>+ New Case</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeCases.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconBg}>
              <Text style={styles.emptyIcon}>📂</Text>
            </View>
            <Text style={styles.emptyTitle}>No Health Cases Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a case file for your doctor, hospital visit, or medical condition to keep all prescriptions, reports, medications, and AI explanations organized in one place.
            </Text>
            <TouchableOpacity
              style={styles.createFirstCaseBtn}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.createFirstCaseBtnText}>+ Create Your First Case</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeCases.map((caseItem) => {
            const medCount = memory.getMedicinesByCase(caseItem.id).length;
            const repCount = memory.getReportsByCase(caseItem.id).length;

            return (
              <TouchableOpacity
                key={caseItem.id}
                style={styles.caseCard}
                onPress={() => handleOpenCase(caseItem.id)}
                activeOpacity={0.7}
              >
                <View style={styles.caseCardHeader}>
                  <View style={styles.caseCardLeft}>
                    <Text style={styles.caseCardTitle}>{caseItem.title}</Text>
                    <Text style={styles.caseCardDoctor}>
                      👨‍⚕️ {caseItem.doctorName} • 🏥 {caseItem.hospitalName}
                    </Text>
                  </View>
                  <View style={styles.caseStatusBadge}>
                    <Text style={styles.caseStatusText}>{caseItem.status}</Text>
                  </View>
                </View>

                {caseItem.description && (
                  <Text style={styles.caseDescription} numberOfLines={2}>
                    {caseItem.description}
                  </Text>
                )}

                <View style={styles.caseFooter}>
                  <View style={styles.caseCountsRow}>
                    <Text style={styles.caseCountBadge}>💊 {medCount} Meds</Text>
                    <Text style={styles.caseCountBadge}>📄 {repCount} Reports</Text>
                    {caseItem.doctorInstructions.length > 0 && (
                      <Text style={styles.caseCountBadge}>
                        📋 {caseItem.doctorInstructions.length} Advice
                      </Text>
                    )}
                  </View>

                  {caseItem.followUpDate && (
                    <Text style={styles.caseFollowUp}>
                      Follow-up: {caseItem.followUpDate}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create Case Modal */}
      <CreateCaseModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={handleCreatedCase}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  appTitle: { fontSize: 22, fontWeight: '800', color: '#38BDF8' },
  appSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  settingsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingsBtnText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  trackContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
  },
  trackTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  trackTabActive: { backgroundColor: '#0284C7' },
  trackText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  trackTextActive: { color: '#FFFFFF', fontWeight: '700' },
  scrollContent: { padding: 16 },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  createCaseBtn: {
    borderColor: '#0284C7',
    backgroundColor: '#0284C722',
  },
  voiceBtn: {
    borderColor: '#38BDF8',
  },
  modelsBtn: {
    borderColor: '#818CF8',
    backgroundColor: '#818CF815',
  },
  actionIcon: { fontSize: 22, marginBottom: 6 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: '#F8FAFC' },
  voiceTitle: { color: '#38BDF8' },
  modelsTitle: { color: '#A5B4FC' },
  actionSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  addCaseLink: { fontSize: 12, color: '#38BDF8', fontWeight: '700' },
  emptyStateContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 8,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginBottom: 6 },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  createFirstCaseBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  createFirstCaseBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  caseCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  caseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  caseCardLeft: { flex: 1, marginRight: 8 },
  caseCardTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  caseCardDoctor: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  caseStatusBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  caseStatusText: { color: '#34D399', fontSize: 10, fontWeight: '700' },
  caseDescription: { fontSize: 12, color: '#CBD5E1', marginTop: 8, lineHeight: 16 },
  caseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  caseCountsRow: { flexDirection: 'row', gap: 6 },
  caseCountBadge: {
    fontSize: 11,
    color: '#38BDF8',
    backgroundColor: '#0284C722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  caseFollowUp: { fontSize: 11, color: '#94A3B8' },
});
