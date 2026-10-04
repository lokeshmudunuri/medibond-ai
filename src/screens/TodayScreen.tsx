import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useHealthStore } from '../store/useHealthStore';

export const TodayScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { patient, recoveryScore, medicines, recoveryPlan, checkIns } = useHealthStore();

  const [takenMeds, setTakenMeds] = useState<Record<string, boolean>>({});

  const toggleMed = (id: string) => {
    setTakenMeds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeMeds = medicines.filter((m) => m.isActive);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Patient Welcome Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Hello, {patient.name.split(' ')[0]}</Text>
            <Text style={styles.subText}>Day 5 • Laparoscopic Appendectomy Recovery</Text>
          </View>
          <View style={styles.safetyPill}>
            <Text style={styles.safetyPillText}>🛡️ Baseline Stable</Text>
          </View>
        </View>

        {/* Dynamic Recovery Index Card */}
        <View style={styles.recoveryCard}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.scoreLabel}>Dynamic Recovery Index</Text>
              <Text style={styles.scoreStatus}>{recoveryScore.statusText}</Text>
            </View>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{recoveryScore.overallIndex}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>

          <View style={styles.metricBreakdown}>
            <Text style={styles.metricItem}>Pain: {recoveryScore.painComponent}/30</Text>
            <Text style={styles.metricItem}>Sleep: {recoveryScore.sleepComponent}/25</Text>
            <Text style={styles.metricItem}>Meds: {recoveryScore.medicationAdherenceComponent}/20</Text>
            <Text style={styles.metricItem}>Mobility: {recoveryScore.mobilityComponent}/25</Text>
          </View>
        </View>

        {/* Quick Voice Check-in Hero Button */}
        <TouchableOpacity
          style={styles.voiceHeroBtn}
          onPress={() => navigation.navigate('Voice')}
          activeOpacity={0.8}
        >
          <View style={styles.voiceHeroLeft}>
            <View style={styles.voiceHeroIconBg}>
              <Text style={styles.voiceHeroIcon}>🎙️</Text>
            </View>
            <View>
              <Text style={styles.voiceHeroTitle}>Start Spoken Check-in</Text>
              <Text style={styles.voiceHeroDesc}>Talk naturally with your offline voice companion</Text>
            </View>
          </View>
          <Text style={styles.voiceHeroArrow}>→</Text>
        </TouchableOpacity>

        {/* Real-time Physiological Vitals Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physiological Vitals</Text>
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalCard}>
              <Text style={styles.vitalLabel}>Heart Rate</Text>
              <Text style={styles.vitalValue}>72 <Text style={styles.vitalUnit}>bpm</Text></Text>
              <Text style={styles.vitalStatus}>Normal (60-100)</Text>
            </View>
            <View style={styles.vitalCard}>
              <Text style={styles.vitalLabel}>Blood Pressure</Text>
              <Text style={styles.vitalValue}>120/78</Text>
              <Text style={styles.vitalStatus}>Optimal</Text>
            </View>
            <View style={styles.vitalCard}>
              <Text style={styles.vitalLabel}>SpO2</Text>
              <Text style={styles.vitalValue}>99%</Text>
              <Text style={styles.vitalStatus}>Excellent</Text>
            </View>
            <View style={styles.vitalCard}>
              <Text style={styles.vitalLabel}>Body Temp</Text>
              <Text style={styles.vitalValue}>98.4°F</Text>
              <Text style={styles.vitalStatus}>Afebrile</Text>
            </View>
          </View>
        </View>

        {/* Active Medications Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Today's Scheduled Medications</Text>
            <Text style={styles.adherenceCount}>
              {Object.values(takenMeds).filter(Boolean).length}/{activeMeds.length} Taken
            </Text>
          </View>
          {activeMeds.map((med) => (
            <TouchableOpacity
              key={med.id}
              style={[styles.medCard, takenMeds[med.id] && styles.medCardTaken]}
              onPress={() => toggleMed(med.id)}
            >
              <View style={styles.medLeft}>
                <View style={[styles.checkbox, takenMeds[med.id] && styles.checkboxChecked]}>
                  {takenMeds[med.id] && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View>
                  <Text style={[styles.medName, takenMeds[med.id] && styles.medNameTaken]}>
                    {med.name}
                  </Text>
                  <Text style={styles.medDetails}>
                    {med.dosage} • {med.frequency} ({med.timing})
                  </Text>
                </View>
              </View>
              <Text style={styles.medTime}>{med.reminderTimes[0] || 'Scheduled'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active Recovery Protocol */}
        {recoveryPlan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Recovery Milestones</Text>
            <View style={styles.planCard}>
              <Text style={styles.planTitle}>{recoveryPlan.title}</Text>
              <Text style={styles.planPhase}>Phase: {recoveryPlan.currentPhase}</Text>
              {recoveryPlan.milestones.map((m, idx) => (
                <Text key={idx} style={[styles.milestone, m.isCompleted && styles.milestoneDone]}>
                  {m.isCompleted ? '✓' : '○'} {m.title}: {m.description}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: { fontSize: 22, fontWeight: '800', color: '#F8FAFC' },
  subText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  safetyPill: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  safetyPillText: { color: '#34D399', fontSize: 11, fontWeight: '700' },
  recoveryCard: {
    backgroundColor: '#0284C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel: { color: '#BAE6FD', fontSize: 13, fontWeight: '600' },
  scoreStatus: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  scoreCircle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  scoreMax: { color: '#BAE6FD', fontSize: 10 },
  metricBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  metricItem: { color: '#F0F9FF', fontSize: 11, fontWeight: '600' },
  voiceHeroBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  voiceHeroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  voiceHeroIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceHeroIcon: { fontSize: 20 },
  voiceHeroTitle: { fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  voiceHeroDesc: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  voiceHeroArrow: { fontSize: 18, color: '#38BDF8', fontWeight: '800' },
  section: { marginBottom: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  adherenceCount: { fontSize: 12, color: '#38BDF8', fontWeight: '600' },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  vitalCard: {
    backgroundColor: '#1E293B',
    width: '48%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  vitalLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  vitalValue: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginVertical: 4 },
  vitalUnit: { fontSize: 12, fontWeight: '500', color: '#94A3B8' },
  vitalStatus: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  medCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  medCardTaken: { borderColor: '#10B981', backgroundColor: '#064E3B22' },
  medLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  medName: { fontSize: 14, fontWeight: '700', color: '#F8FAFC' },
  medNameTaken: { textDecorationLine: 'line-through', color: '#94A3B8' },
  medDetails: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  medTime: { fontSize: 12, fontWeight: '700', color: '#38BDF8' },
  planCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 10,
  },
  planTitle: { fontSize: 14, fontWeight: '700', color: '#F8FAFC' },
  planPhase: { fontSize: 12, color: '#38BDF8', fontWeight: '600', marginVertical: 4 },
  milestone: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  milestoneDone: { color: '#10B981', fontWeight: '600' },
});
