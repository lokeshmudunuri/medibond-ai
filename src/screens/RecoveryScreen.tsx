import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useHealthStore } from '../store/useHealthStore';
import { ProvenanceSource } from '../types';

export const RecoveryScreen: React.FC<{ navigation?: any }> = () => {
  const { recoveryScore, recoveryPlan, checkIns, addCheckIn } = useHealthStore();

  const [painScore, setPainScore] = useState(2);
  const [fatigueScore, setFatigueScore] = useState(3);
  const [symptomInput, setSymptomInput] = useState('');
  const [tookMeds, setTookMeds] = useState(true);

  const handleSubmitCheckIn = () => {
    const timestamp = new Date().toISOString();
    addCheckIn({
      id: `chk_${Date.now()}`,
      checkInDate: timestamp,
      painScore,
      fatigueScore,
      moodScore: 4,
      sleepHours: 7.5,
      tookAllMedications: tookMeds,
      reportedSymptoms: symptomInput.trim() || 'Mild surgical site soreness, no fever.',
      patientSpokenTranscript: 'Feeling much better today, walking without major pain.',
      adaptiveFollowUpQuestion: 'Has surgical site swelling decreased compared to yesterday?',
      adaptiveFollowUpAnswer: 'Yes, noticeably reduced.',
      provenance: {
        source: ProvenanceSource.UserReported,
        confidence: 1.0,
        recordedAt: timestamp,
      },
    });

    setSymptomInput('');
    Alert.alert('Check-in Recorded', 'Your recovery score and baseline metrics have been updated.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Recovery Watch & Baselines</Text>
          <Text style={styles.headerSubtitle}>
            Post-operative EWMA baseline tracking & milestone progress
          </Text>
        </View>

        {/* Dynamic Recovery Index Card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Dynamic Recovery Index</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNumber}>
              {recoveryScore.overallIndex}
              <Text style={styles.scoreSub}> / 100</Text>
            </Text>
            <View style={styles.trajectoryBadge}>
              <Text style={styles.trajectoryText}>{recoveryScore.statusText}</Text>
            </View>
          </View>

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Pain Control</Text>
              <Text style={styles.gridValue}>{recoveryScore.painComponent}/30 pts</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Rest & Sleep</Text>
              <Text style={styles.gridValue}>{recoveryScore.sleepComponent}/25 pts</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Med Adherence</Text>
              <Text style={styles.gridValue}>
                {recoveryScore.medicationAdherenceComponent}/20 pts
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Mobility Index</Text>
              <Text style={styles.gridValue}>{recoveryScore.mobilityComponent}/25 pts</Text>
            </View>
          </View>
        </View>

        {/* Log Daily Recovery Check-in Card */}
        <View style={styles.checkInFormCard}>
          <Text style={styles.formTitle}>📝 Log Today's Recovery Check-in</Text>

          {/* Pain Score Selector */}
          <Text style={styles.inputLabel}>Pain Level (0 = None, 10 = Severe): {painScore}/10</Text>
          <View style={styles.scoreSelectorRow}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.scoreButton,
                  painScore === val && styles.scoreButtonActive,
                  val > 6 && styles.scoreButtonHigh,
                ]}
                onPress={() => setPainScore(val)}
              >
                <Text style={[styles.scoreButtonText, painScore === val && styles.scoreButtonTextActive]}>
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fatigue Selector */}
          <Text style={styles.inputLabel}>Fatigue / Energy Level: {fatigueScore}/10</Text>
          <View style={styles.scoreSelectorRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.scoreButton, fatigueScore === val && styles.scoreButtonActive]}
                onPress={() => setFatigueScore(val)}
              >
                <Text
                  style={[
                    styles.scoreButtonText,
                    fatigueScore === val && styles.scoreButtonTextActive,
                  ]}
                >
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Medication Compliance Toggle */}
          <TouchableOpacity
            style={styles.medComplianceRow}
            onPress={() => setTookMeds(!tookMeds)}
          >
            <View style={[styles.checkbox, tookMeds && styles.checkboxChecked]}>
              {tookMeds && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.medComplianceText}>Took all prescribed medications today</Text>
          </TouchableOpacity>

          {/* Symptoms Input */}
          <Text style={styles.inputLabel}>Any symptoms or wound sensations?</Text>
          <TextInput
            style={styles.symptomTextInput}
            value={symptomInput}
            onChangeText={setSymptomInput}
            placeholder="e.g. Mild surgical site tightness, no drainage"
            placeholderTextColor="#64748B"
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitCheckIn}>
            <Text style={styles.submitBtnText}>Submit Check-in</Text>
          </TouchableOpacity>
        </View>

        {/* Check-in History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Daily Check-ins</Text>
          {checkIns.map((chk) => (
            <View key={chk.id} style={styles.checkInCard}>
              <View style={styles.checkInRow}>
                <Text style={styles.checkInDate}>{chk.checkInDate.split('T')[0]}</Text>
                <Text style={styles.checkInScore}>
                  Pain: {chk.painScore}/10 • Fatigue: {chk.fatigueScore}/10
                </Text>
              </View>
              <Text style={styles.checkInSymptoms}>{chk.reportedSymptoms}</Text>
              {chk.adaptiveFollowUpQuestion && (
                <View style={styles.adaptiveBox}>
                  <Text style={styles.adaptiveQuestion}>
                    🤖 Adaptive Q: {chk.adaptiveFollowUpQuestion}
                  </Text>
                  <Text style={styles.adaptiveAnswer}>
                    ↳ Answer: {chk.adaptiveFollowUpAnswer}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  scoreCard: {
    backgroundColor: '#0284C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  scoreTitle: { color: '#BAE6FD', fontSize: 13, fontWeight: '600' },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  scoreNumber: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  scoreSub: { fontSize: 16, color: '#BAE6FD' },
  trajectoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trajectoryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 10,
    marginTop: 8,
  },
  gridItem: { width: '50%', marginVertical: 4 },
  gridLabel: { color: '#BAE6FD', fontSize: 11 },
  gridValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 2 },
  checkInFormCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: '#F8FAFC', marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#CBD5E1', marginBottom: 6 },
  scoreSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  scoreButton: {
    width: 26,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  scoreButtonActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  scoreButtonHigh: { borderColor: '#EF4444' },
  scoreButtonText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  scoreButtonTextActive: { color: '#FFFFFF' },
  medComplianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#10B981', borderColor: '#10B981' },
  checkmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  medComplianceText: { fontSize: 13, color: '#E2E8F0', fontWeight: '500' },
  symptomTextInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  submitBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC', marginBottom: 10 },
  checkInCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  checkInRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkInDate: { fontSize: 13, fontWeight: '700', color: '#F8FAFC' },
  checkInScore: { fontSize: 12, fontWeight: '600', color: '#38BDF8' },
  checkInSymptoms: { fontSize: 12, color: '#CBD5E1', marginTop: 4 },
  adaptiveBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  adaptiveQuestion: { fontSize: 11, color: '#38BDF8', fontWeight: '600' },
  adaptiveAnswer: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});
