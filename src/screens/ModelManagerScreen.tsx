import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useModelStore } from '../store/useModelStore';
import { ModelPackage } from '../types/model';
import { ModelRegistry } from '../ai/ModelRegistry';
import { VoiceResourcePackage } from '../types/voice';

export const ModelManagerScreen: React.FC<{ navigation?: any }> = () => {
  const { packages, activeModelId, engineState, isLoadingModel, loadModel, unloadModel } =
    useModelStore();

  const [activeTab, setActiveTab] = useState<'llm' | 'voice'>('llm');

  const voicePackages = ModelRegistry.getVoicePackages();

  const handleToggleLoad = async (pkg: ModelPackage) => {
    if (activeModelId === pkg.metadata.modelId) {
      await unloadModel();
    } else {
      try {
        await loadModel(pkg.metadata.modelId);
      } catch (err: any) {
        Alert.alert(
          'Model Load Error',
          err?.message || 'Failed to initialize local model context.'
        );
      }
    }
  };

  const renderModelItem = ({ item }: { item: ModelPackage }) => {
    const isActive = activeModelId === item.metadata.modelId;
    const sizeMb = Math.round(item.metadata.sizeBytes / (1024 * 1024));

    return (
      <View style={[styles.modelCard, isActive && styles.activeModelCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.modelTitle}>{item.metadata.displayName}</Text>
          <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text
              style={[
                styles.statusBadgeText,
                isActive ? styles.activeBadgeText : styles.inactiveBadgeText,
              ]}
            >
              {isActive ? 'ACTIVE' : item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.modelMeta}>
          Arch: {item.metadata.architecture} • Quant: {item.metadata.quantization} • Size:{' '}
          {sizeMb} MB
        </Text>
        <Text style={styles.modelMeta}>
          Context: {item.metadata.contextLength} tokens • Threads:{' '}
          {item.metadata.recommendedThreads}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.loadButton, isActive ? styles.unloadButton : styles.activeLoadButton]}
            onPress={() => handleToggleLoad(item)}
            disabled={isLoadingModel}
          >
            {isLoadingModel && activeModelId === item.metadata.modelId ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loadButtonText}>{isActive ? 'Unload Model' : 'Load Model'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderVoicePackageItem = ({ item }: { item: VoiceResourcePackage }) => {
    const sizeMb = Math.round(item.sizeBytes / (1024 * 1024));

    return (
      <View style={styles.modelCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.modelTitle}>{item.name}</Text>
          <View style={[styles.statusBadge, item.isInstalled ? styles.activeBadge : styles.inactiveBadge]}>
            <Text
              style={[
                styles.statusBadgeText,
                item.isInstalled ? styles.activeBadgeText : styles.inactiveBadgeText,
              ]}
            >
              {item.isInstalled ? 'INSTALLED' : 'NOT INSTALLED'}
            </Text>
          </View>
        </View>

        <Text style={styles.modelMeta}>
          Type: {item.type} • Language: {item.language.toUpperCase()} • Size: {sizeMb} MB
        </Text>
        <Text style={styles.modelMeta}>{item.description}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Local AI Model & Voice Manager</Text>
        <Text style={styles.headerSubtitle}>
          PocketPal-style llama.rn / llama.cpp local GGUF & offline voice packages
        </Text>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>
          Engine Status: <Text style={styles.statusValue}>{engineState.toUpperCase()}</Text>
        </Text>
        <Text style={styles.statusLabel}>
          Runtime: <Text style={styles.statusValue}>llama.rn (llama.cpp ARM64 Native)</Text>
        </Text>
        <Text style={styles.statusLabel}>
          Offline Mode: <Text style={styles.statusValue}>100% Local (Airplane Mode Ready)</Text>
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'llm' && styles.tabBtnActive]}
          onPress={() => setActiveTab('llm')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'llm' && styles.tabBtnTextActive]}>
            🧠 LLM Models ({packages.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'voice' && styles.tabBtnActive]}
          onPress={() => setActiveTab('voice')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'voice' && styles.tabBtnTextActive]}>
            🎙️ Voice Packages ({voicePackages.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'llm' ? (
        <FlatList
          data={packages}
          keyExtractor={(item) => item.metadata.modelId}
          renderItem={renderModelItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={voicePackages}
          keyExtractor={(item) => item.id}
          renderItem={renderVoicePackageItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 16, backgroundColor: '#0F172A', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  headerSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  statusBox: {
    margin: 16,
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusLabel: { fontSize: 12, color: '#94A3B8', marginVertical: 2 },
  statusValue: { fontWeight: '700', color: '#38BDF8' },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  tabBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  tabBtnTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  modelCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeModelCard: { borderColor: '#38BDF8', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modelTitle: { fontSize: 14, fontWeight: '700', color: '#F8FAFC', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadge: { backgroundColor: '#064E3B' },
  inactiveBadge: { backgroundColor: '#334155' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  activeBadgeText: { color: '#34D399' },
  inactiveBadgeText: { color: '#94A3B8' },
  modelMeta: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  actionRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
  loadButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  activeLoadButton: { backgroundColor: '#0284C7' },
  unloadButton: { backgroundColor: '#EF4444' },
  loadButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
});
