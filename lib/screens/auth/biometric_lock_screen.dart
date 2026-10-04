import 'package:flutter/material.dart';
import '../../core/config/app_theme.dart';
import '../../core/security/local_security.dart';

class BiometricLockScreen extends StatefulWidget {
  final VoidCallback onUnlocked;

  const BiometricLockScreen({super.key, required this.onUnlocked});

  @override
  State<BiometricLockScreen> createState() => _BiometricLockScreenState();
}

class _BiometricLockScreenState extends State<BiometricLockScreen> {
  bool _isAuthenticating = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _triggerAuthentication();
  }

  Future<void> _triggerAuthentication() async {
    setState(() {
      _isAuthenticating = true;
      _errorMessage = '';
    });

    final success = await LocalSecurityManager.authenticate();
    if (mounted) {
      setState(() => _isAuthenticating = false);
      if (success) {
        widget.onUnlocked();
      } else {
        setState(() {
          _errorMessage = 'Authentication failed. Please use your device biometrics or PIN.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  color: AppTheme.primaryLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.lock_outline, size: 48, color: AppTheme.primaryTeal),
              ),
              const SizedBox(height: 24),
              const Text(
                'CareBond AI Locked',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
              ),
              const SizedBox(height: 8),
              const Text(
                'Protected by on-device biometric security.\nYour health records are stored encrypted.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 32),

              if (_errorMessage.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _errorMessage,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              ElevatedButton.icon(
                onPressed: _isAuthenticating ? null : _triggerAuthentication,
                icon: const Icon(Icons.fingerprint, size: 22),
                label: Text(_isAuthenticating ? 'Authenticating...' : 'Unlock with Biometrics / PIN'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryTeal,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const Spacer(),
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shield_outlined, size: 14, color: Colors.grey),
                  SizedBox(width: 6),
                  Text('Zero-Cloud Offline Encryption', style: TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
