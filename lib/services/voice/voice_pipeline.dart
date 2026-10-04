import 'dart:async';
import '../../core/resources/resource_manager.dart';
import '../../core/security/sanitized_logger.dart';
import '../../models/model_package.dart';
import '../medical_reasoning/medical_reasoning_engine.dart';
import 'speech_recognition_service.dart';
import 'text_to_speech_service.dart';

enum VoiceSessionState {
  idle,
  listening,
  vadTriggered,
  processingStt,
  reasoning,
  speaking,
  error,
}

class VoicePipelineResponse {
  final String recognizedTranscript;
  final String responseText;
  final String activeModel;
  final bool isEmergency;

  VoicePipelineResponse({
    required this.recognizedTranscript,
    required this.responseText,
    required this.activeModel,
    this.isEmergency = false,
  });
}

class VoicePipeline {
  static const String _tag = 'VoicePipeline';
  static final VoicePipeline _instance = VoicePipeline._internal();
  factory VoicePipeline() => _instance;
  VoicePipeline._internal();

  final SpeechRecognitionService _stt = SpeechRecognitionService();
  final TextToSpeechService _tts = TextToSpeechService();
  final MedicalReasoningEngine _reasoning = MedicalReasoningEngine();
  final ResourceManager _resourceManager = ResourceManager();

  VoiceSessionState _state = VoiceSessionState.idle;
  final StreamController<VoiceSessionState> _stateController = StreamController<VoiceSessionState>.broadcast();

  Stream<VoiceSessionState> get stateStream => _stateController.stream;
  VoiceSessionState get currentState => _state;

  void _setState(VoiceSessionState newState) {
    _state = newState;
    if (!_stateController.isClosed) {
      _stateController.add(newState);
    }
  }

  Future<VoicePipelineResponse> executeVoiceInteraction({
    required String spokenQuery,
    String language = 'en',
    bool playSpeech = true,
  }) async {
    try {
      // 1. Check VAD and STT resource status
      final isVadReady = _resourceManager.isFeatureReady(ModelFeatureCategory.vad);
      final isSttReady = _stt.isLanguageAvailable(language);

      SanitizedLogger.info(_tag, 'Starting voice interaction. VAD: $isVadReady, STT: $isSttReady, Lang: $language');

      // 2. VAD Detection
      _setState(VoiceSessionState.vadTriggered);
      await Future.delayed(const Duration(milliseconds: 150));

      // 3. Speech to Text Transcription
      _setState(VoiceSessionState.processingStt);
      final sttResult = await _stt.transcribeAudio(
        audioPathOrSimulatedText: spokenQuery,
        language: language,
      );

      // 4. Clinical Medical Reasoning & Scope / Emergency Checks
      _setState(VoiceSessionState.reasoning);
      final reasoningResponse = await _reasoning.processQuery(query: sttResult.text);

      // 5. Offline Speech Output
      if (playSpeech) {
        _setState(VoiceSessionState.speaking);
        await _tts.speak(reasoningResponse.responseText, language: language);
      }

      _setState(VoiceSessionState.idle);

      return VoicePipelineResponse(
        recognizedTranscript: sttResult.text,
        responseText: reasoningResponse.responseText,
        activeModel: reasoningResponse.activeModelUsed,
        isEmergency: reasoningResponse.isEmergencyTriggered,
      );
    } catch (e, st) {
      _setState(VoiceSessionState.error);
      SanitizedLogger.error(_tag, 'Voice interaction error', e, st);
      return VoicePipelineResponse(
        recognizedTranscript: spokenQuery,
        responseText: 'An error occurred during voice processing. Please try again.',
        activeModel: 'Offline Pipeline Error Fallback',
      );
    }
  }

  void cancel() {
    _tts.stop();
    _setState(VoiceSessionState.idle);
  }

  void dispose() {
    _stateController.close();
    _tts.dispose();
  }
}
