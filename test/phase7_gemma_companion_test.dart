import 'package:flutter_test/flutter_test.dart';
import 'package:carewatch_ai_recovery_watch/core/resources/resource_manager.dart';
import 'package:carewatch_ai_recovery_watch/core/resources/resource_registry.dart';
import 'package:carewatch_ai_recovery_watch/models/chat_message.dart';
import 'package:carewatch_ai_recovery_watch/models/model_package.dart';
import 'package:carewatch_ai_recovery_watch/services/health_memory/health_memory_service.dart';
import 'package:carewatch_ai_recovery_watch/services/medical_reasoning/gemma_inference_engine.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 7: Gemma 4 E2B On-Device Companion Model Tests', () {
    test('GemmaInferenceEngine uses Gemma 4 E2B as default companion model', () {
      final engine = GemmaInferenceEngine();
      expect(engine.activeModelName.contains('Gemma 4 E2B'), isTrue);
    });

    test('GemmaInferenceEngine yields tokens via streaming inference', () async {
      final engine = GemmaInferenceEngine();
      final stream = engine.streamInference(prompt: 'Hello CareBond');

      final tokens = <String>[];
      await for (var token in stream) {
        tokens.add(token);
      }

      expect(tokens.isNotEmpty, isTrue);
      final completeText = tokens.join('');
      expect(completeText.contains('CareBond AI'), isTrue);
    });

    test('GemmaInferenceEngine self-test generates real tokens and measures latency', () async {
      final engine = GemmaInferenceEngine();
      final metrics = await engine.runSelfTest();

      expect(metrics.modelName.contains('Gemma 4 E2B'), isTrue);
      expect(metrics.generatedTokens > 0, isTrue);
      expect(metrics.tokensPerSecond > 0, isTrue);
      expect(metrics.loadTimeMs > 0, isTrue);
      expect(metrics.runtime.contains('LiteRT-LM'), isTrue);
    });

    test('GemmaInferenceEngine extracts structured check-in actions from natural language input', () async {
      final engine = GemmaInferenceEngine();
      final result = await engine.processChatMessage(
        userMessage: 'I slept for 4 hours and my pain is 7.',
      );

      expect(result.suggestedActionType, 'log_checkin');
      expect(result.suggestedActionPayload?.contains('pain=7'), isTrue);
      expect(result.suggestedActionPayload?.contains('sleep=4.0'), isTrue);
    });
  });

  group('Phase 7: Conversational Memory & Persistence Tests', () {
    test('ChatMessageEntity persists to Health Memory and retrieves chronologically', () async {
      final memory = HealthMemoryService();
      await memory.clearChatHistory();

      final msg1 = ChatMessageEntity(
        id: 'msg_1',
        role: 'user',
        content: 'What is Telmisartan for?',
        timestamp: DateTime(2026, 10, 3, 10, 0),
      );
      final msg2 = ChatMessageEntity(
        id: 'msg_2',
        role: 'assistant',
        content: 'Telmisartan is for blood pressure management.',
        timestamp: DateTime(2026, 10, 3, 10, 1),
      );

      await memory.saveChatMessage(msg1);
      await memory.saveChatMessage(msg2);

      final history = await memory.getChatMessages();
      expect(history.length, 2);
      expect(history.first.content, 'What is Telmisartan for?');
      expect(history.last.isAssistant, isTrue);

      await memory.clearChatHistory();
      final cleared = await memory.getChatMessages();
      expect(cleared.isEmpty, isTrue);
    });
  });

  group('Phase 7: Multilingual Companion Response Tests', () {
    test('GemmaInferenceEngine produces localized responses in Hindi, Telugu, and English', () async {
      final engine = GemmaInferenceEngine();

      final responseHi = await engine.processChatMessage(
        userMessage: 'I have pain level 6 and slept 5 hours.',
        languageCode: 'hi',
      );
      expect(responseHi.content.contains('चेक-इन') || responseHi.content.contains('रिकवरी'), isTrue);

      final responseTe = await engine.processChatMessage(
        userMessage: 'I have pain level 6 and slept 5 hours.',
        languageCode: 'te',
      );
      expect(responseTe.content.contains('నమోదు') || responseTe.content.contains('నొప్పి'), isTrue);
    });
  });

  group('Phase 7: Resource Catalog & Model Specifications Tests', () {
    test('Catalog contains Gemma 4 E2B LiteRT-LM (2.59 GB) and MedGemma 4B Gated package', () {
      final models = ResourceRegistry.getCatalog();

      final gemma = models.firstWhere((m) => m.modelId == 'gemma_4_e2b_litertlm');
      expect(gemma.feature, ModelFeatureCategory.gemmaCompanion);
      expect(gemma.sizeBytes > 2000000000, isTrue); // ~2.59 GB
      expect(gemma.format.contains('LiteRT-LM'), isTrue);

      final medgemma = models.firstWhere((m) => m.modelId == 'medgemma_4b_litertlm');
      expect(medgemma.feature, ModelFeatureCategory.medicalReasoningMedGemma);
      expect(medgemma.license.contains('Health AI Developer Foundations'), isTrue);
    });
  });
}
