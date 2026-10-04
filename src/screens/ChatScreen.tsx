import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useChatStore } from '../store/useChatStore';
import { useModelStore } from '../store/useModelStore';
import { useHealthStore } from '../store/useHealthStore';
import { useCaseStore } from '../store/useCaseStore';
import { ChatMessage } from '../types/chat';

export const ChatScreen: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const [inputText, setInputText] = useState('');
  const routeCaseId = route?.params?.caseId;

  const {
    messages,
    isGenerating,
    streamingContent,
    activeCaseId,
    setActiveCaseId,
    sendMessage,
    stopGeneration,
    clearHistory,
  } = useChatStore();

  const { activeMetadata, engineState } = useModelStore();
  const { cases } = useCaseStore();
  const { logCheckIn } = useHealthStore();

  const effectiveCaseId = routeCaseId || activeCaseId;
  const currentCase = cases.find((c) => c.id === effectiveCaseId);

  const handleSend = async () => {
    if (!inputText.trim() || isGenerating) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text, effectiveCaseId);
  };

  const handleActionChip = (msg: ChatMessage) => {
    if (msg.suggestedActionType === 'log_checkin') {
      let pain = 2;
      let sleep = 8.0;
      if (msg.suggestedActionPayload) {
        const parts = msg.suggestedActionPayload.split('&');
        for (const p of parts) {
          const [k, v] = p.split('=');
          if (k === 'pain') pain = parseInt(v, 10);
          if (k === 'sleep') sleep = parseFloat(v);
        }
      }

      logCheckIn({
        id: `chk_${Date.now()}`,
        checkInDate: new Date().toISOString(),
        painScore: pain,
        fatigueScore: 2,
        moodScore: 4,
        sleepHours: sleep,
        tookAllMedications: true,
        reportedSymptoms: 'Reported via Local AI Companion Chat',
        provenance: {
          source: 'USER' as any,
          confidence: 1.0,
          recordedAt: new Date().toISOString(),
        },
      });
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
          <View style={styles.bubbleFooter}>
            {item.modelName && !isUser ? (
              <Text style={styles.modelTag}>{item.modelName}</Text>
            ) : null}
            <Text style={[styles.timestamp, isUser ? styles.userTime : styles.assistantTime]}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {item.suggestedActionType === 'log_checkin' && (
            <TouchableOpacity style={styles.actionChip} onPress={() => handleActionChip(item)}>
              <Text style={styles.actionChipText}>
                ✓ Confirm & Log Check-in ({item.suggestedActionPayload})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const modelBadgeColor =
    engineState === 'ready'
      ? '#10B981'
      : engineState === 'generating'
      ? '#3B82F6'
      : '#F59E0B';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Engine Banner */}
      <View style={styles.headerBanner}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => navigation?.navigate?.('Models')}
        >
          <View style={[styles.statusDot, { backgroundColor: modelBadgeColor }]} />
          <View>
            <Text style={styles.headerModelText}>
              {activeMetadata?.displayName || 'No Model Loaded'} • 100% Offline
            </Text>
            <Text style={styles.headerSubText}>
              {currentCase ? `📁 Scoped Case: ${currentCase.title}` : '🌐 General Health Context'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearBtn} onPress={clearHistory}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.chatArea}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
        />

        {/* Live Streaming Indicator */}
        {isGenerating && streamingContent.length > 0 && (
          <View style={styles.streamingCard}>
            <Text style={styles.streamingText}>{streamingContent}</Text>
            <View style={styles.generatingRow}>
              <ActivityIndicator size="small" color="#38BDF8" />
              <Text style={styles.generatingLabel}>Streaming tokens from local llama.rn...</Text>
              <TouchableOpacity style={styles.stopBtn} onPress={stopGeneration}>
                <Text style={styles.stopBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={
              currentCase
                ? `Ask about ${currentCase.title}, prescriptions, diet...`
                : 'Ask about medications, recovery, symptoms...'
            }
            placeholderTextColor="#64748B"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: isGenerating ? '#334155' : '#0284C7' },
            ]}
            onPress={handleSend}
            disabled={isGenerating}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  headerModelText: { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },
  headerSubText: { color: '#38BDF8', fontSize: 11, marginTop: 2 },
  clearBtn: { padding: 4 },
  clearBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  chatArea: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 24 },
  messageRow: { marginVertical: 6, flexDirection: 'row' },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
  userBubble: { backgroundColor: '#0284C7', borderBottomRightRadius: 4 },
  assistantBubble: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#FFFFFF' },
  assistantText: { color: '#F8FAFC' },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  modelTag: { fontSize: 9, color: '#38BDF8', fontWeight: '700' },
  timestamp: { fontSize: 10 },
  userTime: { color: '#BAE6FD' },
  assistantTime: { color: '#94A3B8' },
  actionChip: {
    marginTop: 8,
    backgroundColor: '#0284C722',
    borderColor: '#38BDF8',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionChipText: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
  streamingCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  streamingText: { fontSize: 14, color: '#F8FAFC', lineHeight: 20 },
  generatingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  generatingLabel: {
    fontSize: 11,
    color: '#38BDF8',
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
  },
  stopBtn: {
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stopBtnText: { color: '#FCA5A5', fontSize: 11, fontWeight: '700' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#F8FAFC',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendButton: {
    marginLeft: 8,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
