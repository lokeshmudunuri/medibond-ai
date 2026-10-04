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
} from 'react-native';
import { useHealthStore } from '../store/useHealthStore';
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
import { EmergencySafetyEngine } from '../safety/EmergencySafetyEngine';

export const RecoveryScreen: React.FC<{ navigation?: any }> = () => {
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

    // Multilingual parsing for natural language input
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

  const strings = MultilingualService.getStrings(language);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Profile */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.patientName}>{profile.patientName}</Text>
              <Text style={styles.conditionText}>🩺 {profile.condition} ({profile.surgeryOrProcedure})</Text>
              <Text style={styles.doctorText}>👨‍⚕️ {profile.doctorName} • {profile.hospitalName}</Text>
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
            <View>
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

      {/* Timeline Entry Detail Modal */}
      {selectedTimelineEntry && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedTimelineEntry(null)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTimelineEntry.title}</Text>
              <TouchableOpacity onPress={() => setSelectedTimelineEntry(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, marginBottom: 14 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  conditionText: { fontSize: 13, color: '#38bdf8', marginTop: 3, fontWeight: '600' },
  doctorText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  dayBadge: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#38bdf8' },
  dayBadgeNumber: { fontSize: 14, fontWeight: '800', color: '#38bdf8' },
  dayBadgeSub: { fontSize: 10, color: '#94a3b8' },
  langBar: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
  langLabel: { color: '#94a3b8', fontSize: 11, marginRight: 8 },
  langPill: { backgroundColor: '#1e293b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 6 },
  activeLangPill: { backgroundColor: '#0284c7' },
  langPillText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  activeLangPillText: { color: '#ffffff' },
  alertBanner: { borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  alertWarning: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' },
  alertCritical: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  alertIcon: { fontSize: 22, marginRight: 10 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 12, fontWeight: '800', color: '#991b1b' },
  alertDesc: { fontSize: 11, color: '#7f1d1d', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  metricCard: { width: '48%', backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  metricLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  metricValue: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginVertical: 4 },
  metricSub: { fontSize: 11, color: '#94a3b8', fontWeight: '400' },
  metricTrend: { fontSize: 10, color: '#0284c7', fontWeight: '600' },
  painNormal: { color: '#16a34a' },
  painHigh: { color: '#dc2626' },
  monitorCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  monitorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monitorTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  monitorSubtitle: { fontSize: 11, color: '#64748b', marginTop: 2 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#dcfce7' },
  toggleBtnInactive: { backgroundColor: '#e2e8f0' },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  quickActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionBtn: { flex: 1, backgroundColor: '#f8fafc', paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginHorizontal: 3, borderWidth: 1, borderColor: '#cbd5e1' },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  formCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  formHeading: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  formSubtitle: { fontSize: 11, color: '#64748b', marginTop: 2, marginBottom: 10 },
  inputBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#cbd5e1', fontSize: 13, color: '#0f172a', minHeight: 65, textAlignVertical: 'top' },
  subLabel: { fontSize: 11, fontWeight: '600', color: '#475569', marginTop: 10, marginBottom: 6 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  numBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  activeNumBtn: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  numBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  activeNumBtnText: { color: '#ffffff' },
  selectorRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  choiceBtn: { flex: 1, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center', marginHorizontal: 3, borderWidth: 1, borderColor: '#cbd5e1' },
  activeChoiceBtn: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  activeChoiceBtnRed: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  choiceBtnText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  activeChoiceText: { color: '#0f172a' },
  submitBtn: { backgroundColor: '#0284c7', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  timelineSection: { marginTop: 4 },
  timelineHeading: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  noTimelineText: { color: '#94a3b8', fontSize: 12, fontStyle: 'italic' },
  timelineCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  timelineAlertCard: { borderLeftWidth: 4, borderLeftColor: '#dc2626' },
  timelineMilestoneCard: { borderLeftWidth: 4, borderLeftColor: '#0284c7' },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sourceBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sourceBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  timelineDay: { fontSize: 11, fontWeight: '700', color: '#0284c7' },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  timelineDesc: { fontSize: 12, color: '#475569', marginTop: 2 },
  modelTag: { fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 4 },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { backgroundColor: '#0f172a', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', flex: 1 },
  closeBtn: { padding: 6 },
  closeBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 16 },
  detailMeta: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  detailHeading: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  detailText: { fontSize: 13, color: '#334155', lineHeight: 18, marginBottom: 14 },
  inputQuoteBox: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 10, marginBottom: 14 },
  quoteTitle: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 2 },
  quoteText: { fontSize: 12, fontStyle: 'italic', color: '#0f172a' },
  aiBox: { backgroundColor: '#f0f9ff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#bae6fd' },
  aiBoxTitle: { fontSize: 11, fontWeight: '700', color: '#0369a1', marginBottom: 2 },
  aiBoxText: { fontSize: 12, color: '#0c4a6e', lineHeight: 17 },
});
