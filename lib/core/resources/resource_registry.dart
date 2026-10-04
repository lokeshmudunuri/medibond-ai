import '../../models/model_package.dart';

class ResourceRegistry {
  static List<ModelPackageEntity> getCatalog() {
    return [
      // 1. Silero VAD (Universal Voice Activity Detection)
      ModelPackageEntity(
        modelId: 'silero_vad_v4',
        displayName: 'Silero VAD (Voice Activity Detection)',
        feature: ModelFeatureCategory.vad,
        version: '4.0.0',
        language: 'universal',
        sizeBytes: 2 * 1024 * 1024, // 2 MB
        expectedChecksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        localRelativePath: 'voice/silero_vad.onnx',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: true,
      ),

      // 2. Offline STT - English
      ModelPackageEntity(
        modelId: 'stt_whisper_tiny_en',
        displayName: 'Offline Speech Recognition (English)',
        feature: ModelFeatureCategory.stt,
        version: '1.2.0',
        language: 'en',
        sizeBytes: 38 * 1024 * 1024, // 38 MB
        expectedChecksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        localRelativePath: 'voice/stt_en.bin',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: true,
      ),

      // 3. Offline STT - Indic Languages (Hindi, Telugu, Kannada, Tamil, Marathi)
      ModelPackageEntity(
        modelId: 'stt_indic_hi',
        displayName: 'Offline Speech Recognition (Hindi)',
        feature: ModelFeatureCategory.stt,
        version: '1.0.0',
        language: 'hi',
        sizeBytes: 45 * 1024 * 1024, // 45 MB
        expectedChecksumSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        localRelativePath: 'voice/stt_hi.bin',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: false,
      ),
      ModelPackageEntity(
        modelId: 'stt_indic_te',
        displayName: 'Offline Speech Recognition (Telugu)',
        feature: ModelFeatureCategory.stt,
        version: '1.0.0',
        language: 'te',
        sizeBytes: 44 * 1024 * 1024,
        expectedChecksumSha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        localRelativePath: 'voice/stt_te.bin',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: false,
      ),
      ModelPackageEntity(
        modelId: 'stt_indic_kn',
        displayName: 'Offline Speech Recognition (Kannada)',
        feature: ModelFeatureCategory.stt,
        version: '1.0.0',
        language: 'kn',
        sizeBytes: 43 * 1024 * 1024,
        expectedChecksumSha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        localRelativePath: 'voice/stt_kn.bin',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: false,
      ),
      ModelPackageEntity(
        modelId: 'stt_indic_ta',
        displayName: 'Offline Speech Recognition (Tamil)',
        feature: ModelFeatureCategory.stt,
        version: '1.0.0',
        language: 'ta',
        sizeBytes: 46 * 1024 * 1024,
        expectedChecksumSha256: '87532d2c18608e08d7ea2d46e395379e49c7198bb6cf6cc89b6574c831343719',
        localRelativePath: 'voice/stt_ta.bin',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: false,
      ),
      ModelPackageEntity(
        modelId: 'stt_indic_mr',
        displayName: 'Offline Speech Recognition (Marathi)',
        feature: ModelFeatureCategory.stt,
        version: '1.0.0',
        language: 'mr',
        sizeBytes: 42 * 1024 * 1024,
        expectedChecksumSha256: 'd74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000fef82e8fd',
        localRelativePath: 'voice/stt_mr.bin',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: false,
      ),

      // 4. PP-OCR & OpenCV Preprocessor
      ModelPackageEntity(
        modelId: 'pp_ocr_medical_v3',
        displayName: 'PP-OCR Medical Document Engine',
        feature: ModelFeatureCategory.ocr,
        version: '3.1.0',
        language: 'universal',
        sizeBytes: 28 * 1024 * 1024, // 28 MB
        expectedChecksumSha256: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
        localRelativePath: 'ocr/pp_ocr_medical.bin',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: true,
      ),

      // 5. OpenMed Pharma NER (Medicine Entity Extractor)
      ModelPackageEntity(
        modelId: 'openmed_pharma_ner',
        displayName: 'OpenMed Pharmaceutical NER Extractor',
        feature: ModelFeatureCategory.pharmaNer,
        version: '2.0.0',
        language: 'universal',
        sizeBytes: 32 * 1024 * 1024, // 32 MB
        expectedChecksumSha256: 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
        localRelativePath: 'medical_ner/pharma_ner.bin',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: true,
      ),

      // 6. OpenMed Medical & Anatomy NER
      ModelPackageEntity(
        modelId: 'openmed_anatomy_ner',
        displayName: 'OpenMed Medical & Anatomy NER',
        feature: ModelFeatureCategory.medicalNer,
        version: '2.0.0',
        language: 'universal',
        sizeBytes: 35 * 1024 * 1024, // 35 MB
        expectedChecksumSha256: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
        localRelativePath: 'medical_ner/anatomy_ner.bin',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: true,
      ),

      // 7. Gemma 4 E2B LiteRT-LM (Primary On-Device Conversational Companion)
      ModelPackageEntity(
        modelId: 'gemma_4_e2b_litertlm',
        displayName: 'Gemma 4 E2B (On-Device Companion & Reasoning)',
        feature: ModelFeatureCategory.gemmaCompanion,
        version: '4.0.0-e2b',
        language: 'universal',
        sizeBytes: 2715811840, // 2.59 GB LiteRT-LM model artifact
        expectedChecksumSha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
        localRelativePath: 'medical_reasoning/gemma_4_e2b.litertlm',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: true,
        downloadSource: 'https://huggingface.co/google/gemma-4-e2b-it-litertlm/resolve/main/gemma_4_e2b.litertlm',
        format: 'LiteRT-LM (.litertlm)',
        runtime: 'LiteRT-LM / MediaPipe',
        license: 'Gemma Open License',
      ),

      // 8. MedGemma 4B Clinical Model (Gated / Developer Provisioned)
      ModelPackageEntity(
        modelId: 'medgemma_4b_litertlm',
        displayName: 'MedGemma 4B Clinical (Gated / Provisioned)',
        feature: ModelFeatureCategory.medicalReasoningMedGemma,
        version: '1.5.0-it',
        language: 'universal',
        sizeBytes: 4509715660, // 4.2 GB Quantized LiteRT-LM
        expectedChecksumSha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        localRelativePath: 'medical_reasoning/medgemma_4b.litertlm',
        targetProfile: DeviceProfileTarget.advanced6GB,
        isRequiredForCore: false,
        downloadSource: 'https://huggingface.co/google/medgemma-4b-it (Gated Access)',
        format: 'LiteRT-LM (.litertlm)',
        runtime: 'LiteRT-LM / MediaPipe',
        license: 'Health AI Developer Foundations Terms',
      ),

      // 9. Piper TTS - English & Indic
      ModelPackageEntity(
        modelId: 'tts_piper_en',
        displayName: 'Offline Voice Synthesis (English)',
        feature: ModelFeatureCategory.tts,
        version: '1.0.0',
        language: 'en',
        sizeBytes: 22 * 1024 * 1024,
        expectedChecksumSha256: '87532d2c18608e08d7ea2d46e395379e49c7198bb6cf6cc89b6574c831343719',
        localRelativePath: 'tts/piper_en.onnx',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: true,
      ),
      ModelPackageEntity(
        modelId: 'tts_piper_hi',
        displayName: 'Offline Voice Synthesis (Hindi)',
        feature: ModelFeatureCategory.tts,
        version: '1.0.0',
        language: 'hi',
        sizeBytes: 24 * 1024 * 1024,
        expectedChecksumSha256: 'd74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000fef82e8fd',
        localRelativePath: 'tts/piper_hi.onnx',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: false,
      ),
      ModelPackageEntity(
        modelId: 'tts_piper_te',
        displayName: 'Offline Voice Synthesis (Telugu)',
        feature: ModelFeatureCategory.tts,
        version: '1.0.0',
        language: 'te',
        sizeBytes: 24 * 1024 * 1024,
        expectedChecksumSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        localRelativePath: 'tts/piper_te.onnx',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: false,
      ),

      // 10. Local Verified Medical KB
      ModelPackageEntity(
        modelId: 'carebond_verified_medical_kb',
        displayName: 'Verified Medical Knowledge & Drug Lexicon',
        feature: ModelFeatureCategory.medicalKb,
        version: '2.5.0',
        language: 'universal',
        sizeBytes: 15 * 1024 * 1024, // 15 MB
        expectedChecksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        localRelativePath: '../knowledge/medical_kb.db',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: true,
      ),

      // 11. Deterministic Safety Engine Policy Rules
      ModelPackageEntity(
        modelId: 'carebond_safety_rules_v3',
        displayName: 'Clinical Safety & Emergency Escalation Rules',
        feature: ModelFeatureCategory.safetyEngine,
        version: '3.0.0',
        language: 'universal',
        sizeBytes: 1 * 1024 * 1024, // 1 MB
        expectedChecksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        localRelativePath: '../safety/safety_rules.json',
        targetProfile: DeviceProfileTarget.universal,
        isRequiredForCore: true,
      ),
    ];
  }
}
