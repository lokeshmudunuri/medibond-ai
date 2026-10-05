# CareBond AI — Architectural Specification

> **System Type:** Privacy-First, Offline Medical & Recovery Companion  
> **Platform:** Android (React Native 0.77.3 + Native C++ / Java / Kotlin)  
> **Inference Engine:** `llama.rn` (v0.13.0-rc.6) binding directly to native `llama.cpp`  

---

## 1. High-Level Architectural Flow (Implemented Now)

```text
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTION LAYER                   │
│      React Native (TypeScript) + React Navigation Stack      │
│  [Home / Cases]  [Document Vault]  [Chat]  [Recovery] [Models]
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI ORCHESTRATOR LAYER                     │
│               (src/ai/AIOrchestrator.ts)                    │
│  ┌───────────────────────────┐ ┌──────────────────────────┐ │
│  │  Emergency Safety Engine  │ │  Medication Safety Check │ │
│  │ (Deterministic Override)  │ │ (Allergies & Duplicates) │ │
│  └─────────────┬─────────────┘ └────────────┬─────────────┘ │
│                │                            │               │
│                ▼                            ▼               │
│  ┌───────────────────────────┐ ┌──────────────────────────┐ │
│  │    Case Context Filter    │ │       Model Router       │ │
│  │ (Strict Memory Isolation) │ │  (Task & Profile Select) │ │
│  └───────────────────────────┘ └──────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  HEALTH DATA & MEMORY CORE                  │
│  ┌───────────────────────────┐ ┌──────────────────────────┐ │
│  │       Document Vault      │ │   Continuous Recovery    │ │
│  │ (OCR, NER, Provenance)    │ │ (Check-ins, Baselines)   │ │
│  └───────────────────────────┘ └──────────────────────────┘ │
│  ┌───────────────────────────┐ ┌──────────────────────────┐ │
│  │    Doctor Handoff Engine  │ │   Storage Accounting     │ │
│  │ (Structured Clinical Sum) │ │ (Cache, Models, Data)    │ │
│  └───────────────────────────┘ └──────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  ON-DEVICE INFERENCE ENGINE                 │
│                 (src/ai/LocalLLMEngine.ts)                  │
│                     llama.rn Bridge                         │
│                            │                                │
│                     native llama.cpp                        │
│                            │                                │
│                   Quantized GGUF Models                     │
│               (MedGemma 4B / Gemma 4 / etc.)                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    ANDROID RUNTIME TARGET                   │
│      arm64-v8a (ARM NEON / NPU acceleration where avail)    │
│      Android Filesystem Sandboxing & Hardware Keystore      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems (Implemented Now)

### A. Strict Case Isolation (`useCaseStore.ts`, `HealthMemoryService.ts`)
* Medical information is never stored as an undifferentiated global dump.
* Every diagnosis, lab value, medication, and doctor instruction is tagged with an immutable `activeCaseId`.
* Switching cases flushes AI context buffers and re-binds the local prompt generator to that specific clinical episode.

### B. Two-Tier Safety Architecture (`EmergencySafetyEngine.ts`, `MedicationSafetyChecker.ts`)
* **Tier 1 (Deterministic Hard Rules):** Regex and clinical rule triggers intercept queries regarding acute chest pain, anaphylaxis, severe respiratory distress, or stroke symptoms *before* any LLM inference occurs.
* **Tier 2 (Medication Cross-Checking):** Automatically audits new prescription ingestions against known patient allergies and active medications to prevent duplicate therapies or dangerous interactions.

### C. Document Vault & Medical NER (`DocumentVaultService.ts`, `MedicalNerService.ts`)
* Ingests prescription photographs, discharge summaries, and diagnostic reports.
* Extracts drug names, dosages, frequencies, and instructions.
* Implements a **Provenance Pipeline**:
  * `[VERIFIED]`: Confirmed by user or validated against clinical formulary.
  * `[REQUIRES REVIEW]`: Ambiguous handwriting or low OCR confidence flagged for human sign-off.

### D. Recovery Tracking & Doctor Handoff (`RecoveryEngine.ts`, `DoctorHandoffEngine.ts`)
* Logs daily patient recovery metrics: pain scores (0–10), pain site, mobility/steps, wound condition, sleep quality.
* Generates exportable, standardized clinical summaries tagged with data provenance (`[DOC]`, `[USER]`, `[HEALTH]`) for quick physician review during outpatient visits.

### E. Storage Accounting & Safe Cleanup (`StorageAccountingService.ts`)
* Quantifies device memory usage across Models, Vault Records, Scanned Images, OCR Text, Recovery Records, and Cache.
* Provides safe cache pruning that eliminates temporary buffers without touching medical records or downloaded GGUF weights.

---

## 3. Implemented vs. Planned Architecture

To uphold total transparency for evaluation, here is the exact separation of current codebase capabilities:

| Component | Status | Implementation Details |
|---|---|---|
| **React Native Android Build** | ✅ **Implemented** | RN 0.77.3, Kotlin, Gradle 8, CMake, arm64-v8a native compilation. |
| **Case Isolation & Store** | ✅ **Implemented** | Zustand store with active case scoping and timeline persistence. |
| **Deterministic Emergency Engine** | ✅ **Implemented** | Red-flag medical symptom interception with local triage advice. |
| **Medication Safety Checker** | ✅ **Implemented** | Drug allergy, dosage boundary, and duplicate therapy verification. |
| **Document Vault & Provenance** | ✅ **Implemented** | Structured record storage, status flags (`CONFIRMED`, `REVIEW`). |
| **Medical NER Tokenizer** | ✅ **Implemented** | Heuristic medical entity extraction for Indian and US pharma brands. |
| **Doctor Handoff Generator** | ✅ **Implemented** | Structured clinical summary generation with provenance markers. |
| **Recovery Engine & Trends** | ✅ **Implemented** | Daily check-in logging, pain scale, 7-day trend calculations. |
| **Storage Accounting Service** | ✅ **Implemented** | Real-time byte breakdown across models, data, and safe cache purge. |
| **llama.rn / llama.cpp Bridge** | ✅ **Implemented** | Native C++ bindings compiled into Android release APK. |
| **Dynamic HF API Model Resolver** | 🚧 **In Progress** | Resolving upstream CDN changes for one-tap model downloading. |
| **Samsung Health Data SDK Bridge** | 🚧 **In Progress** | Native Java/Kotlin background bridge for Samsung wearable sync. |
| **Multilingual Offline STT/TTS** | 🚧 **In Progress** | Local Hindi & Kannada speech recognition pipeline. |
| **Vision-Language Multimodal (mmproj)** | 🚧 **In Progress** | Native llama.cpp vision projection for direct prescription image reasoning. |
