import 'dart:async';
import '../../core/resources/resource_manager.dart';
import '../../models/model_package.dart';

class SpeechRecognitionResult {
  final String text;
  final double confidence;
  final String language;
  final bool isFinal;
  final bool isResourceMissing;

  SpeechRecognitionResult({
    required this.text,
    this.confidence = 0.95,
    required this.language,
    this.isFinal = true,
    this.isResourceMissing = false,
  });
}

class SpeechRecognitionService {
  static final SpeechRecognitionService _instance = SpeechRecognitionService._internal();
  factory SpeechRecognitionService() => _instance;
  SpeechRecognitionService._internal();

  final ResourceManager _resourceManager = ResourceManager();
  bool _isListening = false;
  String _currentLanguage = 'en';

  bool get isListening => _isListening;
  String get currentLanguage => _currentLanguage;

  bool isLanguageAvailable(String langCode) {
    if (langCode == 'en') return true;
    return _resourceManager.isFeatureReady(ModelFeatureCategory.stt, language: langCode);
  }

  Future<SpeechRecognitionResult> transcribeAudio({
    required String audioPathOrSimulatedText,
    String language = 'en',
  }) async {
    _isListening = true;
    _currentLanguage = language;

    final ready = isLanguageAvailable(language);
    if (!ready && language != 'en') {
      _isListening = false;
      return SpeechRecognitionResult(
        text: 'Offline voice resources for $language are not installed. Please install them in the Resource Manager or switch to English.',
        confidence: 0.0,
        language: language,
        isFinal: true,
        isResourceMissing: true,
      );
    }

    await Future.delayed(const Duration(milliseconds: 300));
    _isListening = false;

    return SpeechRecognitionResult(
      text: audioPathOrSimulatedText,
      confidence: 0.96,
      language: language,
      isFinal: true,
      isResourceMissing: false,
    );
  }
}
