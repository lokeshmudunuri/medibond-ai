import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useVoiceStore } from '../store/useVoiceStore';
import { VoiceLanguage, VoiceState } from '../types/voice';

const LANGUAGES: { code: VoiceLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
];

export const VoiceScreen: React.FC = () => {
  const {
    state,
    activeLanguage,
    audioLevel,
    conversation,
    statusMessage,
    setLanguage,
    startListening,
    stop,
    interrupt,
    clearConversation,
  } = useVoiceStore();

  const [selectedQuickPrompt, setSelectedQuickPrompt] = useState<string | null>(null);

  const quickPrompts = [
    'What is my morning medicine for?',
    'Explain my latest blood test report.',
    'I have been feeling more pain since yesterday.',
    'I took two extra tablets by mistake, what should I do?',
    'Write a python web server script for me.',
  ];

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
    setSelectedQuickPrompt(prompt);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>CareBond Voice</Text>
          <Text style={styles.subtitle}>100% Offline Medical Spoken Companion</Text>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={clearConversation}>
          <Text style={styles.clearButtonText}>New Session</Text>
        </TouchableOpacity>
      </View>

      {/* Language Selector */}
      <View style={styles.languageContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageScroll}>
          {LANGUAGES.map((lang) => (
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

      {/* Conversation Turns */}
      <ScrollView style={styles.conversationArea} contentContainerStyle={styles.conversationContent}>
        {conversation.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.offlinePill}>
              <Text style={styles.offlinePillText}>🔒 Fully On-Device & Private</Text>
            </View>
            <Text style={styles.emptyPromptTitle}>"Hi. How are you feeling today?"</Text>
            <Text style={styles.emptyPromptDesc}>
              Tap the microphone or choose a quick question below to speak with CareBond.
            </Text>

            <View style={styles.quickPromptSection}>
              <Text style={styles.quickPromptHeader}>Quick Spoken Topics:</Text>
              {quickPrompts.map((p, idx) => (
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
                {turn.speaker === 'user' ? '👤 Patient' : '🤖 CareBond AI'}
              </Text>
              <Text style={styles.messageText}>{turn.transcript}</Text>
              {turn.retrievedContextSummary && (
                <View style={styles.contextSummaryBadge}>
                  <Text style={styles.contextSummaryText}>✓ Grounded in Health Memory</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Status Bar */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, isSpeaking && styles.statusDotSpeaking, isMicActive && styles.statusDotActive]} />
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>

      {/* Central Microphone / Voice Orb Controller */}
      <View style={styles.controllerArea}>
        {/* Animated Waveform Ring */}
        <View
          style={[
            styles.micRingOuter,
            isMicActive && { transform: [{ scale: 1 + audioLevel * 0.4 }] },
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
            ? 'Tap to Interrupt CareBond'
            : isMicActive
            ? 'Listening... Tap to Complete'
            : 'Tap Microphone to Speak'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
  },
  languageContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  languageScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  languageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeLanguageBadge: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  languageText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  activeLanguageText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  conversationArea: {
    flex: 1,
  },
  conversationContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 24,
  },
  offlinePill: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  offlinePillText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyPromptDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 24,
  },
  quickPromptSection: {
    width: '100%',
    marginTop: 8,
  },
  quickPromptHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  quickPromptCard: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickPromptText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
  },
  messageBubble: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '88%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0369A1',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  speakerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#F8FAFC',
    lineHeight: 22,
  },
  contextSummaryBadge: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  contextSummaryText: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#1E293B55',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748B',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#EF4444',
  },
  statusDotSpeaking: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  controllerArea: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 12,
  },
  micRingOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38BDF844',
  },
  micRingSpeaking: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B44',
  },
  micRingProcessing: {
    borderColor: '#F59E0B',
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  micButtonActive: {
    backgroundColor: '#DC2626',
  },
  micButtonSpeaking: {
    backgroundColor: '#059669',
  },
  micIcon: {
    fontSize: 28,
  },
  micInstruction: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 10,
    fontWeight: '500',
  },
});
