import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/config/app_theme.dart';
import '../../core/config/device_profile.dart';
import '../../core/events/health_event_bus.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/resources/storage_paths.dart';
import '../../core/security/local_security.dart';
import '../../services/health_memory/health_memory_service.dart';
import 'developer_diagnostics_screen.dart';
import 'resource_manager_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  DeviceProfile _selectedProfile = DeviceProfile.automatic;
  int _estimatedRamMb = 8192;
  int _modelStorageBytes = 0;
  int _docStorageBytes = 0;
  bool _biometricsEnabled = false;
  AppLanguage _selectedLanguage = AppLanguage.english;
  bool _isSampleMode = true;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    final profile = await DeviceCapabilityScanner.getSavedProfile();
    final ram = await DeviceCapabilityScanner.estimateDeviceRamMb();
    final modelBytes = await StoragePaths.calculateTotalModelStorageBytes();
    final docBytes = await StoragePaths.calculateMedicalDocsStorageBytes();
    final bio = await LocalSecurityManager.isBiometricEnabled();
    final sample = prefs.getBool('sample_mode_active') ?? true;

    if (mounted) {
      setState(() {
        _selectedProfile = profile;
        _estimatedRamMb = ram;
        _modelStorageBytes = modelBytes;
        _docStorageBytes = docBytes;
        _biometricsEnabled = bio;
        _selectedLanguage = LanguageManager().currentLanguage;
        _isSampleMode = sample;
        _isLoading = false;
      });
    }
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    } else {
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
    }
  }

  Future<void> _changeLanguage(AppLanguage lang) async {
    await LanguageManager().setLanguage(lang);
    setState(() {
      _selectedLanguage = lang;
    });
    HealthEventBus().emit(HealthEventType.languageChanged);
  }

  Future<void> _clearTemporaryCache() async {
    await StoragePaths.clearTempOcrCache();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Temporary OCR cache safely cleared without affecting medical records.')),
      );
    }
  }

  Future<void> _toggleSampleMode(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('sample_mode_active', value);
    setState(() => _isSampleMode = value);

    if (!value) {
      await HealthMemoryService().clearSampleDataForFreshProfile();
    } else {
      await HealthMemoryService().seedSampleData();
    }

    HealthEventBus().emit(HealthEventType.profileModeChanged);
    HealthEventBus().notifyDataChanged();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(value
              ? 'Sample Patient demo mode enabled.'
              : 'Clean Slate mode active. Isolated fresh profile ready.'),
          backgroundColor: AppTheme.primaryTeal,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context);

    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal)),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(loc.translate('tabSettings')),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Language Preference Section
          const Text('Language & Localization', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                children: AppLanguage.values.map((lang) {
                  final isSelected = _selectedLanguage == lang;
                  return RadioListTile<AppLanguage>(
                    value: lang,
                    groupValue: _selectedLanguage,
                    activeColor: AppTheme.primaryTeal,
                    title: Text('${lang.nativeName} (${lang.englishName})', style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                    onChanged: (val) {
                      if (val != null) _changeLanguage(val);
                    },
                  );
                }).toList(),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Offline Resources & Model Manager
          const Text('Offline AI & Models', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: AppTheme.primaryTeal,
                child: Icon(Icons.folder_zip_outlined, color: Colors.white),
              ),
              title: const Text('Offline Model & Resource Manager', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Manage installed STT, TTS, OCR, and MedGemma weights (${_formatBytes(_modelStorageBytes)})'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (ctx) => const ResourceManagerScreen()),
                );
                _loadSettings();
              },
            ),
          ),
          const SizedBox(height: 20),

          // Profile & Evaluation Mode
          const Text('Profile & Evaluation Mode', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  value: _isSampleMode,
                  activeThumbColor: AppTheme.primaryTeal,
                  title: const Text('Sample Patient Mode (Demo)', style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: const Text('Toggle between preloaded recovery demo history and clean blank slate.'),
                  onChanged: _toggleSampleMode,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Security & Biometric Lock
          const Text('Security & Privacy', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  value: _biometricsEnabled,
                  activeThumbColor: AppTheme.primaryTeal,
                  title: const Text('Biometric Screen Lock', style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: const Text('Require fingerprint/face lock before opening medical records.'),
                  onChanged: (val) async {
                    await LocalSecurityManager.setBiometricEnabled(val);
                    setState(() => _biometricsEnabled = val);
                  },
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.cleaning_services_outlined, color: Colors.amber),
                  title: const Text('Clear Temporary OCR Cache'),
                  subtitle: const Text('Remove temporary scanned image files without touching database.'),
                  onTap: _clearTemporaryCache,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Device Specifications
          const Text('Device & Runtime Diagnostics', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14.0),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Estimated RAM', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                      Text('${(_estimatedRamMb / 1024).toStringAsFixed(1)} GB', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                  const Divider(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Active Device Profile', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                      Text(_selectedProfile.name.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.primaryTeal)),
                    ],
                  ),
                  const Divider(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Encrypted Health Storage', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                      Text(_formatBytes(_docStorageBytes), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                  const Divider(height: 14),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.analytics_outlined, color: AppTheme.primaryTeal),
                    title: const Text('Open Developer Diagnostics', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: const Text('View real hardware telemetry, LiteRT-LM runtime, and token rate benchmarks.', style: TextStyle(fontSize: 11)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (ctx) => const DeveloperDiagnosticsScreen()),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
