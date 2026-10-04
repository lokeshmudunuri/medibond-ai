import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StorageAccountingService, StorageCategoryBreakdown } from '../services/StorageAccountingService';

export const StorageScreen: React.FC = () => {
  const [breakdown, setBreakdown] = useState<StorageCategoryBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStorage = async () => {
    setLoading(true);
    try {
      const data = await StorageAccountingService.calculateStorageBreakdown();
      setBreakdown(data);
    } catch (e) {
      console.error('[StorageScreen] Failed to load breakdown:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorage();
  }, []);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Temporary Cache',
      'This will clear temporary image thumbnails and cache files. Your downloaded AI models, confirmed medical records, and active case memories will remain completely safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: () => {
            const res = StorageAccountingService.clearCache();
            Alert.alert('Cache Cleared', res.message);
            loadStorage();
          },
        },
      ]
    );
  };

  if (loading || !breakdown) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Calculating On-Device Storage...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Storage & Data Vault</Text>
        <Text style={styles.headerSubtitle}>
          CareBond operates 100% on-device. All medical documents, case memories, and AI models reside strictly on your local phone storage.
        </Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalLabel}>Total On-Device Storage</Text>
          <Text style={styles.totalValue}>{breakdown.totalAppFormatted}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Storage Breakdown by Category</Text>

      <View style={styles.card}>
        <View style={styles.categoryRow}>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryIcon}>🤖</Text>
            <View>
              <Text style={styles.categoryName}>Local AI Models (GGUF)</Text>
              <Text style={styles.categoryDesc}>Offline LLM weights (Qwen / MedGemma)</Text>
            </View>
          </View>
          <Text style={styles.categorySize}>{breakdown.modelsFormatted}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.categoryRow}>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryIcon}>📄</Text>
            <View>
              <Text style={styles.categoryName}>Medical Records & OCR</Text>
              <Text style={styles.categoryDesc}>Structured prescriptions, labs & doctor notes</Text>
            </View>
          </View>
          <Text style={styles.categorySize}>{breakdown.recordsFormatted}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.categoryRow}>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryIcon}>🖼️</Text>
            <View>
              <Text style={styles.categoryName}>Original Document Images</Text>
              <Text style={styles.categoryDesc}>High-res camera captures & scans</Text>
            </View>
          </View>
          <Text style={styles.categorySize}>{breakdown.imagesFormatted}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.categoryRow}>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryIcon}>🩹</Text>
            <View>
              <Text style={styles.categoryName}>Recovery Track Memory</Text>
              <Text style={styles.categoryDesc}>10-min snapshots, daily check-ins & timelines</Text>
            </View>
          </View>
          <Text style={styles.categorySize}>{breakdown.recoveryFormatted}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.categoryRow}>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryIcon}>🗂️</Text>
            <View>
              <Text style={styles.categoryName}>Case Scoping & Health Memory</Text>
              <Text style={styles.categoryDesc}>Patient profiles, timelines & reminders</Text>
            </View>
          </View>
          <Text style={styles.categorySize}>{breakdown.caseFormatted}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.categoryRow}>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryIcon}>🎙️</Text>
            <View>
              <Text style={styles.categoryName}>Voice & Audio Buffers</Text>
              <Text style={styles.categoryDesc}>Temporary offline STT/TTS buffers</Text>
            </View>
          </View>
          <Text style={styles.categorySize}>{breakdown.voiceFormatted}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.categoryRow}>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryIcon}>⚡</Text>
            <View>
              <Text style={styles.categoryName}>Temporary Image Cache</Text>
              <Text style={styles.categoryDesc}>UI thumbnails & temporary renders</Text>
            </View>
          </View>
          <Text style={styles.categorySize}>{breakdown.cacheFormatted}</Text>
        </View>
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Storage Maintenance</Text>
        <Text style={styles.actionsDesc}>
          Safely clear temporary thumbnails and cache without affecting any confirmed medical data or downloaded AI models.
        </Text>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearCache}>
          <Text style={styles.clearBtnText}>🧹 Clear Temporary Cache ({breakdown.cacheFormatted})</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  headerCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  headerSubtitle: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  totalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  totalLabel: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  totalValue: { color: '#38bdf8', fontSize: 18, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  categoryIcon: { fontSize: 22, marginRight: 12 },
  categoryName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  categoryDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  categorySize: { fontSize: 14, fontWeight: '700', color: '#0284c7' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  actionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionsTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  actionsDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 14 },
  clearBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  clearBtnText: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
});
