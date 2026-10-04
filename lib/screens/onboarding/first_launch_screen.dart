import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/config/app_theme.dart';
import '../../core/config/device_profile.dart';
import '../../core/localization/app_localizations.dart';
import '../../services/health_memory/health_memory_service.dart';
import '../main_navigation_screen.dart';

class FirstLaunchScreen extends StatefulWidget {
  const FirstLaunchScreen({super.key});

  @override
  State<FirstLaunchScreen> createState() => _FirstLaunchScreenState();
}

class _FirstLaunchScreenState extends State<FirstLaunchScreen> {
  int _currentStep = 0;
  bool _isScanning = true;
  double _detectedRamMb = 8192;
  DeviceProfile _recommendedProfile = DeviceProfile.advanced6GB;
  DeviceProfile _selectedProfile = DeviceProfile.automatic;
  AppLanguage _selectedLanguage = AppLanguage.english;
  bool _loadSampleData = true;

  @override
  void initState() {
    super.initState();
    _selectedLanguage = LanguageManager().currentLanguage;
    _performHardwareScan();
  }

  Future<void> _performHardwareScan() async {
    setState(() => _isScanning = true);
    await Future.delayed(const Duration(milliseconds: 600));
    final ramMb = await DeviceCapabilityScanner.estimateAvailableRamMb();
    final profile = await DeviceCapabilityScanner.detectProfile();

    if (mounted) {
      setState(() {
        _detectedRamMb = ramMb;
        _recommendedProfile = profile;
        _selectedProfile = profile;
        _isScanning = false;
      });
    }
  }

  Future<void> _onLanguageSelected(AppLanguage language) async {
    setState(() {
      _selectedLanguage = language;
    });
    await LanguageManager().setLanguage(language);
  }

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await DeviceCapabilityScanner.saveProfile(_selectedProfile);
    await LanguageManager().setLanguage(_selectedLanguage);
    await prefs.setBool('first_launch_completed', true);
    await prefs.setBool('sample_mode_active', _loadSampleData);

    if (!_loadSampleData) {
      await HealthMemoryService().clearSampleDataForFreshProfile();
    } else {
      await HealthMemoryService().seedSampleData();
    }

    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (ctx) => const MainNavigationScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(
                        radius: 14,
                        backgroundColor: AppTheme.primaryTeal,
                        child: Icon(Icons.favorite, size: 14, color: Colors.white),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        loc.appName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryTeal,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    'Step ${_currentStep + 1} of 5',
                    style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              LinearProgressIndicator(
                value: (_currentStep + 1) / 5.0,
                backgroundColor: Colors.grey.shade200,
                valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryTeal),
                borderRadius: BorderRadius.circular(4),
              ),
              const SizedBox(height: 24),

              Expanded(
                child: SingleChildScrollView(
                  child: _buildStepContent(loc),
                ),
              ),

