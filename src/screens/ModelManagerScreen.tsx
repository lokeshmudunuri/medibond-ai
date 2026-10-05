import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useModelStore } from '../store/useModelStore';
import {
  DeviceCompatibility,
  ModelInstallStatus,
  ModelPackage,
  QuantizationVariant,
} from '../types/model';
import { ModelManager } from '../ai/ModelManager';
import { ModelOperatingMode, ModelRouter, ModelRouteDecision } from '../ai/ModelRouter';
import { NativeDownloader, StorageInfo } from '../services/NativeDownloader';
import { HFModelSummary } from '../services/HuggingFaceService';

export const ModelManagerScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const {
    packages,
    activeModelId,
    engineState,
    isLoadingModel,
    downloadModel,
    cancelDownload,
    loadModel,
    unloadModel,
    deleteModel,
  } = useModelStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<HFModelSummary[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, QuantizationVariant>>({});
  const [operatingMode, setOperatingMode] = useState<ModelOperatingMode>(ModelOperatingMode.Automatic);
  const [routeDecision, setRouteDecision] = useState<ModelRouteDecision | null>(null);

  const modelManager = ModelManager.getInstance();
  const modelRouter = ModelRouter.getInstance();

  useEffect(() => {
    loadStorageInfo();
    modelManager.restoreFromDisk();
    updateRoute();
  }, [operatingMode, packages, activeModelId]);

  const updateRoute = () => {
    const decision = modelRouter.routeModel();
    setRouteDecision(decision);
  };

  const loadStorageInfo = async () => {
    try {
      const info = await NativeDownloader.getStorageInfo();
      setStorageInfo(info);
    } catch (e) {
      console.warn('Storage info error:', e);
    }
  };

  const handleModeChange = (mode: ModelOperatingMode) => {
    setOperatingMode(mode);
    modelRouter.setOperatingMode(mode);
    const decision = modelRouter.routeModel();
    setRouteDecision(decision);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await modelManager.searchHuggingFace(searchQuery.trim());
      setSearchResults(results);
    } catch (err: any) {
      Alert.alert('Search Error', err?.message || 'Failed to search Hugging Face');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRepo = async (repo: HFModelSummary) => {
    setIsSearching(true);
    try {
      const details = await modelManager.inspectModelRepo(repo.id);
      if (!details || details.files.length === 0) {
        Alert.alert('No GGUF Models Found', `No compatible .gguf files found in repository ${repo.id}`);
        return;
      }

      // Default to first/recommended variant
      const defaultVariant = details.files[0];
      const pkg = modelManager.registerHuggingFaceModel(repo.id, defaultVariant);

      Alert.alert(
        'Model Registered',
        `Registered ${repo.id} (${defaultVariant.quantization}). You can now download it directly to device.`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Download Now',
            onPress: () => handleDownload(pkg.metadata.modelId, defaultVariant),
          },
        ]
      );
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      Alert.alert('Inspect Error', err?.message || 'Failed to inspect model repository');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (modelId: string, variant?: QuantizationVariant) => {
    try {
      await downloadModel(modelId, variant);
      loadStorageInfo();
    } catch (err: any) {
      Alert.alert('Download Error', err?.message || 'Failed to download model');
    }
  };

  const handleCancel = async (modelId: string) => {
    await cancelDownload(modelId);
  };

  const handleToggleLoad = async (pkg: ModelPackage) => {
    if (activeModelId === pkg.metadata.modelId) {
      await unloadModel();
    } else {
      // Memory safety check before loading large model
      const isLargeModel = pkg.metadata.modelId.includes('gemma-4');
      const ramGb = modelRouter.getDeviceRamGb();

      if (isLargeModel && ramGb < 4.0) {
        Alert.alert(
          'High Memory Warning',
          `This device profile (~${ramGb}GB RAM) has limited memory. Loading large model (~2.8GB GGUF) may cause memory pressure. Proceed with safe 2048 context length?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Load Anyway',
              style: 'destructive',
              onPress: async () => {
                try {
                  await loadModel(pkg.metadata.modelId);
                } catch (err: any) {
                  Alert.alert('Model Load Error', err?.message || 'Failed to initialize local model context.');
                }
              },
            },
          ]
        );
        return;
      }

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

  const handleDelete = (pkg: ModelPackage) => {
    Alert.alert(
      'Delete Local Model',
      `Are you sure you want to delete ${pkg.metadata.displayName}? This will free up local phone storage.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteModel(pkg.metadata.modelId);
            loadStorageInfo();
          },
        },
      ]
    );
  };

  const getCompatibilityBadge = (compat?: DeviceCompatibility, modelId?: string) => {
    const isRecommended = routeDecision?.selectedModelId === modelId;
    if (isRecommended) {
      return { label: '⭐ RECOMMENDED ROUTE', bg: '#065F46', text: '#6EE7B7' };
    }
    switch (compat) {
      case DeviceCompatibility.Good:
        return { label: 'OPTIMAL FOR DEVICE', bg: '#064E3B', text: '#34D399' };
      case DeviceCompatibility.Caution:
        return { label: 'HIGH RAM REQUIRED', bg: '#78350F', text: '#FBBF24' };
      case DeviceCompatibility.NotRecommended:
        return { label: 'NOT RECOMMENDED', bg: '#7F1D1D', text: '#F87171' };
      default:
        return { label: 'COMPATIBLE', bg: '#1E293B', text: '#94A3B8' };
    }
  };

  const renderModelItem = ({ item }: { item: ModelPackage }) => {
    const isActive = activeModelId === item.metadata.modelId;
    const isInstalled = item.status === ModelInstallStatus.Installed && !!item.localPath;
    const isDownloading = item.status === ModelInstallStatus.Downloading;
    const isVerifying = item.status === ModelInstallStatus.Verifying;
    const isError = item.status === ModelInstallStatus.Error || !!item.errorMessage;

    const sizeMb = Math.round((item.totalBytes || item.metadata.sizeBytes) / (1024 * 1024));
    const downloadedMb = Math.round(item.bytesDownloaded / (1024 * 1024));
    const speedMbSec = item.downloadSpeedBytesPerSec
      ? (item.downloadSpeedBytesPerSec / (1024 * 1024)).toFixed(1)
      : '0.0';
    const percent = Math.round(item.downloadProgress * 100);
    const compatBadge = getCompatibilityBadge(item.metadata.compatibility, item.metadata.modelId);

    const variants = item.metadata.variants || [];
    const selectedVariant = selectedVariantMap[item.metadata.modelId] || variants[0];

    const statusBadgeLabel = isActive
      ? 'LOADED'
      : isInstalled
      ? 'DOWNLOADED'
      : isDownloading
      ? 'DOWNLOADING'
      : isVerifying
      ? 'VERIFYING'
      : isError
      ? 'ERROR'
      : 'NOT INSTALLED';

    return (
      <View style={[styles.modelCard, isActive && styles.activeModelCard]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.modelTitle}>{item.metadata.displayName}</Text>
            {item.metadata.provider ? (
              <Text style={styles.providerText}>By {item.metadata.provider}</Text>
            ) : null}
          </View>
          <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text
              style={[
                styles.statusBadgeText,
                isActive ? styles.activeBadgeText : styles.inactiveBadgeText,
              ]}
            >
              {statusBadgeLabel}
            </Text>
          </View>
        </View>

        <View style={styles.compatRow}>
          <View style={[styles.compatBadge, { backgroundColor: compatBadge.bg }]}>
            <Text style={[styles.compatText, { color: compatBadge.text }]}>
              {compatBadge.label}
            </Text>
          </View>
          <Text style={styles.modelMetaInline}>
            Arch: {item.metadata.architecture} • Context: {item.metadata.contextLength}
          </Text>
        </View>

        {/* Quantization selector if multiple variants exist */}
        {!isInstalled && !isDownloading && variants.length > 1 ? (
          <View style={styles.variantContainer}>
            <Text style={styles.variantTitle}>Select Quantization:</Text>
            <View style={styles.variantRow}>
              {variants.map((v) => {
                const isSelected = selectedVariant?.quantization === v.quantization;
                const vSizeMb = Math.round(v.sizeBytes / (1024 * 1024));
                return (
                  <TouchableOpacity
                    key={v.quantization}
                    style={[styles.variantChip, isSelected && styles.variantChipSelected]}
                    onPress={() =>
                      setSelectedVariantMap((prev) => ({
                        ...prev,
                        [item.metadata.modelId]: v,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.variantChipText,
                        isSelected && styles.variantChipTextSelected,
                      ]}
                    >
                      {v.quantization} ({vSizeMb}MB)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Real-time streaming download progress bar */}
        {isDownloading ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                Downloading: {downloadedMb} MB / {sizeMb} MB ({percent}%)
              </Text>
              <Text style={styles.progressSpeed}>
                {speedMbSec} MB/s {item.estimatedRemainingSec ? `• ETA ${item.estimatedRemainingSec}s` : ''}
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
            </View>
          </View>
        ) : null}

        {isVerifying ? (
          <View style={styles.verifyingBox}>
            <ActivityIndicator size="small" color="#38BDF8" />
            <Text style={styles.verifyingText}>Verifying GGUF binary checksum & integrity...</Text>
          </View>
        ) : null}

        {item.errorMessage ? (
          <Text style={styles.errorText}>⚠️ Error: {item.errorMessage}</Text>
        ) : null}

        {/* Actions row: strictly deterministic states */}
        <View style={styles.actionRow}>
          {isActive ? (
            // LOADED: [ UNLOAD ]
            <>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
                disabled={isLoadingModel}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.loadButton, styles.unloadButton]}
                onPress={() => handleToggleLoad(item)}
                disabled={isLoadingModel}
              >
                {isLoadingModel ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.loadButtonText}>UNLOAD</Text>
                )}
              </TouchableOpacity>
            </>
          ) : isInstalled ? (
            // DOWNLOADED_NOT_LOADED: [ LOAD ]
            <>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
                disabled={isLoadingModel}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.loadButton, styles.activeLoadButton]}
                onPress={() => handleToggleLoad(item)}
                disabled={isLoadingModel}
              >
                {isLoadingModel && activeModelId === item.metadata.modelId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.loadButtonText}>LOAD</Text>
                )}
              </TouchableOpacity>
            </>
          ) : isDownloading ? (
            // DOWNLOADING: progress + cancel
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.metadata.modelId)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          ) : isError ? (
            // ERROR: [ RETRY ]
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => handleDownload(item.metadata.modelId, selectedVariant)}
            >
              <Text style={styles.retryButtonText}>RETRY</Text>
            </TouchableOpacity>
          ) : (
            // NOT_INSTALLED: [ DOWNLOAD ]
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => handleDownload(item.metadata.modelId, selectedVariant)}
            >
              <Text style={styles.downloadButtonText}>
                DOWNLOAD ({sizeMb} MB)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const freeGb = storageInfo
    ? (storageInfo.freeBytes / (1024 * 1024 * 1024)).toFixed(1)
    : '8.6';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (navigation ? navigation.goBack() : null)}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offline AI Models</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          On-device GGUF models: Gemma 4 E2B IT (Large 2.8GB) • Qwen (Lightweight)
        </Text>
      </View>

      {/* Model Operating Mode Switcher */}
      <View style={styles.modeSection}>
        <Text style={styles.sectionHeading}>MODEL OPERATING MODE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              operatingMode === ModelOperatingMode.Automatic && styles.modeTabActive,
            ]}
            onPress={() => handleModeChange(ModelOperatingMode.Automatic)}
          >
            <Text
              style={[
                styles.modeTabText,
                operatingMode === ModelOperatingMode.Automatic && styles.modeTabTextActive,
              ]}
            >
              ⚡ Automatic
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              operatingMode === ModelOperatingMode.MedicalReasoning && styles.modeTabActive,
            ]}
            onPress={() => handleModeChange(ModelOperatingMode.MedicalReasoning)}
          >
            <Text
              style={[
                styles.modeTabText,
                operatingMode === ModelOperatingMode.MedicalReasoning && styles.modeTabTextActive,
              ]}
            >
              🩺 Large Model (Gemma 4 E2B IT)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              operatingMode === ModelOperatingMode.GeneralCompanion && styles.modeTabActive,
            ]}
            onPress={() => handleModeChange(ModelOperatingMode.GeneralCompanion)}
          >
            <Text
              style={[
                styles.modeTabText,
                operatingMode === ModelOperatingMode.GeneralCompanion && styles.modeTabTextActive,
              ]}
            >
              💬 General (Gemma 4)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              operatingMode === ModelOperatingMode.Lightweight && styles.modeTabActive,
            ]}
            onPress={() => handleModeChange(ModelOperatingMode.Lightweight)}
          >
            <Text
              style={[
                styles.modeTabText,
                operatingMode === ModelOperatingMode.Lightweight && styles.modeTabTextActive,
              ]}
            >
              🚀 Lightweight (Qwen)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Device & Routing Status Card */}
      <View style={styles.statusBox}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Hardware Tier:</Text>
          <Text style={styles.statusValue}>{routeDecision?.tier || 'Standard'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Recommended Profile:</Text>
          <Text style={[styles.statusValue, { color: '#34D399' }]}>
            {routeDecision?.modelDisplayName || 'Qwen3 0.6B Instruct'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Routing Status:</Text>
          <Text style={styles.statusValueDetail} numberOfLines={2}>
            {routeDecision?.reason || 'Ready for inference'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Engine State:</Text>
          <Text
            style={[
              styles.statusValue,
              engineState === 'ready' ? { color: '#34D399' } : { color: '#38BDF8' },
            ]}
          >
            {engineState.toUpperCase()}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Phone Storage Available:</Text>
          <Text style={styles.statusValue}>{freeGb} GB Free</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Network Policy:</Text>
          <Text style={styles.statusValue}>100% Local Inference (Airplane-Mode Ready)</Text>
        </View>
      </View>

      {/* Search Hugging Face */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Hugging Face (e.g. Qwen3-0.6B, Gemma-4-E2B)..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {isSearching ? (
          <View style={styles.searchingRow}>
            <ActivityIndicator size="small" color="#38BDF8" />
            <Text style={styles.searchingText}>Searching Hugging Face GGUF catalog...</Text>
          </View>
        ) : null}

        {searchResults.length > 0 ? (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsHeader}>Hugging Face Repositories Found:</Text>
            {searchResults.map((res) => (
              <TouchableOpacity
                key={res.id}
                style={styles.searchResultItem}
                onPress={() => handleSelectRepo(res)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultTitle}>{res.id}</Text>
                  <Text style={styles.searchResultMeta}>
                    ❤️ {res.likes} • ⬇️ {res.downloads} • By {res.author}
                  </Text>
                </View>
                <Text style={styles.inspectText}>Inspect ➔</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      {/* Models List */}
      <FlatList
        data={packages}
        keyExtractor={(item) => item.metadata.modelId}
        renderItem={renderModelItem}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  headerSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  modeSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 8,
  },
  modeScroll: {
    flexDirection: 'row',
  },
  modeTab: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeTabActive: {
    backgroundColor: '#0369A1',
    borderColor: '#38BDF8',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusBox: {
    margin: 16,
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  statusLabel: { fontSize: 11, color: '#94A3B8' },
  statusValue: { fontSize: 11, fontWeight: '700', color: '#38BDF8' },
  statusValueDetail: { fontSize: 10, fontWeight: '500', color: '#CBD5E1', flex: 1, textAlign: 'right', marginLeft: 8 },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 13,
  },
  searchButton: {
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  searchingText: { color: '#94A3B8', fontSize: 12 },
  searchResultsContainer: {
    marginTop: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  searchResultsHeader: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  searchResultTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  searchResultMeta: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  inspectText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  modelCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeModelCard: { borderColor: '#38BDF8', borderWidth: 2 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modelTitle: { fontSize: 14, fontWeight: '700', color: '#F8FAFC' },
  providerText: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadge: { backgroundColor: '#064E3B' },
  inactiveBadge: { backgroundColor: '#334155' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  activeBadgeText: { color: '#34D399' },
  inactiveBadgeText: { color: '#94A3B8' },
  compatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  compatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compatText: { fontSize: 9, fontWeight: '800' },
  modelMetaInline: { fontSize: 11, color: '#94A3B8' },
  variantContainer: { marginTop: 10 },
  variantTitle: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  variantChip: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  variantChipSelected: {
    backgroundColor: '#0369A1',
    borderColor: '#38BDF8',
  },
  variantChipText: { fontSize: 11, color: '#94A3B8' },
  variantChipTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  progressContainer: { marginTop: 12 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: { fontSize: 11, color: '#38BDF8', fontWeight: '600' },
  progressSpeed: { fontSize: 11, color: '#94A3B8' },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#0284C7' },
  verifyingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 8,
    backgroundColor: '#0F172A',
    borderRadius: 6,
  },
  verifyingText: { color: '#38BDF8', fontSize: 11 },
  errorText: { color: '#F87171', fontSize: 11, marginTop: 8 },
  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  downloadButton: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  cancelButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  deleteButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: { color: '#EF4444', fontWeight: '700', fontSize: 12 },
  retryButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  loadButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  activeLoadButton: { backgroundColor: '#10B981' },
  unloadButton: { backgroundColor: '#EF4444' },
  loadButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
});

