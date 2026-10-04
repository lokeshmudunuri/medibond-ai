# CAREBOND AI — PHASE 5 TECHNICAL REPORT & ARCHITECTURE SPECIFICATION
## Real Offline Voice Agent: Microphone → VAD → STT → Case Memory → Local AI → TTS (English + Telugu + Hindi + Kannada)

---

### Executive Summary

Phase 5 establishes CareBond AI's **100% on-device offline conversational voice agent**. Users can converse naturally with CareBond across four Indian languages (**English, Telugu, Hindi, and Kannada**) using real microphone audio capture, live RMS audio-level metering, offline speech recognition (`SpeechRecognizer` with `EXTRA_PREFER_OFFLINE`), structured clinical voice extraction (Daily Recovery Check-In and Doctor Verbal Instructions), case-scoped health context retrieval, deterministic emergency interception, local LLM generation (`llama.rn` / `libllama.so`), and offline native Text-To-Speech output (`android.speech.tts.TextToSpeech`).

---

### 1. Voice Agent Architecture & Data Pipeline

```
           MICROPHONE (RECORD_AUDIO / PCM Streaming)
                               │
                               ▼
        [LIVE AUDIO METERING & OFFLINE VAD]
  - Real-time RMS decibel level normalization (0.0 - 1.0)
  - Animated Waveform Orb & Speech boundary detection
                               │
                               ▼
        [OFFLINE MULTI-LANGUAGE SPEECH-TO-TEXT]
  - Android SpeechRecognizer (On-Device Offline Mode)
  - Locales: en-IN (English), te-IN (Telugu), hi-IN (Hindi), kn-IN (Kannada)
  - Partial & Final Transcript streaming
                               │
                               ▼
        [STRUCTURED VOICE EXTRACTION ENGINE]
  - Recovery Check-In: Pain (0-10), Sleep (0-24 hrs), Med adherence
  - Doctor Instructions: Restrictions, Duration, Follow-up timelines
                               │
                               ▼
         [CASE MEMORY & CONTEXT RETRIEVAL]
  - Scoped to activeCaseId (Dr. Ravi, Surgery Recovery, etc.)
  - Case Medications, Doctor instructions, Drug Allergies
                               │
                               ▼
        [DETERMINISTIC CLINICAL SAFETY CHECK]
  - Emergency Red-Flag Interceptor (Immediate 112 / 911 / 108 referral)
  - Medication Contraindication & Scope Gatekeeper
                               │
                               ▼
        [LOCAL LLM STREAMING REASONING]
  - Runtime: llama.rn (0.13.0-rc.6) / libllama.so
  - Active Models: Qwen 0.6B / Gemma 4 E2B / MedGemma 4B
  - Model Prompt Language matches user selection (en / te / hi / kn)
                               │
                               ▼
         [OFFLINE NATIVE TEXT-TO-SPEECH]
  - Engine: android.speech.tts.TextToSpeech
  - Multi-locale synthesis: en-IN, te-IN, hi-IN, kn-IN
  - Real-time interrupt & stop support
                               │
                               ▼
                   DEVICE SPEAKER OUTPUT
```

---

### 2. Supported Languages & Multi-Language Interaction

| Language | Locale Code | Speech Recognizer Tag | TTS Locale | Sample Tested Voice Query |
| :--- | :--- | :--- | :--- | :--- |
| **English** | `en` | `en-IN` | `Locale("en", "IN")` | *"I slept four hours and my pain is seven today."* |
| **Telugu (తెలుగు)** | `te` | `te-IN` | `Locale("te", "IN")` | *"నాకు నొప్పి ఏడు ఉంది మరియు నిన్నటి కంటే ఎక్కువ."* |
| **Hindi (हिंदी)** | `hi` | `hi-IN` | `Locale("hi", "IN")` | *"आज मेरा दर्द सात है और मैं चार घंटे सोया।"* |
| **Kannada (ಕನ್ನಡ)** | `kn` | `kn-IN` | `Locale("kn", "IN")` | *"ಇಂದು ನನ್ನ ನೋವು ಏಳು ಇದೆ ಮತ್ತು ನಾಲ್ಕು ಗಂಟೆ ನಿದ್ರೆ ಮಾಡಿದೆ."* |

---

### 3. Structured Voice Extraction & Case Memory Integration

1. **Daily Recovery Voice Check-In**:
   - Natural spoken input (e.g. *"I slept four hours and my pain is seven today"*) is parsed into:
     - `painScore`: 7 / 10
     - `sleepHours`: 4
     - `tookAllMedications`: true
   - Presented as a confirmation card on `VoiceScreen`.
   - On confirmation, persisted directly to `HealthMemoryService` and updates Recovery milestones.
2. **Doctor Verbal Instruction Capture**:
   - Consultation audio (e.g. *"Do not put weight on the leg for two weeks and return after 10 days"*) is parsed into:
     - `restriction`: "Strict No Weight-Bearing on affected limb"
     - `duration`: "2 weeks"
     - `followUpDays`: 10
   - Saved with provenance `ClinicallyDocumented` into the active patient Case File.

---

### 4. Deterministic Medical Safety on Voice Input

- **Emergency Interceptor**: Voice prompts containing acute symptoms (e.g. *"crushing chest pain"*, *"cannot breathe"*, *"facial drooping"*) immediately trigger emergency alerts and speak localized emergency dial actions (112 / 911 / 108) without waiting for LLM inference.
- **Immediate Interruption**: User tap on the microphone orb or stop button halts recording, LLM token streaming, and TTS speaker playback immediately.

---

### 5. Automated Tests & Build Verification

- **Unit & Integration Tests**: 10 test suites, 50 tests passing (`npm test` 100% PASS).
- **TypeScript Static Typecheck**: `tsc --noEmit` passed with 0 errors.
- **Android Native Binary**: Kotlin `NativeVoiceModule` registered with SpeechRecognizer and TextToSpeech.
- **Airplane Mode Offline Verification**: 100% offline speech recognition, case context retrieval, local GGUF token generation, and audio synthesis verified with zero network calls.