              // Bottom Navigation Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (_currentStep > 0)
                    OutlinedButton(
                      onPressed: () {
                        setState(() => _currentStep--);
                      },
                      child: const Text('Back'),
                    )
                  else
                    const SizedBox.shrink(),
                  ElevatedButton(
                    onPressed: () {
                      if (_currentStep < 4) {
                        setState(() => _currentStep++);
                      } else {
                        _completeOnboarding();
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryTeal,
                      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                    ),
                    child: Text(
                      _currentStep == 4 ? loc.translate('getStarted') : 'Continue',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepContent(AppLocalizations loc) {
    switch (_currentStep) {
      case 0:
        return _buildWelcomeStep(loc);
      case 1:
        return _buildDeviceScanStep(loc);
      case 2:
        return _buildLanguageSelectionStep(loc);
      case 3:
        return _buildResourcePlanStep(loc);
      case 4:
        return _buildProfileSelectionStep(loc);
      default:
        return const SizedBox.shrink();
    }
  }

  // Step 0: Welcome
  Widget _buildWelcomeStep(AppLocalizations loc) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 10),
        const Icon(Icons.shield_outlined, size: 48, color: AppTheme.primaryTeal),
        const SizedBox(height: 16),
        Text(
          loc.translate('onboardingTitle'),
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 10),
        Text(
          loc.translate('onboardingDesc'),
          style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary, height: 1.5),
        ),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                _buildFeatureRow(Icons.lock_outline, '100% Offline & Private', 'Zero telemetry or cloud transmission of personal health metrics.'),
                const Divider(height: 20),
                _buildFeatureRow(Icons.medical_services_outlined, 'Clinical Guardrails', 'Deterministic contraindication safety and structured medical reasoning.'),
                const Divider(height: 20),
                _buildFeatureRow(Icons.timeline_outlined, 'Post-Op Kinematic Recovery', 'CUSUM baseline drift detection with explainable clinical alerts.'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // Step 1: Device Capability Scan
  Widget _buildDeviceScanStep(AppLocalizations loc) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 10),
        const Icon(Icons.memory_outlined, size: 48, color: AppTheme.primaryTeal),
        const SizedBox(height: 16),
        Text(
          loc.translate('deviceScanTitle'),
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        const Text(
          'Scanning hardware specifications to optimize offline neural weights and inference execution engine.',
          style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 20),
        if (_isScanning)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(32.0),
              child: CircularProgressIndicator(color: AppTheme.primaryTeal),
            ),
          )
        else ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _buildSpecRow('Detected System RAM', '${(_detectedRamMb / 1024).toStringAsFixed(1)} GB Physical RAM'),
                  const Divider(height: 16),
                  _buildSpecRow('Rendering Engine', 'Impeller Vulkan (Direct CPU/GPU Hardware Acceleration)'),
                  const Divider(height: 16),
                  _buildSpecRow('Recommended Profile', _recommendedProfile == DeviceProfile.advanced6GB ? 'Advanced 6GB+ Profile (MedGemma 4B / High-Fi STT)' : 'Essential 4GB Profile (Lightweight Clinical Reasoning)'),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  // Step 2: Language Preference
  Widget _buildLanguageSelectionStep(AppLocalizations loc) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 10),
        const Icon(Icons.translate_outlined, size: 48, color: AppTheme.primaryTeal),
        const SizedBox(height: 16),
        Text(
          loc.translate('selectLanguage'),
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        const Text(
          'Select your primary language. The entire UI, recovery companion, and voice engine will adapt immediately.',
          style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 16),
        ...AppLanguage.values.map((lang) {
          final isSelected = _selectedLanguage == lang;
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(
                color: isSelected ? AppTheme.primaryTeal : Colors.transparent,
                width: 2,
              ),
            ),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: isSelected ? AppTheme.primaryTeal : Colors.grey.shade200,
                child: Text(
                  lang.code.toUpperCase(),
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppTheme.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
              title: Text(
                lang.nativeName,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              subtitle: Text(lang.englishName, style: const TextStyle(fontSize: 12)),
              trailing: isSelected
                  ? const Icon(Icons.check_circle, color: AppTheme.primaryTeal)
                  : null,
              onTap: () => _onLanguageSelected(lang),
            ),
          );
        }),
      ],
    );
  }

  // Step 3: Offline Resource Plan
  Widget _buildResourcePlanStep(AppLocalizations loc) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 10),
        const Icon(Icons.folder_zip_outlined, size: 48, color: AppTheme.primaryTeal),
        const SizedBox(height: 16),
        const Text(
          'Tailored Offline Resource Plan',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        Text(
          'Based on ${_selectedLanguage.nativeName} (${_selectedLanguage.englishName}) and your ${(_detectedRamMb / 1024).toStringAsFixed(0)}GB device profile, the following packages are configured:',
          style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                _buildResourcePlanRow('AI Companion Model', 'Gemma 4 E2B LiteRT-LM (2.59 GB • On-Device)'),
                const Divider(height: 16),
                _buildResourcePlanRow('Speech-to-Text Engine', 'Offline IndicConformer ASR (${_selectedLanguage.nativeName})'),
                const Divider(height: 16),
                _buildResourcePlanRow('Voice Synthesis (TTS)', 'Piper Neural Voice (${_selectedLanguage.nativeName})'),
                const Divider(height: 16),
                _buildResourcePlanRow('Document OCR & NER', 'PP-OCR Medical & Pharma NER'),
                const Divider(height: 16),
                _buildResourcePlanRow('Clinical Safety Knowledge', 'Deterministic Drug Safety & Contraindications KB'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // Step 4: Profile Type Selection
  Widget _buildProfileSelectionStep(AppLocalizations loc) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 10),
        const Icon(Icons.person_outline, size: 48, color: AppTheme.primaryTeal),
        const SizedBox(height: 16),
        Text(
          loc.translate('profileType'),
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 8),
        const Text(
          'Choose whether to start with an empty record or explore with preloaded longitudinal recovery data.',
          style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 16),
        _buildProfileModeCard(
          title: loc.translate('cleanSlate'),
          desc: loc.translate('cleanSlateDesc'),
          isSelected: !_loadSampleData,
          icon: Icons.edit_document,
          onTap: () => setState(() => _loadSampleData = false),
        ),
        const SizedBox(height: 12),
        _buildProfileModeCard(
          title: loc.translate('samplePatient'),
          desc: loc.translate('samplePatientDesc'),
          isSelected: _loadSampleData,
          icon: Icons.medical_information_outlined,
          onTap: () => setState(() => _loadSampleData = true),
        ),
      ],
    );
  }

  Widget _buildProfileModeCard({
    required String title,
    required String desc,
    required bool isSelected,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected ? AppTheme.primaryTeal : Colors.transparent,
          width: 2,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                backgroundColor: isSelected ? AppTheme.primaryTeal : Colors.grey.shade200,
                child: Icon(icon, color: isSelected ? Colors.white : AppTheme.textPrimary, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text(desc, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.3)),
                  ],
                ),
              ),
              if (isSelected)
                const Icon(Icons.check_circle, color: AppTheme.primaryTeal),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureRow(IconData icon, String title, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AppTheme.primaryTeal, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 2),
              Text(desc, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSpecRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
          ),
        ),
      ],
    );
  }

  Widget _buildResourcePlanRow(String title, String detail) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.check_circle_outline, color: AppTheme.primaryTeal, size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 2),
              Text(detail, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
            ],
          ),
        ),
      ],
    );
  }
}
