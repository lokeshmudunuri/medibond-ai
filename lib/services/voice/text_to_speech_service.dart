import 'dart:async';
import '../../core/resources/resource_manager.dart';
import '../../models/model_package.dart';

class TextToSpeechService {
  static final TextToSpeechService _instance = TextToSpeechService._internal();
  factory TextToSpeechService() => _instance;
  TextToSpeechService._internal();

  final ResourceManager _resourceManager = ResourceManager();
  bool _isSpeaking = false;
  final StreamController<bool> _speakingStateController = StreamController<bool>.broadcast();

  Stream<bool> get speakingStateStream => _speakingStateController.stream;
  bool get isSpeaking => _isSpeaking;

  bool isTtsLanguageReady(String langCode) {
    return _resourceManager.isFeatureReady(ModelFeatureCategory.tts, language: langCode);
  }

  Future<void> speak(String text, {String language = 'en'}) async {
    _isSpeaking = true;
    _speakingStateController.add(true);

    // Simulate speech generation duration based on word count
    final wordCount = text.split(' ').length;
    final speechDurationMs = (wordCount * 120).clamp(600, 3500);

    await Future.delayed(Duration(milliseconds: speechDurationMs));

    _isSpeaking = false;
    _speakingStateController.add(false);
  }

  Future<void> stop() async {
    _isSpeaking = false;
    _speakingStateController.add(false);
  }

  void dispose() {
    _speakingStateController.close();
  }
}
