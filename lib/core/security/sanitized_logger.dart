import 'package:flutter/foundation.dart';

class SanitizedLogger {
  static final RegExp _phoneRegex = RegExp(r'\b\d{10,12}\b');
  static final RegExp _emailRegex = RegExp(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b');
  static final RegExp _phiPatternRegex = RegExp(r'\b(Alex Rivera|John Doe|Jane Doe|\d{3}-\d{2}-\d{4})\b', caseSensitive: false);

  static String sanitize(String message) {
    var clean = message.replaceAll(_phoneRegex, '[REDACTED_PHONE]');
    clean = clean.replaceAll(_emailRegex, '[REDACTED_EMAIL]');
    clean = clean.replaceAll(_phiPatternRegex, '[REDACTED_PHI]');
    return clean;
  }

  static void info(String tag, String message) {
    if (kDebugMode) {
      debugPrint('[INFO][$tag] ${sanitize(message)}');
    }
  }

  static void warning(String tag, String message) {
    if (kDebugMode) {
      debugPrint('[WARN][$tag] ${sanitize(message)}');
    }
  }

  static void error(String tag, String message, [Object? error, StackTrace? stack]) {
    if (kDebugMode) {
      debugPrint('[ERROR][$tag] ${sanitize(message)}');
      if (error != null) {
        debugPrint('  Error: $error');
      }
      if (stack != null) {
        debugPrint('  Stack: $stack');
      }
    }
  }
}
