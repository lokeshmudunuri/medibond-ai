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
  TextInput,
} from 'react-native';
import { DoctorHandoffEngine, DoctorSummaryType } from '../services/DoctorHandoffEngine';
import { HealthMemoryService } from '../services/HealthMemoryService';
import { DoctorDirectoryService, DoctorSpecialistProfile } from '../services/DoctorDirectoryService';

export const DoctorScreen: React.FC<{ navigation?: any }> = () => {
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'HANDOFF'>('DIRECTORY');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<DoctorSummaryType>(DoctorSummaryType.GeneralDoctor);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const memory = HealthMemoryService.getInstance();
  const context = memory.buildCurrentContext();
  const generatedReport = DoctorHandoffEngine.generateSummary(context, selectedType);

  const specialties = [
    'ALL',
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

  const allSpecialists = DoctorDirectoryService.getAllSpecialists();
  const filteredSpecialists = allSpecialists.filter(s => {
    const matchesSpec = selectedSpecialty === 'ALL' || s.specialty.toLowerCase() === selectedSpecialty.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      s.name.toLowerCase().includes(q) ||
      s.specialty.toLowerCase().includes(q) ||
      s.hospitalName.toLowerCase().includes(q) ||
      s.conditionsHandled.some(c => c.toLowerCase().includes(q));
    return matchesSpec && matchesQuery;
  });

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
      {/* Top Tab Bar */}
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'DIRECTORY' && styles.activeTopTabBtn]}
          onPress={() => setActiveTab('DIRECTORY')}
        >
          <Text style={[styles.topTabBtnText, activeTab === 'DIRECTORY' && styles.activeTopTabText]}>
            👨‍⚕️ Specialist Directory (12)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'HANDOFF' && styles.activeTopTabBtn]}
          onPress={() => setActiveTab('HANDOFF')}
        >
          <Text style={[styles.topTabBtnText, activeTab === 'HANDOFF' && styles.activeTopTabText]}>
            📋 Clinical Dossier Export
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'DIRECTORY' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Recovery Specialist Directory</Text>
            <Text style={styles.headerSubtitle}>
              12 comprehensive specialist profiles with post-op instructions, dietary guidelines, and recovery milestones.
            </Text>

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search doctor, hospital, or recovery condition..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Specialty Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {specialties.map(spec => (
                <TouchableOpacity
                  key={spec}
                  style={[styles.filterChip, selectedSpecialty === spec && styles.activeFilterChip]}
                  onPress={() => setSelectedSpecialty(spec)}
                >
                  <Text style={[styles.filterChipText, selectedSpecialty === spec && styles.activeFilterChipText]}>
                    {spec}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Specialist List */}
          {filteredSpecialists.map(doc => {
            const isExpanded = expandedDocId === doc.id;
            return (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docHeaderRow}>
                  <View style={styles.docAvatarBox}>
                    <Text style={styles.docAvatarText}>👨‍⚕️</Text>
                  </View>
                  <View style={styles.docMainInfo}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.docName}>{doc.name}</Text>
                      <View style={styles.demoBadge}>
                        <Text style={styles.demoBadgeText}>Demo Profile</Text>
                      </View>
                    </View>
                    <Text style={styles.docSpecialty}>{doc.specialty} • {doc.experienceYears} Years Exp</Text>
                    <Text style={styles.docHospital}>🏥 {doc.hospitalName}, {doc.hospitalLocation}</Text>
                  </View>
                </View>

                <Text style={styles.docBio}>{doc.bio}</Text>

                <View style={styles.conditionsBox}>
                  <Text style={styles.conditionsLabel}>Conditions Handled:</Text>
                  <View style={styles.tagWrap}>
                    {doc.conditionsHandled.map((c, i) => (
                      <View key={i} style={styles.conditionTag}>
                        <Text style={styles.conditionTagText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.divider} />
                    <Text style={styles.expHeading}>📋 Sample Recovery Instructions:</Text>
                    {doc.sampleInstructions.map((inst, i) => (
                      <Text key={i} style={styles.bulletText}>• {inst}</Text>
                    ))}

                    <Text style={[styles.expHeading, { marginTop: 10 }]}>🚫 Restrictions:</Text>
                    {doc.sampleRestrictions.map((r, i) => (
                      <Text key={i} style={styles.bulletText}>• {r}</Text>
                    ))}

                    <Text style={[styles.expHeading, { marginTop: 10 }]}>🥗 Diet & Hydration:</Text>
                    <Text style={styles.bulletText}>{doc.sampleDietGuidance}</Text>

                    <Text style={[styles.expHeading, { marginTop: 10 }]}>🎯 Typical Milestones:</Text>
                    {doc.typicalMilestones.map((m, i) => (
                      <View key={i} style={styles.milestoneRow}>
                        <Text style={styles.milestoneDay}>Day {m.dayNumber}:</Text>
                        <Text style={styles.milestoneDesc}><Text style={styles.bold}>{m.title}</Text> - {m.description}</Text>
                      </View>
                    ))}

                    <View style={styles.contactCard}>
                      <Text style={styles.contactTitle}>📞 Contact / Teleconsult:</Text>
                      <Text style={styles.contactText}>Phone: {doc.contactInfo.phone}</Text>
                      <Text style={styles.contactText}>Hours: {doc.contactInfo.clinicHours}</Text>
                      <Text style={styles.contactText}>Languages: {doc.languages.join(', ')}</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.expandToggleBtn}
                  onPress={() => setExpandedDocId(isExpanded ? null : doc.id)}
                >
                  <Text style={styles.expandToggleText}>
                    {isExpanded ? '▲ Show Less' : '▼ View Recovery Guidelines & Milestones'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      ) : (
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

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>📤 Share Dossier with Clinician</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topTabBar: { flexDirection: 'row', backgroundColor: '#0f172a', paddingHorizontal: 12, paddingTop: 10 },
  topTabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTopTabBtn: { borderBottomColor: '#38bdf8' },
  topTabBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  activeTopTabText: { color: '#ffffff' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 12, lineHeight: 18 },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  filterScroll: { flexDirection: 'row', marginTop: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
  },
  activeFilterChip: { backgroundColor: '#0284c7' },
  filterChipText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  activeFilterChipText: { color: '#ffffff' },
  docCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  docHeaderRow: { flexDirection: 'row', marginBottom: 10 },
  docAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docAvatarText: { fontSize: 22 },
  docMainInfo: { flex: 1 },
  nameBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  demoBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  demoBadgeText: { color: '#92400e', fontSize: 10, fontWeight: '700' },
  docSpecialty: { fontSize: 13, fontWeight: '600', color: '#0284c7', marginTop: 2 },
  docHospital: { fontSize: 12, color: '#64748b', marginTop: 2 },
  docBio: { fontSize: 13, color: '#334155', lineHeight: 18, marginBottom: 10 },
  conditionsBox: { marginBottom: 8 },
  conditionsLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  conditionTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  conditionTagText: { fontSize: 11, color: '#475569', fontWeight: '500' },
  expandedSection: { marginTop: 6 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  expHeading: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  bulletText: { fontSize: 12, color: '#334155', lineHeight: 17, marginVertical: 2 },
  bold: { fontWeight: '700', color: '#0f172a' },
  milestoneRow: { flexDirection: 'row', marginVertical: 3 },
  milestoneDay: { fontSize: 12, fontWeight: '700', color: '#0284c7', width: 60 },
  milestoneDesc: { fontSize: 12, color: '#334155', flex: 1 },
  contactCard: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  contactTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  contactText: { fontSize: 11, color: '#475569', marginVertical: 1 },
  expandToggleBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 6 },
  expandToggleText: { fontSize: 12, fontWeight: '700', color: '#0284c7' },
  typeSelectorRow: { flexDirection: 'row', marginBottom: 12 },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  activePill: { backgroundColor: '#0284c7' },
  typeText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  activeTypeText: { color: '#ffffff', fontWeight: '700' },
  reportBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    minHeight: 200,
    marginBottom: 16,
  },
  reportText: { fontFamily: 'monospace', fontSize: 11, color: '#334155', lineHeight: 16 },
  actionRow: { marginTop: 8 },
  shareButton: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  shareButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
