# CareBond AI — Offline-First Android Health & Recovery Companion

CareBond AI is a production-oriented, offline-first personal health and recovery companion built with Flutter for Android. It learns the user's personal health context over time and helps them understand, remember, monitor, and communicate their health safely.

---

## 1. Base Architecture Contract

CareBond AI strictly adheres to the fixed core architecture contract:

```text
                         CAREBOND AI
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
          ▼                                       ▼
       MODE A                                   MODE B
   EVERYDAY HEALTH                           RECOVERY
          │                                       │
          └───────────────────┬───────────────────┘
                              ▼
                    SHARED HEALTH CORE
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
      VOICE                 DOCUMENT              SENSORS
        │                     │                     │
       STT                   OCR              Signal Processing
        │                     │                     │
      Intent              Medical NER        Personal Baseline
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                       HEALTH MEMORY
                              │
                              ▼
                  PERSONAL HEALTH CONTEXT
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   Medical KB          Medication Safety       Recovery Engine
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    MEDICAL REASONING
                              │
                    ┌─────────┴─────────┐
                    │                   │
              LIGHT MODEL          MEDGEMMA 4B
              4GB PROFILE          6GB+ PROFILE
                    │                   │
                    └─────────┬─────────┘
                              ▼
                       SAFETY VALIDATION
                              │
                              ▼
                   HEALTH CONTEXT ENGINE
                              │
                              ▼
                    DOCTOR HANDOFF ENGINE
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
            Patient        Specialist       Doctor
            Summary         Summary         Summary
                              │
                              ▼
                           TTS / UI
```

---

## 2. Primary Modes

### Mode A — Everyday Health Companion
- **Voice-Driven Health Querying**: Offline intent recognition & speech synthesis.
- **Prescription & Document Parsing**: PP-OCR and Medical NER with mandatory user confirmation.
- **Medication Management**: Dosage, frequency, adherence, and cross-drug allergy contraindication checking.
- **Longitudinal Health Timeline**: Persistent tracking of conditions, allergies, lab trends, and procedures.

### Mode B — Recovery Companion
- **Discharge Protocol Ingestion**: Structured extraction of wound care, red-flag symptoms, and recovery plans.
- **Daily Adaptive Voice Check-ins**: Longitudinal check-in history drives dynamic, context-aware follow-up questions.
- **Deterministic Personal Baseline Engine**: Robust Exponentially Weighted Moving Average (EWMA), Median Absolute Deviation (MAD), and Cumulative Sum (CUSUM) persistence filters to avoid noisy false alarms.
- **Explainable Anomaly Alerts**: Alerts provide clinical rationale (e.g. *"Mobility is 45% below your 7-day personal baseline for 2 consecutive days"*) rather than speculative diagnoses.

---

## 3. Shared Health Core & Storage Architecture

### Structured Health Memory
Unlike raw chat-history approaches, CareBond AI maintains structured relational tables with explicit **provenance**:
- `DOCUMENTED`: Extracted from signed discharge summaries, lab reports, or doctor prescriptions.
- `USER_REPORTED`: Provided directly by the patient or caregiver during check-ins.
- `SYSTEM_DETECTED`: Derived via continuous sensor telemetry or baseline analytics.
- `REQUIRES_REVIEW`: OCR or NLP extractions awaiting user verification before activation.
- `URGENT_ESCALATION`: Red-flag deviations requiring immediate medical attention.

### Dedicated Storage Segregation
```text
CareBond/
├── models/
│   ├── voice/              (Silero VAD, Offline STT Whisper/Vosk, Piper TTS)
│   ├── ocr/                (PP-OCR detection & recognition)
│   ├── medical_ner/        (OpenMed Pharma & Anatomy NER)
│   ├── medical_reasoning/  (Lightweight 4GB & MedGemma 4B GGUF)
│   └── tts/                (Indic & English neural voices)
├── knowledge/              (Verified offline medical knowledge base)
├── safety/                 (Deterministic drug interaction & emergency rules)
├── database/               (SQLite structured health database with FTS5)
├── medical_documents/      (Encrypted scans, PDFs, and thumbnails)
├── cache/                  (Temporary OCR buffers, safely pruned)
└── metadata/               (Resource registry & installation manifests)
```

---

## 4. Hardware Profiles & Dynamic Resource Management

