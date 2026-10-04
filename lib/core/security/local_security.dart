import 'package:shared_preferences/shared_preferences.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';

class LocalSecurityManager {
  static const String _prefPinHashKey = 'carebond_pin_hash';
  static const String _prefBiometricEnabledKey = 'carebond_biometric_enabled';
  static const String _prefAppLockedKey = 'carebond_app_locked';

  static Future<bool> isPinConfigured() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey(_prefPinHashKey);
  }

  static Future<bool> setPin(String pin) async {
    final prefs = await SharedPreferences.getInstance();
    final hash = sha256.convert(utf8.encode('carebond_salt_$pin')).toString();
    return await prefs.setString(_prefPinHashKey, hash);
  }

  static Future<bool> verifyPin(String pin) async {
    final prefs = await SharedPreferences.getInstance();
    final savedHash = prefs.getString(_prefPinHashKey);
    if (savedHash == null) return true; // Not configured yet
    final hash = sha256.convert(utf8.encode('carebond_salt_$pin')).toString();
    return savedHash == hash;
  }

  static Future<bool> isBiometricEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_prefBiometricEnabledKey) ?? false;
  }

  static Future<void> setBiometricEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefBiometricEnabledKey, enabled);
  }

  static Future<bool> isAppLocked() async {
    final isConfigured = await isPinConfigured();
    if (!isConfigured) return false;
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_prefAppLockedKey) ?? true;
  }

  static Future<void> setAppLocked(bool locked) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefAppLockedKey, locked);
  }

  static Future<bool> authenticate() async {
    // Simulated local biometric / PIN check on Android device
    await Future.delayed(const Duration(milliseconds: 600));
    await setAppLocked(false);
    return true;
  }
}
