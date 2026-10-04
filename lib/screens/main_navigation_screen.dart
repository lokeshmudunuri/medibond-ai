import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/config/app_theme.dart';
import '../core/events/health_event_bus.dart';
import '../core/localization/app_localizations.dart';
import '../ui/widgets/voice_mic_button.dart';
import 'doctor/doctor_screen.dart';
import 'documents/documents_screen.dart';
import 'health/health_screen.dart';
import 'recovery/recovery_screen.dart';
import 'settings/settings_screen.dart';
import 'today/today_screen.dart';
import 'voice/voice_assistant_sheet.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _selectedIndex = 0;
  bool _isSampleMode = false;
  StreamSubscription? _eventSub;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _checkSampleMode();
    _screens = [
      TodayScreen(onNavigateToTab: _onNavigateToTab),
      const HealthScreen(),
      const RecoveryScreen(),
      const DocumentsScreen(),
      const DoctorScreen(),
    ];
    _eventSub = HealthEventBus().stream.listen((event) {
      if (event.type == HealthEventType.profileModeChanged && mounted) {
        _checkSampleMode();
      }
    });
  }

  @override
  void dispose() {
    _eventSub?.cancel();
    super.dispose();
  }

  Future<void> _checkSampleMode() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _isSampleMode = prefs.getBool('sample_mode_active') ?? true;
      });
    }
  }

  void _onNavigateToTab(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.primaryLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.favorite, color: AppTheme.primaryTeal, size: 20),
            ),
            const SizedBox(width: 10),
            Text(
              loc.appName,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            if (_isSampleMode) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFF59E0B)),
                ),
                child: const Text('DEMO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF92400E))),
              ),
            ],
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: loc.translate('tabSettings'),
            onPressed: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (ctx) => const SettingsScreen()),
              );
              _checkSampleMode();
            },
          ),
        ],
      ),
      body: _screens[_selectedIndex],
      floatingActionButton: VoiceMicButton(
        onPressed: () => VoiceAssistantSheet.show(context),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (int index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.today_outlined),
            selectedIcon: const Icon(Icons.today),
            label: loc.translate('tabToday'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.health_and_safety_outlined),
            selectedIcon: const Icon(Icons.health_and_safety),
            label: loc.translate('tabHealth'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.monitor_heart_outlined),
            selectedIcon: const Icon(Icons.monitor_heart),
            label: loc.translate('tabRecovery'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.description_outlined),
            selectedIcon: const Icon(Icons.description),
            label: loc.translate('tabDocuments'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.medical_services_outlined),
            selectedIcon: const Icon(Icons.medical_services),
            label: loc.translate('tabDoctor'),
          ),
        ],
      ),
    );
  }
}