CareBond supports dynamic hardware profiles:
- **Essential Profile (4GB RAM devices)**: Lightweight quantized models (~1.2 GB RAM footprint), aggressive model unloading, serial execution.
- **Advanced Profile (6GB+ RAM devices)**: MedGemma 4B ONNX/GGUF model (~3.8 GB RAM footprint) for rich clinical explanations and complex multi-morbid summaries.
- **Automatic Detection**: Dynamic RAM scanning on app startup.

### 17 Modular Offline Model Packages
1. **Silero VAD (v4.0)** — Offline Voice Activity Detection (2.5 MB)
2. **Offline STT Base (Whisper-Tiny)** — English Voice Recognition (75 MB)
3. **Offline STT Indic Multi** — Hindi, Telugu, Tamil, Kannada, Marathi (145 MB)
4. **PP-OCRv4 Medical Engine** — Document text recognition (18 MB)
5. **OpenMed Pharma NER** — Medication entity extraction (42 MB)
6. **OpenMed Clinical Anatomy NER** — Lab & diagnosis entity recognition (48 MB)
7. **CareBond Light Medical Model (Q4)** — 4GB device reasoning (1,250 MB)
8. **MedGemma 4B Clinical Model (Q4_K_M)** — 6GB+ device reasoning (2,450 MB)
9. **Piper TTS High-Fidelity English** — Offline neural voice (28 MB)
10. **Piper TTS Indic Hindi** — Neural voice synthesis (32 MB)
11. **Piper TTS Indic Telugu** — Neural voice synthesis (30 MB)
12. **Piper TTS Indic Tamil** — Neural voice synthesis (31 MB)
13. **Piper TTS Indic Kannada** — Neural voice synthesis (29 MB)
14. **Piper TTS Indic Marathi** — Neural voice synthesis (30 MB)
15. **Offline Drug Safety Database** — 14,000+ interactions & contraindications (14 MB)
16. **Offline Medical Knowledge Base** — 8,500+ conditions & lab ranges (22 MB)
17. **Recovery Baseline Analytics Engine** — Sensor calibration & EWMA rules (1.2 MB)

---

## 5. Medical Safety & LLM Boundaries

Emergency handling and medication safety are strictly **deterministic**:
1. **Intent & Medical Scope Gatekeeper**: Rejects non-health prompts (coding, math, creative writing) before touching reasoning models.
2. **Deterministic Emergency Rulebook**: Pre-LLM pattern matching flags critical red flags (severe chest pain radiating to arm, anaphylaxis, acute stroke symptoms, severe dyspnea) and triggers immediate emergency protocols.
3. **Allergy & Contraindication Validator**: Intercepts extracted or proposed medications against patient allergies (e.g. Penicillin cross-reactivity with Amoxicillin/Augmentin) deterministically.
4. **LLM Boundary Rule**: The local LLM never prescribes, never alters dosages, and never overrides doctor instructions.

---

## 6. Real-World Doctor Handoff Problem

When a patient with existing chronic conditions (e.g., Hypertension, Type 2 Diabetes, Penicillin Allergy) visits a new doctor for an unrelated issue, CareBond synthesizes a concise, provenance-aware **Clinical Dossier**:
- **Current Conditions & Diagnoses** (with onset date and verification level)
- **Active Medications** (exact dosage, frequency, and adherence score)
- **Documented Allergies & Severity**
- **Recent Lab Trends & Out-of-Range Flags**
- **Recent Post-Surgical Recovery Status**
- **Clinician Review Items & Safety Warnings**

Supported formats:
- *General Physician Summary*
- *Specialist Consultation Summary* (Cardiology, Endocrinology, Nephrology, Neurology, Orthopedics, Gastroenterology)
- *Routine Follow-up Summary*
- *Post-Surgical Recovery Review*
- *Second Opinion Dossier*
- *Urgent Consultation Handoff*

---

## 7. Zero-Cloud Offline Guarantee

CareBond AI operates completely without an internet connection:
- Tested and verified under **Airplane Mode**.
- Zero mandatory cloud dependencies.
- Zero telemetry transmitting Protected Health Information (PHI).
- Sanitized logging filters prevent patient names, medications, and conditions from ever entering debug logs.

---

## 8. Verification & Test Suite

All unit and integration tests are verified:
```bash
flutter analyze  # 0 issues found
flutter test     # 8/8 test suites passing cleanly
```