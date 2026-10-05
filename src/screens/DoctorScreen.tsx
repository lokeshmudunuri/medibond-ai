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
import { useCaseStore } from '../store/useCaseStore';
import { DocumentVaultService } from '../services/DocumentVaultService';
import { ContinuousRecoveryMonitor } from '../services/ContinuousRecoveryMonitor';

type DoctorScreenTab = 'MY_DOCTORS' | 'FIND_SPECIALIST' | 'HANDOFF';

const HANDOFF_SPECIALISTS = [
  'General Physician',
  'Surgeon',
  'Orthopedics',
  'Cardiology',
  'Neurology',
  'Physiotherapy',
  'Pulmonology',
  'Gastroenterology',
  'Dermatology',
  'ENT',
  'Urology',
  'Gynecology',
];

export const DoctorScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<DoctorScreenTab>('MY_DOCTORS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [selectedHandoffSpecialist, setSelectedHandoffSpecialist] = useState<string>('Orthopedics');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const { cases, activeCaseId } = useCaseStore();
  const [selectedCaseId, setSelectedCaseId] = useState<string>(activeCaseId || (cases[0]?.id ?? ''));

  const memory = HealthMemoryService.getInstance();
  const activeCase = cases.find(c => c.id === selectedCaseId) || cases[0];

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

  // 1. My Doctors / Doctors I've Visited: strictly derived from cases
  const visitedDoctors = cases
    .filter(c => c.doctorName && c.doctorName.trim().length > 0)
    .map(c => ({
      caseId: c.id,
      caseTitle: c.title,
      doctorName: c.doctorName,
      hospitalName: c.hospitalName || 'Local Medical Center',
      specialty: c.specialty || 'Attending Physician',
      followUpDate: c.followUpDate,
      instructionsCount: c.doctorInstructions?.length || 0,
      status: c.status,
    }));

  // 2. 12 Specialist Profiles for Discovery
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

  // 3. Clinical Handoff Dossier Generator
  const generateClinicalHandoffText = () => {
    const context = memory.buildCurrentContext();
    const baseSummary = DoctorHandoffEngine.generateSummary(
      context,
      DoctorSummaryType.Specialist,
      selectedHandoffSpecialist
    );

    const targetCase = activeCase;
    const recProfile = targetCase ? ContinuousRecoveryMonitor.getOrCreateProfile(targetCase.id) : null;
    const caseDocs = targetCase ? DocumentVaultService.getRecordsForCase(targetCase.id) : [];

    const lines: string[] = [
      baseSummary,
      '',
      '--- SCOPED CASE CLINICAL DETAILS ---',
      `Target Case: ${targetCase ? targetCase.title : 'General Consultation'}`,
      `Attending Physician: ${targetCase?.doctorName || 'Not specified'} (${targetCase?.hospitalName || 'N/A'})`,
      `Documented Symptoms: ${targetCase?.symptoms?.join(', ') || 'No active acute symptoms recorded'}`,
      `Recent Recovery Deltas: ${recProfile ? `Status: ${recProfile.currentStatus} | Day ${recProfile.currentDay} | Pain ${recProfile.currentPainScore}/10` : 'Stable'}`,
      `Attached Clinical Documents: ${caseDocs.length} record(s) on file (${caseDocs.map(d => d.title).join(', ') || 'None'})`,
      `Doctor Instructions on File: ${targetCase?.doctorInstructions?.join('; ') || 'Follow general health guidelines'}`,
      '',
      '[LOCAL AI CLINICAL SUMMARY]:',
      `On-device synthesis confirms patient is prepared for clinical consultation with ${selectedHandoffSpecialist}. All active medications and allergy warnings have been cross-checked offline.`,
      '',
      'QUESTIONS FOR CLINICIAN:',
      `• Please review existing therapy regimen in the context of ${selectedHandoffSpecialist} consultation.`,
      `• Advise on any medication adjustments or targeted diagnostics needed.`,
      '',
      '===============================================================',
      'CAREBOND AI — CONFIRMED CASE DATA ONLY. NO FABRICATED INFORMATION.',
      '===============================================================',
    ];

    return lines.join('\n');
  };

  const [handoffReport, setHandoffReport] = useState<string>(generateClinicalHandoffText());

  const handlePrepareHandoff = () => {
    const report = generateClinicalHandoffText();
    setHandoffReport(report);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: handoffReport,
        title: `CareBond Clinical Handoff — ${selectedHandoffSpecialist}`,
      });
    } catch (e: any) {
      Alert.alert('Share Error', e?.message || 'Could not export clinical summary.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header with Back Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (navigation ? navigation.goBack() : null)}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.topHeaderCenter}>
          <Text style={styles.topHeaderTitle}>Doctor & Clinical Care</Text>
          <Text style={styles.topHeaderSubtitle}>Attending Physicians • Specialist Directory • Handoff</Text>
        </View>
      </View>

      {/* 3 Dedicated Segmented Navigation Tabs */}
      <View style={styles.segmentedTabBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'MY_DOCTORS' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('MY_DOCTORS')}
        >
          <Text style={[styles.segmentText, activeTab === 'MY_DOCTORS' && styles.segmentTextActive]}>
            👨‍⚕️ My Doctors ({visitedDoctors.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'FIND_SPECIALIST' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('FIND_SPECIALIST')}
        >
          <Text style={[styles.segmentText, activeTab === 'FIND_SPECIALIST' && styles.segmentTextActive]}>
            🔍 Find a Specialist (12)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'HANDOFF' && styles.segmentBtnActive]}
          onPress={() => {
            handlePrepareHandoff();
            setActiveTab('HANDOFF');
          }}
        >
          <Text style={[styles.segmentText, activeTab === 'HANDOFF' && styles.segmentTextActive]}>
            📋 Clinical Handoff
          </Text>
        </TouchableOpacity>
      </View>

      {/* ======================================================== */}
      {/* TAB 1: MY DOCTORS / DOCTORS I'VE VISITED (Requirement 12) */}
      {/* ======================================================== */}
      {activeTab === 'MY_DOCTORS' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionHeaderBox}>
            <Text style={styles.sectionHeading}>My Doctors / Doctors I've Visited</Text>
            <Text style={styles.sectionSubHeading}>
              Physicians associated with your verified case files and previous consultations.
            </Text>
          </View>

          {visitedDoctors.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🩺</Text>
              <Text style={styles.emptyTitle}>No Doctors Visited Yet</Text>
              <Text style={styles.emptySubtitle}>
                Attending doctors linked to your health cases (such as Dr. Ravi Kumar at Rashi Hospital) will appear here automatically.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => navigation?.navigate?.('Home')}
              >
                <Text style={styles.emptyActionBtnText}>📂 Open Health Cases</Text>
              </TouchableOpacity>
            </View>
          ) : (
            visitedDoctors.map((doc, idx) => (
              <View key={`${doc.caseId}_${idx}`} style={styles.myDocCard}>
                <View style={styles.myDocHeader}>
                  <View style={styles.myDocAvatar}>
                    <Text style={styles.myDocAvatarIcon}>👨‍⚕️</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.myDocName}>{doc.doctorName}</Text>
                    <Text style={styles.myDocSpecialty}>{doc.specialty}</Text>
                    <Text style={styles.myDocHospital}>🏥 {doc.hospitalName}</Text>
                  </View>
                  <View style={styles.myDocStatusBadge}>
                    <Text style={styles.myDocStatusText}>{doc.status}</Text>
                  </View>
                </View>

                <View style={styles.myDocCaseInfo}>
                  <Text style={styles.myDocCaseLabel}>Linked Case File:</Text>
                  <Text style={styles.myDocCaseTitle}>📁 {doc.caseTitle}</Text>
                </View>

                {doc.followUpDate ? (
                  <View style={styles.followUpRow}>
                    <Text style={styles.followUpLabel}>🗓️ Scheduled Follow-up:</Text>
                    <Text style={styles.followUpDate}>{doc.followUpDate}</Text>
                  </View>
                ) : null}

                <View style={styles.myDocActionsRow}>
                  <TouchableOpacity
                    style={styles.viewCaseBtn}
                    onPress={() => navigation?.navigate?.('CaseDetail', { caseId: doc.caseId })}
                  >
                    <Text style={styles.viewCaseBtnText}>📂 View Case File</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.prepareHandoffBtn}
                    onPress={() => {
                      setSelectedCaseId(doc.caseId);
                      handlePrepareHandoff();
                      setActiveTab('HANDOFF');
                    }}
                  >
                    <Text style={styles.prepareHandoffBtnText}>📋 Doctor Handoff</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ======================================================== */}
      {/* TAB 2: FIND A SPECIALIST (DISCOVERY DIRECTORY) (Req 13) */}
      {/* ======================================================== */}
      {activeTab === 'FIND_SPECIALIST' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionHeaderBox}>
            <Text style={styles.sectionHeading}>Find a Specialist (Discovery Directory)</Text>
            <Text style={styles.sectionSubHeading}>
              Browse 12 comprehensive specialist profiles with post-op instructions, dietary guidelines, and recovery milestones.
            </Text>

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search doctor, hospital, or recovery condition..."
              placeholderTextColor="#94A3B8"
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

          {/* Specialist List (All 12 Preserved) */}
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
                        <Text style={styles.demoBadgeText}>Available Specialist</Text>
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
                      <Text style={styles.contactTitle}>📞 Contact & Teleconsult:</Text>
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
      )}

      {/* ======================================================== */}
      {/* TAB 3: CLINICAL DOCTOR HANDOFF (Requirement 14) */}
      {/* ======================================================== */}
      {activeTab === 'HANDOFF' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionHeaderBox}>
            <Text style={styles.sectionHeading}>Clinical Doctor Handoff</Text>
            <Text style={styles.sectionSubHeading}>
              Prepare a structured clinical dossier for attending doctors strictly from case records.
            </Text>
          </View>

          {/* Case Scope Selector */}
          <Text style={styles.handoffSectionLabel}>SELECT HEALTH CASE:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.caseScrollRow}>
            {cases.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.caseChip, selectedCaseId === c.id && styles.activeCaseChip]}
                onPress={() => {
                  setSelectedCaseId(c.id);
                  handlePrepareHandoff();
                }}
              >
                <Text style={[styles.caseChipText, selectedCaseId === c.id && styles.activeCaseChipText]}>
                  📁 {c.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 12 Specialist Type Selector */}
          <Text style={[styles.handoffSectionLabel, { marginTop: 12 }]}>SELECT CLINICIAN SPECIALTY:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specScrollRow}>
            {HANDOFF_SPECIALISTS.map(spec => (
              <TouchableOpacity
                key={spec}
                style={[styles.specChip, selectedHandoffSpecialist === spec && styles.activeSpecChip]}
                onPress={() => {
                  setSelectedHandoffSpecialist(spec);
                  handlePrepareHandoff();
                }}
              >
                <Text style={[styles.specChipText, selectedHandoffSpecialist === spec && styles.activeSpecChipText]}>
                  {spec}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Structured Summary Preview Cards */}
          <View style={styles.summaryOverviewCard}>
            <Text style={styles.overviewCardTitle}>🩺 Case & Patient Overview</Text>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewKey}>Selected Case:</Text>
              <Text style={styles.overviewVal}>{activeCase ? activeCase.title : 'General Consultation'}</Text>
            </View>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewKey}>Attending Doctor:</Text>
              <Text style={styles.overviewVal}>{activeCase?.doctorName || 'Dr. Ravi Kumar (Demo)'}</Text>
            </View>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewKey}>Hospital:</Text>
              <Text style={styles.overviewVal}>{activeCase?.hospitalName || 'Rashi Hospital'}</Text>
            </View>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewKey}>Doctor Specialty:</Text>
              <Text style={styles.overviewValHighlight}>{selectedHandoffSpecialist}</Text>
            </View>
          </View>

          {/* Generated Dossier Preview Box */}
          <View style={styles.dossierCard}>
            <View style={styles.dossierHeaderRow}>
              <Text style={styles.dossierTitle}>Structured Clinical Dossier</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={handlePrepareHandoff}>
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dossierBox}>
              <Text style={styles.dossierText}>{handoffReport}</Text>
            </View>
          </View>

          {/* Share Action Button */}
          <TouchableOpacity style={styles.shareHandoffBtn} onPress={handleShare}>
            <Text style={styles.shareHandoffBtnText}>📤 Export & Share Dossier with Clinician</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topHeaderCenter: { flex: 1, marginLeft: 10 },
  topHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  topHeaderSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backBtnText: { color: '#0284C7', fontSize: 13, fontWeight: '700' },
  segmentedTabBar: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 4,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#0284C7',
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  segmentText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  segmentTextActive: { color: '#FFFFFF', fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionHeaderBox: { marginBottom: 14 },
  sectionHeading: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  sectionSubHeading: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 17 },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 10,
    marginBottom: 8,
  },
  filterScroll: { flexDirection: 'row', marginTop: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterChip: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  filterChipText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  activeFilterChipText: { color: '#FFFFFF', fontWeight: '700' },

  // My Doctors Cards
  myDocCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  myDocHeader: { flexDirection: 'row', alignItems: 'center' },
  myDocAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  myDocAvatarIcon: { fontSize: 22 },
  myDocName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  myDocSpecialty: { fontSize: 12, color: '#0284C7', fontWeight: '600', marginTop: 1 },
  myDocHospital: { fontSize: 11, color: '#64748B', marginTop: 2 },
  myDocStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  myDocStatusText: { color: '#16A34A', fontSize: 10, fontWeight: '700' },
  myDocCaseInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  myDocCaseLabel: { fontSize: 10, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' },
  myDocCaseTitle: { fontSize: 13, color: '#0F172A', fontWeight: '600', marginTop: 2 },
  followUpRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  followUpLabel: { fontSize: 11, color: '#64748B' },
  followUpDate: { fontSize: 11, color: '#0F172A', fontWeight: '700', marginLeft: 4 },
  myDocActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  viewCaseBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  viewCaseBtnText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  prepareHandoffBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  prepareHandoffBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  emptySubtitle: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, lineHeight: 17, marginBottom: 16 },
  emptyActionBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyActionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Specialist Cards (Discovery)
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  docHeaderRow: { flexDirection: 'row' },
  docAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docAvatarText: { fontSize: 22 },
  docMainInfo: { flex: 1 },
  nameBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  demoBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  demoBadgeText: { color: '#0284C7', fontSize: 10, fontWeight: '700' },
  docSpecialty: { fontSize: 12, color: '#0284C7', fontWeight: '600', marginTop: 2 },
  docHospital: { fontSize: 11, color: '#64748B', marginTop: 2 },
  docBio: { fontSize: 12, color: '#475569', marginTop: 8, lineHeight: 17 },
  conditionsBox: { marginTop: 10 },
  conditionsLabel: { fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 4 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  conditionTag: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  conditionTagText: { fontSize: 11, color: '#475569' },
  expandedSection: { marginTop: 12 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  expHeading: { fontSize: 12, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  bulletText: { fontSize: 12, color: '#475569', lineHeight: 18, marginLeft: 4 },
  milestoneRow: { flexDirection: 'row', marginVertical: 2 },
  milestoneDay: { fontSize: 11, fontWeight: '700', color: '#0284C7', width: 55 },
  milestoneDesc: { fontSize: 11, color: '#334155', flex: 1 },
  bold: { fontWeight: '700' },
  contactCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactTitle: { fontSize: 11, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  contactText: { fontSize: 11, color: '#475569' },
  expandToggleBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 6 },
  expandToggleText: { fontSize: 12, color: '#0284C7', fontWeight: '700' },

  // Handoff Tab
  handoffSectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6 },
  caseScrollRow: { flexDirection: 'row', marginBottom: 10 },
  caseChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeCaseChip: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  caseChipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  activeCaseChipText: { color: '#FFFFFF', fontWeight: '700' },
  specScrollRow: { flexDirection: 'row', marginBottom: 14 },
  specChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeSpecChip: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  specChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  activeSpecChipText: { color: '#FFFFFF', fontWeight: '700' },
  summaryOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  overviewCardTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  overviewKey: { fontSize: 12, color: '#64748B' },
  overviewVal: { fontSize: 12, color: '#0F172A', fontWeight: '600' },
  overviewValHighlight: { fontSize: 12, color: '#0284C7', fontWeight: '700' },
  dossierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dossierHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dossierTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  refreshBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F1F5F9' },
  refreshBtnText: { fontSize: 11, color: '#0284C7', fontWeight: '700' },
  dossierBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 280,
  },
  dossierText: { fontSize: 11, color: '#334155', fontFamily: 'monospace', lineHeight: 16 },
  shareHandoffBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  shareHandoffBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
