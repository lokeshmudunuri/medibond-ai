import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { useCaseStore } from '../store/useCaseStore';
import { ContinuousRecoveryMonitor } from '../services/ContinuousRecoveryMonitor';
import {
  FullRecoveryCaseProfile,
  RecoveryStateSnapshot,
  HourlyRecoveryUpdate,
  DailyRecoverySummary,
  RecoveryTimelineEntry,
} from '../types/recovery';
import { MultilingualService, SupportedLanguage } from '../services/MultilingualService';
import { DoctorHandoffEngine, DoctorSummaryType } from '../services/DoctorHandoffEngine';
import { HealthMemoryService } from '../services/HealthMemoryService';

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

export const RecoveryScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { activeCaseId, activeCase } = useCaseStore();
  const caseId = activeCaseId || 'recovery_case_demo';

  const [profile, setProfile] = useState<FullRecoveryCaseProfile>(
    ContinuousRecoveryMonitor.getOrCreateProfile(caseId, {
      patientName: activeCase?.title || 'Ravi',
      doctorName: activeCase?.doctorName || 'Dr. Ravi Kumar (Demo)',
      hospitalName: activeCase?.hospitalName || 'Rashi Orthopedic Hospital',
    })
  );

  const [language, setLanguage] = useState<SupportedLanguage>(MultilingualService.getLanguage());
  const [painScore, setPainScore] = useState<number>(profile.currentPainScore);
  const [sleepHours, setSleepHours] = useState<number>(profile.currentSleepHours);
  const [mobilityStatus, setMobilityStatus] = useState<'NORMAL' | 'REDUCED' | 'BEDREST' | 'IMPROVING'>('REDUCED');
  const [medAdherence, setMedAdherence] = useState<'FULL' | 'PARTIAL' | 'MISSED' | 'UNKNOWN'>('FULL');
  const [naturalInputText, setNaturalInputText] = useState<string>('');
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(profile.active10MinMonitoring);

  const [snapshots, setSnapshots] = useState<RecoveryStateSnapshot[]>([]);
  const [hourlyUpdates, setHourlyUpdates] = useState<HourlyRecoveryUpdate[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailyRecoverySummary[]>([]);
  const [timeline, setTimeline] = useState<RecoveryTimelineEntry[]>([]);
  const [selectedTimelineEntry, setSelectedTimelineEntry] = useState<RecoveryTimelineEntry | null>(null);

  // Doctor Handoff State
  const [showHandoffModal, setShowHandoffModal] = useState<boolean>(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('Orthopedics');
  const [handoffSummaryText, setHandoffSummaryText] = useState<string>('');

  const refreshData = () => {
    const p = ContinuousRecoveryMonitor.getOrCreateProfile(caseId);
    setProfile(p);
    setSnapshots(ContinuousRecoveryMonitor.getSnapshots(caseId));
    setHourlyUpdates(ContinuousRecoveryMonitor.getHourlyUpdates(caseId));
    setDailySummaries(ContinuousRecoveryMonitor.getDailySummaries(caseId));
    setTimeline(ContinuousRecoveryMonitor.getTimeline(caseId));
    setIsMonitoringActive(p.active10MinMonitoring);
  };

  useEffect(() => {
    refreshData();
  }, [caseId]);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    MultilingualService.setLanguage(lang);
  };

  const handleToggle10MinMonitoring = () => {
    if (isMonitoringActive) {
      ContinuousRecoveryMonitor.stop10MinMonitoring(caseId);
      setIsMonitoringActive(false);
      Alert.alert('Continuous Monitoring Paused', '10-minute active recovery check-in paused.');
    } else {
      ContinuousRecoveryMonitor.start10MinMonitoring(caseId);
      setIsMonitoringActive(true);
      Alert.alert('Continuous Monitoring Active', 'CareBond will now evaluate recovery trends every ~10 minutes locally on device.');
    }
    refreshData();
  };

  const handleSubmitSymptom = async () => {
    let finalPain = painScore;
    let finalSleep = sleepHours;
    let finalMed = medAdherence;
    let finalMob = mobilityStatus;

    if (naturalInputText.trim()) {
      const parsed = MultilingualService.extractMultilingualRecoveryState(naturalInputText, painScore, sleepHours);
      if (parsed.painScore !== undefined) finalPain = parsed.painScore;
      if (parsed.sleepHours !== undefined) finalSleep = parsed.sleepHours;
      if (parsed.medicationTaken !== undefined) {
        finalMed = parsed.medicationTaken ? 'FULL' : 'MISSED';
      }
      if (parsed.mobilityReduced) finalMob = 'REDUCED';
      if (parsed.mobilityImproved) finalMob = 'IMPROVING';
    }

    const snapshot = await ContinuousRecoveryMonitor.recordSnapshot(caseId, {
      painScore: finalPain,
      sleepHours: finalSleep,
      medicationAdherence: finalMed,
      mobilityStatus: finalMob,
      rawUserInput: naturalInputText.trim() || undefined,
      language,
    });

    setNaturalInputText('');
    setPainScore(finalPain);
    setSleepHours(finalSleep);
    setMedAdherence(finalMed);
    setMobilityStatus(finalMob);
    refreshData();

    if (snapshot.safetyEscalation?.isEscalated) {
      Alert.alert('⚠️ Recovery Safety Alert', snapshot.safetyEscalation.reason || 'Symptom exacerbation detected.');
    } else {
      Alert.alert('Recovery Logged', snapshot.changeSummary);
    }
  };

  const handleGenerateHourlyUpdate = () => {
    const update = ContinuousRecoveryMonitor.generateHourlyUpdate(caseId);
    refreshData();
    Alert.alert('Hourly Trend Generated', update.summaryText);
  };

  const handleGenerateDailySummary = () => {
    const daily = ContinuousRecoveryMonitor.generateDailySummary(caseId);
    refreshData();
    Alert.alert(`Day ${daily.dayNumber} Summary Ready`, `Status: ${daily.improvementStatus}. Questions prepared for doctor.`);
  };

  const handlePrepareClinicalHandoff = () => {
    const memory = HealthMemoryService.getInstance();
    const context = memory.buildCurrentContext();
    const baseSummary = DoctorHandoffEngine.generateSummary(context, DoctorSummaryType.RecoveryReview, selectedSpecialist);

    const latestQuestions = dailySummaries.length > 0 ? dailySummaries[dailySummaries.length - 1]?.questionsForDoctor : undefined;
    const questionsList = latestQuestions && latestQuestions.length > 0
      ? latestQuestions.map((q: string) => `• ${q}`).join('\n')
      : `• Is current pain score of ${profile.currentPainScore}/10 expected for Recovery Day ${profile.currentDay}?\n• When can active weight bearing be progressed safely?`;

    const handoffText = [
      baseSummary,
      '',
      '--- RECOVERY WATCH CLINICAL DELTAS ---',
      `Patient Name: ${profile.patientName}`,
      `Recovery Timeline: Day ${profile.currentDay} of ${profile.targetDurationDays}`,
      `Condition / Procedure: ${profile.condition} (${profile.surgeryOrProcedure})`,
      `Current Status: ${profile.currentStatus}`,
      `Today's Symptoms: Pain ${profile.currentPainScore}/10 | Sleep ${profile.currentSleepHours}h | Mobility: ${profile.mobilityLevel.replace('_', ' ')}`,
      `Trend vs Previous Check-In: ${profile.changesSinceYesterday}`,
      `Medication Adherence Rate: ${profile.medicationAdherenceRate}%`,
      `Relevant Attached Documents: ${activeCase?.documentIds?.length || 0} local files`,
      `Attending Doctor Instructions: ${activeCase?.doctorInstructions?.join('; ') || 'Follow post-op guidance'}`,
      '',
      '[LOCAL AI CLINICAL SUMMARY]:',
      `On-device analysis indicates patient is on Day ${profile.currentDay} post-${profile.surgeryOrProcedure}. Vitals and symptom trajectory reflect ${profile.currentStatus}. Pain score is ${profile.currentPainScore}/10. Prescribed medication adherence is ${profile.medicationAdherenceRate}%. Ready for clinical review with ${selectedSpecialist}.`,
      '',
      'KEY QUESTIONS PREPARED FOR DOCTOR:',
      questionsList,
      '',
      '===============================================================',
      'NOTE: This is an on-device clinical handoff dossier for clinician review.',
      '===============================================================',
    ].join('\n');

    setHandoffSummaryText(handoffText);
  };

  const handleShareHandoff = async () => {
    try {
      await Share.share({
        message: handoffSummaryText,
        title: `CareBond Clinical Handoff — ${profile.patientName} (Day ${profile.currentDay})`,
      });
    } catch (e: any) {
      Alert.alert('Share Error', e?.message || 'Failed to export clinical handoff summary.');
    }
  };

  const strings = MultilingualService.getStrings(language);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar with Back Button & Doctor Handoff Trigger */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (navigation ? navigation.goBack() : null)}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.topHeaderCenter}>
          <Text style={styles.topHeaderTitle}>Recovery Track</Text>
          <Text style={styles.topHeaderSubtitle}>Day {profile.currentDay} • {profile.condition}</Text>
        </View>
        <TouchableOpacity
          style={styles.handoffTriggerBtn}
          onPress={() => {
            handlePrepareClinicalHandoff();
            setShowHandoffModal(true);
          }}
        >
          <Text style={styles.handoffTriggerText}>📋 Handoff</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Profile Card — Polished White Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.patientName}>{profile.patientName}</Text>
              <Text style={styles.conditionText}>🩺 {profile.condition} ({profile.surgeryOrProcedure})</Text>
              <Text style={styles.doctorText}>👨‍⚕️ {profile.doctorName} • 🏥 {profile.hospitalName}</Text>
            </View>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeNumber}>Day {profile.currentDay}</Text>
              <Text style={styles.dayBadgeSub}>of {profile.targetDurationDays}</Text>
            </View>
          </View>

          {/* Language Selector */}
          <View style={styles.langBar}>
            <Text style={styles.langLabel}>Language:</Text>
            {(['en', 'te', 'hi', 'kn'] as SupportedLanguage[]).map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.langPill, language === l && styles.activeLangPill]}
                onPress={() => handleLanguageChange(l)}
              >
                <Text style={[styles.langPillText, language === l && styles.activeLangPillText]}>
                  {l === 'en' ? 'English' : l === 'te' ? 'తెలుగు' : l === 'hi' ? 'हिंदी' : 'ಕನ್ನಡ'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Status Alert Banner if Attention/Escalated */}
        {profile.currentStatus !== 'RECOVERING_WELL' && (
          <View style={[styles.alertBanner, profile.currentStatus === 'ESCALATED' ? styles.alertCritical : styles.alertWarning]}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {profile.currentStatus === 'ESCALATED' ? 'EMERGENCY RED FLAG ESCALATION' : 'RECOVERY ATTENTION REQUIRED'}
              </Text>
              <Text style={styles.alertDesc}>{profile.changesSinceYesterday}</Text>
            </View>
          </View>
        )}

        {/* Dynamic Metric Grid */}
        <View style={styles.grid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{strings.painScoreLabel}</Text>
            <Text style={[styles.metricValue, profile.currentPainScore >= 6 ? styles.painHigh : styles.painNormal]}>
              {profile.currentPainScore} <Text style={styles.metricSub}>/ 10</Text>
            </Text>
            <Text style={styles.metricTrend}>Trend: {profile.currentPainScore >= 6 ? 'Worsening' : 'Manageable'}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{strings.sleepHoursLabel}</Text>
            <Text style={styles.metricValue}>
              {profile.currentSleepHours} <Text style={styles.metricSub}>hrs</Text>
            </Text>
            <Text style={styles.metricTrend}>Target: 7-8 hrs</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{strings.medicationAdherenceLabel}</Text>
            <Text style={styles.metricValue}>{profile.medicationAdherenceRate}%</Text>
            <Text style={styles.metricTrend}>Prescribed Regimen</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{strings.mobilityStatusLabel}</Text>
            <Text style={[styles.metricValue, { fontSize: 13, textTransform: 'capitalize' }]}>
              {profile.mobilityLevel.replace('_', ' ')}
            </Text>
            <Text style={styles.metricTrend}>Walker Assisted</Text>
          </View>
        </View>

        {/* 10-Min Continuous Monitoring Toggle Card */}
        <View style={styles.monitorCard}>
          <View style={styles.monitorHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.monitorTitle}>⏱️ 10-Minute Continuous Recovery Monitor</Text>
              <Text style={styles.monitorSubtitle}>
                {isMonitoringActive ? 'Active: Evaluating deltas every ~10 mins locally' : 'Paused: Tap to start active monitoring'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, isMonitoringActive ? styles.toggleBtnActive : styles.toggleBtnInactive]}
              onPress={handleToggle10MinMonitoring}
            >
              <Text style={styles.toggleBtnText}>{isMonitoringActive ? 'Active 🟢' : 'Start ⚡'}</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions for Hourly / Daily Summaries */}
          <View style={styles.quickActionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleGenerateHourlyUpdate}>
              <Text style={styles.actionBtnText}>📊 Hourly Update</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleGenerateDailySummary}>
              <Text style={styles.actionBtnText}>🌙 End-of-Day Summary</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Multilingual Natural Symptom Check-In Form */}
        <View style={styles.formCard}>
          <Text style={styles.formHeading}>✍️ Recovery Check-In (Natural Language Supported)</Text>
          <Text style={styles.formSubtitle}>
            Type or speak in English, Telugu, Hindi, Kannada, or mixed language (e.g. "నొప్పి ఎక్కువ", "दर्द बढ़ गया", "Pain 7").
          </Text>

          <TextInput
            style={styles.inputBox}
            placeholder={
              language === 'te'
                ? 'ఉదా: నాకు ఈరోజు నొప్పి నిన్నటికంటే ఎక్కువగా ఉంది...'
                : language === 'hi'
                ? 'उदा: आज दर्द कल से ज्यादा है और नींद 5 घंटे आई...'
                : language === 'kn'
                ? 'ಉದಾ: ಇಂದು ನೋವು ನಿನ್ನೆಗಿಂತ ಹೆಚ್ಚಾಗಿದೆ...'
                : 'e.g. My pain is higher than yesterday and I slept only 5 hours...'
            }
            placeholderTextColor="#94a3b8"
            value={naturalInputText}
            onChangeText={setNaturalInputText}
            multiline
          />

          {/* Interactive Pain Slider Buttons */}
          <Text style={styles.subLabel}>Direct Pain Score: {painScore}/10</Text>
          <View style={styles.sliderRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.numBtn, painScore === n && styles.activeNumBtn]}
                onPress={() => setPainScore(n)}
              >
                <Text style={[styles.numBtnText, painScore === n && styles.activeNumBtnText]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Medication Selector */}
          <View style={styles.selectorRow}>
            <TouchableOpacity
              style={[styles.choiceBtn, medAdherence === 'FULL' && styles.activeChoiceBtn]}
              onPress={() => setMedAdherence('FULL')}
            >
              <Text style={[styles.choiceBtnText, medAdherence === 'FULL' && styles.activeChoiceText]}>✓ Meds Taken</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.choiceBtn, medAdherence === 'MISSED' && styles.activeChoiceBtnRed]}
              onPress={() => setMedAdherence('MISSED')}
            >
              <Text style={[styles.choiceBtnText, medAdherence === 'MISSED' && styles.activeChoiceText]}>✕ Missed Dose</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitSymptom}>
            <Text style={styles.submitBtnText}>Submit Recovery Check-In (Local AI)</Text>
          </TouchableOpacity>
        </View>

        {/* Visual Recovery Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineHeading}>📜 Recovery Timeline & Milestones</Text>
          {timeline.length === 0 ? (
            <Text style={styles.noTimelineText}>No timeline entries recorded yet.</Text>
          ) : (
            timeline.map((item, idx) => (
              <TouchableOpacity
                key={item.id || idx}
                style={[styles.timelineCard, item.isAlert && styles.timelineAlertCard, item.isMilestone && styles.timelineMilestoneCard]}
                onPress={() => setSelectedTimelineEntry(item)}
              >
                <View style={styles.timelineRow}>
                  <View style={styles.sourceBadge}>
                    <Text style={styles.sourceBadgeText}>{item.source}</Text>
                  </View>
                  <Text style={styles.timelineDay}>Day {item.dayNumber}</Text>
                </View>
                <Text style={styles.timelineTitle}>{item.title}</Text>
                <Text style={styles.timelineDesc} numberOfLines={2}>{item.description}</Text>
                {item.modelInterpretation && (
                  <Text style={styles.modelTag}>{item.modelInterpretation.substring(0, 70)}...</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* ======================================================== */}
      {/* TIMELINE ENTRY DETAIL MODAL */}
      {/* ======================================================== */}
      {selectedTimelineEntry && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedTimelineEntry(null)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedTimelineEntry(null)} style={styles.backBtnModal}>
                <Text style={styles.backBtnTextModal}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedTimelineEntry.title}</Text>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.detailMeta}>
                Day {selectedTimelineEntry.dayNumber} • Source: {selectedTimelineEntry.source} • {new Date(selectedTimelineEntry.timestamp).toLocaleString()}
              </Text>

              <Text style={styles.detailHeading}>Description:</Text>
              <Text style={styles.detailText}>{selectedTimelineEntry.description}</Text>

              {selectedTimelineEntry.originalUserInput && (
                <View style={styles.inputQuoteBox}>
                  <Text style={styles.quoteTitle}>Patient Spoken / Typed Input:</Text>
                  <Text style={styles.quoteText}>"{selectedTimelineEntry.originalUserInput}"</Text>
                </View>
              )}

              {selectedTimelineEntry.modelInterpretation && (
                <View style={styles.aiBox}>
                  <Text style={styles.aiBoxTitle}>🤖 Local Model Interpretation:</Text>
                  <Text style={styles.aiBoxText}>{selectedTimelineEntry.modelInterpretation}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* CLINICAL DOCTOR HANDOFF MODAL (Requirements 14 & 15) */}
      {/* ======================================================== */}
      <Modal visible={showHandoffModal} animationType="slide" onRequestClose={() => setShowHandoffModal(false)}>
        <SafeAreaView style={styles.handoffContainer}>
          <View style={styles.handoffHeader}>
            <TouchableOpacity onPress={() => setShowHandoffModal(false)} style={styles.backBtnModal}>
              <Text style={styles.backBtnTextModal}>← Back</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.handoffHeaderTitle}>Clinical Doctor Handoff</Text>
              <Text style={styles.handoffHeaderSubtitle}>
                Concise Dossier for Clinician Review (Demo Feature)
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.handoffScroll}>
            {/* Specialist Type Selector (12 Specialist Options) */}
            <Text style={styles.handoffSectionLabel}>SELECT CLINICIAN SPECIALTY:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specScrollRow}>
              {HANDOFF_SPECIALISTS.map(spec => (
                <TouchableOpacity
                  key={spec}
                  style={[styles.specChip, selectedSpecialist === spec && styles.activeSpecChip]}
                  onPress={() => {
                    setSelectedSpecialist(spec);
                    handlePrepareClinicalHandoff();
                  }}
                >
                  <Text style={[styles.specChipText, selectedSpecialist === spec && styles.activeSpecChipText]}>
                    {spec}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Case & Recovery Overview Cards */}
            <View style={styles.handoffCard}>
              <Text style={styles.handoffCardTitle}>👤 Patient & Recovery Profile</Text>
              <View style={styles.handoffRow}>
                <Text style={styles.handoffKey}>Patient:</Text>
                <Text style={styles.handoffVal}>{profile.patientName}</Text>
              </View>
              <View style={styles.handoffRow}>
                <Text style={styles.handoffKey}>Recovery Day:</Text>
                <Text style={styles.handoffValHighlight}>Day {profile.currentDay} of {profile.targetDurationDays}</Text>
              </View>
              <View style={styles.handoffRow}>
                <Text style={styles.handoffKey}>Condition:</Text>
                <Text style={styles.handoffVal}>{profile.condition}</Text>
              </View>
              <View style={styles.handoffRow}>
                <Text style={styles.handoffKey}>Procedure:</Text>
                <Text style={styles.handoffVal}>{profile.surgeryOrProcedure}</Text>
              </View>
              <View style={styles.handoffRow}>
                <Text style={styles.handoffKey}>Attending Doctor:</Text>
                <Text style={styles.handoffVal}>{profile.doctorName} ({profile.hospitalName})</Text>
              </View>
            </View>

            {/* Today's Symptoms & Recovery Deltas */}
            <View style={styles.handoffCard}>
              <Text style={styles.handoffCardTitle}>📈 Symptoms & Recent Recovery Changes</Text>
              <View style={styles.handoffRow}>
                <Text style={styles.handoffKey}>Today's Pain Score:</Text>
                <Text style={[styles.handoffVal, { color: profile.currentPainScore >= 6 ? '#DC2626' : '#16A34A', fontWeight: '700' }]}>
                  {profile.currentPainScore} / 10
                </Text>
              </View>
              <View style={styles.handoffRow}>
                <Text style={styles.handoffKey}>Sleep Hours:</Text>
                <Text style={styles.handoffVal}>{profile.currentSleepHours} hours</Text>
              </View>
              <View style={styles.handoffRow}>
                <Text style={styles.handoffKey}>Mobility Status:</Text>
                <Text style={styles.handoffVal}>{profile.mobilityLevel.replace('_', ' ')}</Text>
              </View>
              <View style={styles.handoffRow}>
                <Text style={styles.handoffKey}>Medication Adherence:</Text>
                <Text style={styles.handoffVal}>{profile.medicationAdherenceRate}%</Text>
              </View>
              <View style={styles.handoffRow}>
                <Text style={styles.handoffKey}>Trend vs Yesterday:</Text>
                <Text style={styles.handoffVal}>{profile.changesSinceYesterday}</Text>
              </View>
            </View>

            {/* Doctor Instructions & Relevant Documents */}
            <View style={styles.handoffCard}>
              <Text style={styles.handoffCardTitle}>📋 Doctor Advice & Relevant Documents</Text>
              <Text style={styles.handoffSubHeading}>Instructions from Case:</Text>
              {(activeCase?.doctorInstructions || ['Follow postoperative mobility protocol']).map((inst, i) => (
                <Text key={i} style={styles.bulletItem}>• {inst}</Text>
              ))}

              <Text style={[styles.handoffSubHeading, { marginTop: 10 }]}>Linked Case Documents:</Text>
              <Text style={styles.docCountText}>
                📁 {activeCase?.documentIds?.length || 0} document(s) preserved in local vault
              </Text>
            </View>

            {/* Generated Clinical Dossier */}
            <View style={styles.handoffCard}>
              <Text style={styles.handoffCardTitle}>📄 Generated Clinical Dossier</Text>
              <Text style={styles.handoffSubDesc}>
                Structured summary strictly based on confirmed case records. Clearly marked with provenance.
              </Text>
              <View style={styles.dossierTextBox}>
                <Text style={styles.dossierText}>{handoffSummaryText}</Text>
              </View>
            </View>

            {/* Share / Export Action */}
            <TouchableOpacity style={styles.exportDossierBtn} onPress={handleShareHandoff}>
              <Text style={styles.exportDossierBtnText}>📤 Export / Share Dossier with Clinician</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  topHeaderCenter: { flex: 1, marginLeft: 8 },
  topHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  topHeaderSubtitle: { fontSize: 12, color: '#64748B', marginTop: 1 },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backBtnText: { color: '#0284C7', fontSize: 13, fontWeight: '700' },
  handoffTriggerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#0284C7',
    borderRadius: 8,
  },
  handoffTriggerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerCard: {
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  conditionText: { fontSize: 13, color: '#0284C7', marginTop: 3, fontWeight: '600' },
  doctorText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  dayBadge: {
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  dayBadgeNumber: { fontSize: 14, fontWeight: '800', color: '#0284C7' },
  dayBadgeSub: { fontSize: 10, color: '#64748B' },
  langBar: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  langLabel: { color: '#64748B', fontSize: 11, marginRight: 8 },
  langPill: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginRight: 6 },
  activeLangPill: { backgroundColor: '#0284C7' },
  langPillText: { color: '#64748B', fontSize: 11, fontWeight: '600' },
  activeLangPillText: { color: '#FFFFFF', fontWeight: '700' },
  alertBanner: { borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  alertWarning: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
  alertCritical: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  alertIcon: { fontSize: 22, marginRight: 10 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 12, fontWeight: '800', color: '#991B1B' },
  alertDesc: { fontSize: 11, color: '#7F1D1D', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  metricLabel: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  metricValue: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginVertical: 4 },
  metricSub: { fontSize: 11, color: '#94A3B8', fontWeight: '400' },
  metricTrend: { fontSize: 10, color: '#0284C7', fontWeight: '600' },
  painNormal: { color: '#16A34A' },
  painHigh: { color: '#DC2626' },
  monitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monitorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monitorTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  monitorSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#DCFCE7' },
  toggleBtnInactive: { backgroundColor: '#E2E8F0' },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  quickActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtn: { flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginHorizontal: 3, borderWidth: 1, borderColor: '#CBD5E1' },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formHeading: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  formSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 10 },
  inputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    fontSize: 13,
    color: '#0F172A',
    minHeight: 65,
    textAlignVertical: 'top',
  },
  subLabel: { fontSize: 11, fontWeight: '600', color: '#475569', marginTop: 10, marginBottom: 6 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  numBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  activeNumBtn: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  numBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  activeNumBtnText: { color: '#FFFFFF' },
  selectorRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  choiceBtn: { flex: 1, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center', marginHorizontal: 3, borderWidth: 1, borderColor: '#CBD5E1' },
  activeChoiceBtn: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  activeChoiceBtnRed: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  choiceBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  activeChoiceText: { color: '#0F172A' },
  submitBtn: { backgroundColor: '#0284C7', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  timelineSection: { marginTop: 4 },
  timelineHeading: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  noTimelineText: { color: '#94A3B8', fontSize: 12, fontStyle: 'italic' },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineAlertCard: { borderLeftWidth: 4, borderLeftColor: '#DC2626' },
  timelineMilestoneCard: { borderLeftWidth: 4, borderLeftColor: '#0284C7' },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sourceBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sourceBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  timelineDay: { fontSize: 11, fontWeight: '700', color: '#0284C7' },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  timelineDesc: { fontSize: 12, color: '#475569', marginTop: 2 },
  modelTag: { fontSize: 10, color: '#64748B', fontStyle: 'italic', marginTop: 4 },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtnModal: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 10,
  },
  backBtnTextModal: { color: '#0284C7', fontSize: 13, fontWeight: '700' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1 },
  modalBody: { padding: 16 },
  detailMeta: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  detailHeading: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  detailText: { fontSize: 13, color: '#334155', lineHeight: 18, marginBottom: 14 },
  inputQuoteBox: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 10, marginBottom: 14 },
  quoteTitle: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 2 },
  quoteText: { fontSize: 12, fontStyle: 'italic', color: '#0F172A' },
  aiBox: { backgroundColor: '#F0F9FF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BAE6FD' },
  aiBoxTitle: { fontSize: 11, fontWeight: '700', color: '#0369A1', marginBottom: 2 },
  aiBoxText: { fontSize: 12, color: '#0C4A6E', lineHeight: 17 },

  // Clinical Handoff Styles
  handoffContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  handoffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  handoffHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  handoffHeaderSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  handoffScroll: { padding: 16, paddingBottom: 40 },
  handoffSectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  specScrollRow: { flexDirection: 'row', marginBottom: 16 },
  specChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeSpecChip: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  specChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  activeSpecChipText: { color: '#FFFFFF', fontWeight: '700' },
  handoffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  handoffCardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  handoffRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  handoffKey: { fontSize: 12, color: '#64748B', flex: 1 },
  handoffVal: { fontSize: 12, color: '#0F172A', fontWeight: '600', flex: 1.5, textAlign: 'right' },
  handoffValHighlight: { fontSize: 12, color: '#0284C7', fontWeight: '700', flex: 1.5, textAlign: 'right' },
  handoffSubHeading: { fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 6, marginBottom: 4 },
  bulletItem: { fontSize: 12, color: '#475569', lineHeight: 18, marginLeft: 6 },
  docCountText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  handoffSubDesc: { fontSize: 11, color: '#64748B', marginBottom: 10 },
  dossierTextBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 220,
  },
  dossierText: { fontSize: 11, color: '#334155', fontFamily: 'monospace', lineHeight: 16 },
  exportDossierBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  exportDossierBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
