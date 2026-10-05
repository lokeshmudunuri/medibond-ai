import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useVoiceStore } from '../store/useVoiceStore';
import { VoiceLanguage, VoiceState } from '../types/voice';
import { HealthMemoryService } from '../services/HealthMemoryService';
import { CaseFile } from '../types';

const SUPPORTED_LANGUAGES: { code: VoiceLanguage; label: string; subLabel: string }[] = [
  { code: 'en', label: 'English', subLabel: 'en-IN' },
  { code: 'te', label: 'తెలుగు (Telugu)', subLabel: 'te-IN' },
  { code: 'hi', label: 'हिंदी (Hindi)', subLabel: 'hi-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', subLabel: 'kn-IN' },
];

export const VoiceScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const {
    state,
    activeLanguage,
    activeCaseId,
    audioLevel,
    conversation,
    statusMessage,
    pendingCheckIn,
    pendingDoctorInstruction,
    setLanguage,
    setActiveCaseId,
    startListening,
    stop,
    interrupt,
    confirmCheckIn,
    confirmDoctorInstruction,
    discardPendingExtraction,
    clearConversation,
  } = useVoiceStore();

  const memory = HealthMemoryService.getInstance();
  const [cases, setCases] = useState<CaseFile[]>([]);

  useEffect(() => {
    setCases(memory.getCases());
  }, []);

  const quickPrompts: Record<VoiceLanguage, string[]> = {
    en: [
      'I slept four hours and my pain is seven today.',
      'Do not put weight on the leg for two weeks and return in 10 days.',
      'What is my morning blood pressure medicine for?',
      'Can I eat biryani with my diabetes condition?',
      'I have crushing chest pain radiating to my arm.',
    ],
    te: [
      'నాకు నొప్పి ఏడు ఉంది మరియు నిన్నటి కంటే ఎక్కువ.',
      'డాక్టర్ రెండు వారాలు బరువు వేయవద్దని చెప్పారు.',
      'నా మందులు ఏమిటి?',
    ],
    hi: [
      'आज मेरा दर्द सात है और मैं चार घंटे सोया।',
      'डॉक्टर ने दो हफ्ते पैर पर वजन न डालने को कहा है।',
      'मेरी सुबह की दवाई क्या है?',
    ],
    kn: [
      'ಇಂದು ನನ್ನ ನೋವು ಏಳು ಇದೆ ಮತ್ತು ನಾಲ್ಕು ಗಂಟೆ ನಿದ್ರೆ ಮಾಡಿದೆ.',
      'ವೈದ್ಯರು ಎರಡು ವಾರಗಳ ಕಾಲ ತೂಕ ಹಾಕಬೇಡಿ ಎಂದು ಹೇಳಿದರು.',
    ],
  };

  const handleMicPress = () => {
    if (state === VoiceState.SPEAKING) {
      interrupt();
    } else if (state === VoiceState.LISTENING) {
      stop();
    } else {
      startListening();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    startListening(prompt);
  };

  const isMicActive = state === VoiceState.LISTENING;
  const isSpeaking = state === VoiceState.SPEAKING;
  const isProcessing =
    state === VoiceState.TRANSCRIBING ||
    state === VoiceState.UNDERSTANDING ||
    state === VoiceState.RETRIEVING_CONTEXT ||
    state === VoiceState.VALIDATING ||
    state === VoiceState.THINKING;

  const currentPrompts = quickPrompts[activeLanguage] || quickPrompts.en;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (navigation ? navigation.goBack() : null)}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Voice Agent</Text>
            <Text style={styles.subtitle}>100% Offline On-Device Medical AI</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={clearConversation}>
          <Text style={styles.clearButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* 4-Language Selector Chips */}
      <View style={styles.languageContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageScroll}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.languageBadge, activeLanguage === lang.code && styles.activeLanguageBadge]}
              onPress={() => setLanguage(lang.code)}
            >
              <Text style={[styles.languageText, activeLanguage === lang.code && styles.activeLanguageText]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Scoped Patient Case File Selector */}
      <View style={styles.caseScopeContainer}>
        <Text style={styles.caseScopeLabel}>ACTIVE CASE:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.caseScrollRow}>
          <TouchableOpacity
            style={[styles.caseChip, activeCaseId === undefined && styles.caseChipActive]}
            onPress={() => setActiveCaseId(undefined)}
          >
            <Text style={[styles.caseChipText, activeCaseId === undefined && styles.caseChipTextActive]}>
              🌐 Global Health Vault
            </Text>
          </TouchableOpacity>
          {cases.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.caseChip, activeCaseId === c.id && styles.caseChipActive]}
              onPress={() => setActiveCaseId(c.id)}
            >
              <Text style={[styles.caseChipText, activeCaseId === c.id && styles.caseChipTextActive]}>
                📁 {c.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Structured Extraction Confirmation Overlays */}
      {pendingCheckIn && (
        <View style={styles.extractionCard}>
          <View style={styles.extractionHeader}>
            <Text style={styles.extractionTitle}>📊 Spoken Recovery Check-In Detected</Text>
            <TouchableOpacity onPress={discardPendingExtraction}>
              <Text style={styles.discardText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.extractionBody}>
            <Text style={styles.extractionMetric}>• Pain Score: {pendingCheckIn.painScore}/10</Text>
            <Text style={styles.extractionMetric}>• Sleep: {pendingCheckIn.sleepHours} Hours</Text>
            <Text style={styles.extractionMetric}>
              • Medications: {pendingCheckIn.tookAllMedications ? 'Took all on schedule' : 'Missed doses reported'}
            </Text>
          </View>
          <View style={styles.extractionButtonRow}>
            <TouchableOpacity style={styles.confirmExtractionBtn} onPress={confirmCheckIn}>
              <Text style={styles.confirmExtractionBtnText}>✓ Save Check-In to Memory</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {pendingDoctorInstruction && (
        <View style={styles.extractionCard}>
          <View style={styles.extractionHeader}>
            <Text style={styles.extractionTitle}>🩺 Doctor Verbal Instructions Captured</Text>
            <TouchableOpacity onPress={discardPendingExtraction}>
              <Text style={styles.discardText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.extractionBody}>
            <Text style={styles.extractionMetric}>• Restriction: {pendingDoctorInstruction.restriction}</Text>
            <Text style={styles.extractionMetric}>• Duration: {pendingDoctorInstruction.duration}</Text>
            <Text style={styles.extractionMetric}>• Follow-up Timeline: {pendingDoctorInstruction.followUpDays} days</Text>
          </View>
          <View style={styles.extractionButtonRow}>
            <TouchableOpacity
              style={styles.confirmExtractionBtn}
              onPress={() => confirmDoctorInstruction(activeCaseId)}
            >
              <Text style={styles.confirmExtractionBtnText}>✓ Save to Active Case</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Conversation Area */}
      <ScrollView style={styles.conversationArea} contentContainerStyle={styles.conversationContent}>
        {conversation.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.offlinePill}>
              <Text style={styles.offlinePillText}>🔒 100% Offline Multi-Language Speech Engine</Text>
            </View>
            <Text style={styles.emptyPromptTitle}>"Speak naturally in English, Telugu, Hindi, or Kannada"</Text>
            <Text style={styles.emptyPromptDesc}>
              Tap the microphone to log check-ins, record doctor verbal orders, or ask medical case questions.
            </Text>

            <View style={styles.quickPromptSection}>
              <Text style={styles.quickPromptHeader}>Quick Spoken Interactions ({activeLanguage.toUpperCase()}):</Text>
              {currentPrompts.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickPromptCard}
                  onPress={() => handleQuickPrompt(p)}
                >
                  <Text style={styles.quickPromptText}>🗣️ "{p}"</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          conversation.map((turn) => (
            <View
              key={turn.id}
              style={[
                styles.messageBubble,
                turn.speaker === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text style={styles.speakerLabel}>
                {turn.speaker === 'user' ? '👤 Patient' : '🤖 CareBond AI (Local)'}
              </Text>
              <Text style={styles.messageText}>{turn.transcript}</Text>
              {turn.retrievedContextSummary && (
                <View style={styles.contextSummaryBadge}>
                  <Text style={styles.contextSummaryText}>✓ Grounded in Case Health Memory</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Status Bar */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusDot,
            isSpeaking && styles.statusDotSpeaking,
            isMicActive && styles.statusDotActive,
          ]}
        />
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>

      {/* Central Microphone / Animated Orb */}
      <View style={styles.controllerArea}>
        <View
          style={[
            styles.micRingOuter,
            isMicActive && { transform: [{ scale: 1 + Math.min(0.5, audioLevel * 0.6) }] },
            isSpeaking && styles.micRingSpeaking,
            isProcessing && styles.micRingProcessing,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.micButton,
              isMicActive && styles.micButtonActive,
              isSpeaking && styles.micButtonSpeaking,
            ]}
            onPress={handleMicPress}
            activeOpacity={0.8}
          >
            <Text style={styles.micIcon}>
              {isSpeaking ? '⏹️' : isMicActive ? '🎙️' : '🎙️'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.micInstruction}>
          {isSpeaking
            ? 'Tap to Interrupt CareBond Audio'
            : isMicActive
            ? 'Listening... Tap to Complete'
            : 'Tap Microphone to Speak'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  backBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 10,
  },
  backBtnText: { color: '#38BDF8', fontSize: 13, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  subtitle: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  clearButtonText: { fontSize: 11, color: '#38BDF8', fontWeight: '700' },
  languageContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  languageScroll: { paddingHorizontal: 16, gap: 8 },
  languageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeLanguageBadge: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  languageText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  activeLanguageText: { color: '#FFFFFF', fontWeight: '700' },
  caseScopeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  caseScopeLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', marginRight: 8 },
  caseScrollRow: { flexDirection: 'row' },
  caseChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  caseChipActive: { backgroundColor: '#0369A1', borderColor: '#38BDF8' },
  caseChipText: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  caseChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  extractionCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  extractionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  extractionTitle: { color: '#34D399', fontSize: 12, fontWeight: '700' },
  discardText: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
  extractionBody: { marginTop: 6, gap: 2 },
  extractionMetric: { color: '#CBD5E1', fontSize: 11 },
  extractionButtonRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' },
  confirmExtractionBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  confirmExtractionBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  conversationArea: { flex: 1 },
  conversationContent: { padding: 16 },
  emptyState: { alignItems: 'center', paddingTop: 16 },
  offlinePill: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  offlinePillText: { color: '#34D399', fontSize: 11, fontWeight: '700' },
  emptyPromptTitle: { fontSize: 16, fontWeight: '700', color: '#F1F5F9', textAlign: 'center', marginBottom: 6 },
  emptyPromptDesc: { fontSize: 12, color: '#94A3B8', textAlign: 'center', maxWidth: 280, marginBottom: 16 },
  quickPromptSection: { width: '100%', marginTop: 4 },
  quickPromptHeader: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  quickPromptCard: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickPromptText: { color: '#E2E8F0', fontSize: 12, fontWeight: '500' },
  messageBubble: { padding: 12, borderRadius: 14, marginBottom: 10, maxWidth: '88%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#0369A1' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  speakerLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 2 },
  messageText: { fontSize: 14, color: '#F8FAFC', lineHeight: 20 },
  contextSummaryBadge: { marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#334155' },
  contextSummaryText: { fontSize: 10, color: '#38BDF8', fontWeight: '600' },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#1E293B55',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#64748B', marginRight: 8 },
  statusDotActive: { backgroundColor: '#EF4444' },
  statusDotSpeaking: { backgroundColor: '#10B981' },
  statusText: { fontSize: 11, color: '#CBD5E1', fontWeight: '600' },
  controllerArea: { alignItems: 'center', paddingBottom: 20, paddingTop: 8 },
  micRingOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38BDF844',
  },
  micRingSpeaking: { borderColor: '#10B981', backgroundColor: '#064E3B44' },
  micRingProcessing: { borderColor: '#F59E0B' },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  micButtonActive: { backgroundColor: '#DC2626' },
  micButtonSpeaking: { backgroundColor: '#059669' },
  micIcon: { fontSize: 26 },
  micInstruction: { fontSize: 11, color: '#94A3B8', marginTop: 8, fontWeight: '600' },
});
