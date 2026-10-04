import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/config/app_theme.dart';
import 'core/localization/app_localizations.dart';
import 'core/resources/resource_manager.dart';
import 'core/resources/storage_paths.dart';
import 'core/security/local_security.dart';
import 'screens/auth/biometric_lock_screen.dart';
import 'screens/main_navigation_screen.dart';
import 'screens/onboarding/first_launch_screen.dart';
import 'services/health_memory/health_memory_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize storage folders, health database, offline resource registry, and language manager
  await StoragePaths.initialize();
  await LanguageManager().initialize();
  await HealthMemoryService().initialize();
  await ResourceManager().initialize();

  final prefs = await SharedPreferences.getInstance();
  final isFirstLaunch = !(prefs.getBool('first_launch_completed') ?? false);
  final isBiometricsRequired = await LocalSecurityManager.isBiometricEnabled();

  runApp(CareBondApp(
    isFirstLaunch: isFirstLaunch,
    isBiometricsRequired: isBiometricsRequired,
  ));
}

class CareBondApp extends StatefulWidget {
  final bool isFirstLaunch;
  final bool isBiometricsRequired;

  const CareBondApp({
    super.key,
    required this.isFirstLaunch,
    required this.isBiometricsRequired,
  });

  @override
  State<CareBondApp> createState() => _CareBondAppState();
}

class _CareBondAppState extends State<CareBondApp> {
  late bool _isAuthenticated;

  @override
  void initState() {
    super.initState();
    _isAuthenticated = !widget.isBiometricsRequired;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: LanguageManager(),
      builder: (context, _) {
        final currentLanguage = LanguageManager().currentLanguage;
        final loc = AppLocalizations(currentLanguage);

        Widget initialScreen;
        if (widget.isFirstLaunch) {
          initialScreen = const FirstLaunchScreen();
        } else if (!_isAuthenticated) {
          initialScreen = BiometricLockScreen(
            onUnlocked: () => setState(() => _isAuthenticated = true),
          );
        } else {
          initialScreen = const MainNavigationScreen();
        }

        return MaterialApp(
          title: loc.appName,
          theme: AppTheme.lightTheme,
          home: initialScreen,
          debugShowCheckedModeBanner: false,
        );
      },
    );
  }
}