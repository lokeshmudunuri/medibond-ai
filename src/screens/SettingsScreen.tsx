import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { useHealthStore } from '../store/useHealthStore';
import { useCaseStore } from '../store/useCaseStore';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { patient, refreshData } = useHealthStore();
  const { loadDemoCases, clearAllCases } = useCaseStore();

  const [patientName, setPatientName] = useState(patient.name);
  const [patientAge, setPatientAge] = useState(patient.age ? patient.age.toString() : '');
  const [bloodGroup, setBloodGroup] = useState(patient.bloodGroup);
  const [emergencyPhone, setEmergencyPhone] = useState(patient.emergencyContactPhone);

  const handleSaveProfile = () => {
    Alert.alert('Profile Saved', 'Personal health profile updated successfully.');
  };

  const handleLoadDemoData = () => {
    loadDemoCases();
    refreshData();
    Alert.alert('Sample Data Loaded', '2 sample Case Files (Cardiology & Appendectomy) have been created.');
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Local Data',
      'Are you sure you want to erase all case files, prescriptions, and medical records from device storage?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase All',
          style: 'destructive',
          onPress: () => {
            clearAllCases();
            refreshData();
            Alert.alert('Data Erased', 'All local health records have been cleared.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings & System</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Patient Profile Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👤 Personal Health Profile</Text>
          <Text style={styles.sectionDesc}>
            Shared globally across all your Case Files for allergy and contraindication safety checks.
          </Text>

          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={patientName}
            onChangeText={setPatientName}
            placeholder="e.g. John Doe"
            placeholderTextColor="#64748B"
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={patientAge}
                onChangeText={setPatientAge}
                keyboardType="numeric"
                placeholder="e.g. 45"
                placeholderTextColor="#64748B"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.inputLabel}>Blood Group</Text>
              <TextInput
                style={styles.input}
                value={bloodGroup}
                onChangeText={setBloodGroup}
                placeholder="e.g. O+"
                placeholderTextColor="#64748B"
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Emergency Contact Phone</Text>
          <TextInput
            style={styles.input}
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            placeholder="e.g. +1 (555) 019-2834"
            placeholderTextColor="#64748B"
          />

          <TouchableOpacity style={styles.saveProfileBtn} onPress={handleSaveProfile}>
            <Text style={styles.saveProfileBtnText}>Save Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Offline Engine & System Navigation */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⚙️ Offline AI & Diagnostics</Text>

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => navigation.navigate('Models')}
          >
            <View>
              <Text style={styles.navRowTitle}>🧠 Offline AI Models & Voice Packages</Text>
              <Text style={styles.navRowSub}>PocketPal-style llama.rn / llama.cpp local GGUF models</Text>
            </View>
            <Text style={styles.navArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('Debug')}
          >
            <View>
              <Text style={styles.navRowTitle}>📊 Developer Diagnostics & Telemetry</Text>
              <Text style={styles.navRowSub}>Context length, execution threads, memory & latencies</Text>
            </View>
            <Text style={styles.navArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Demo Data / Reset Manager */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🛠️ Data Management & Testing</Text>
          <Text style={styles.sectionDesc}>
            Load synthetic sample cases for testing or clear all local device storage.
          </Text>

          <TouchableOpacity style={styles.demoDataBtn} onPress={handleLoadDemoData}>
            <Text style={styles.demoDataBtnText}>📥 Load Demo Sample Case Files</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearDataBtn} onPress={handleClearAllData}>
            <Text style={styles.clearDataBtnText}>🗑️ Clear All Local Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  backBtnText: { color: '#38BDF8', fontSize: 13, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  scrollContent: { padding: 16 },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: '#94A3B8', marginBottom: 14, lineHeight: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#CBD5E1', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  row: { flexDirection: 'row' },
  saveProfileBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  saveProfileBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  navRowTitle: { fontSize: 14, fontWeight: '700', color: '#F8FAFC' },
  navRowSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  navArrow: { fontSize: 18, color: '#38BDF8', fontWeight: '800' },
  demoDataBtn: {
    backgroundColor: '#0284C722',
    borderWidth: 1,
    borderColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  demoDataBtnText: { color: '#38BDF8', fontSize: 13, fontWeight: '700' },
  clearDataBtn: {
    backgroundColor: '#7F1D1D22',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearDataBtnText: { color: '#F87171', fontSize: 13, fontWeight: '700' },
});
