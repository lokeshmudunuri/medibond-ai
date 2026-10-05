# CareBond AI — Work In Progress & Handoff State

**Date & Time:** October 5, 2026 — 16:30 IST  
**Status:** Saved & Paused at User Request  

---

## 1. Executive Summary & Current Context

We have completed the initial forensic repository inspection, identified the exact root causes of the reported issues on the Samsung Galaxy S24 Ultra (`SM-S928B`), and cataloged the real device failure screenshots and fixtures.

### Key Evidence Cataloged
- **Model Load & 404 Failure:** In [ModelManagerScreen.tsx](file:///c:/Users/lokes/OneDrive/Documents/medicare%20ai/src/screens/ModelManagerScreen.tsx), models that are `NOT_INSTALLED` display a **"Load Model"** button instead of **"Download"**. When tapped, it immediately triggers an error modal (`Model ... is not installed locally`). Furthermore, download URLs in [HuggingFaceService.ts](file:///c:/Users/lokes/OneDrive/Documents/medicare%20ai/src/services/HuggingFaceService.ts) contain static/stale file paths leading to HTTP 404.
- **Prescription Parsing Failure:** User physical device screenshot (`WhatsApp Image 2026-10-04 at 5.07.45 PM (2).jpeg`) explicitly circles **"Parse Document / Prescription Text"** with handwritten note **"NOT WORKING"**.
- **Physical Device State:** Samsung S24 Ultra is connected via USB, currently reporting `offline` in `adb devices` (awaiting user to accept USB debugging prompt / unlock screen upon return).

---

## 2. Priority Checklist & Action Plan (Ready to Resume)

### Priority P0: Fix Model 404 & Local Inference
1. **Dynamic Hugging Face API Resolution:**
   - Query `https://huggingface.co/api/models/{repo}` dynamically instead of hardcoding stale filenames.
   - MedGemma target: `gguf-org/medgemma-1.5-4b-it-gguf` -> `medgemma-1.5-4b-it-q4_0.gguf` (~2.37 GB) + `mmproj-medgemma-1.5-4b-it-q4_0.gguf` (~453 MB).
   - Gemma 4 E2B IT target: `ggml-org/gemma-4-E2B-it-GGUF` -> `gemma-4-E2B-it-Q4_0.gguf` (~2.84 GB).
2. **Model Manager UI & Native Downloader:**
   - Display real artifact details (exact filename, size, quantization).
   - Show `[Download]` button for uninstalled models, not `[Load Model]`.
   - Native chunked downloader with resume, SHA256 verification, and verbose diagnostic logs (HTTP status, resolve URL, content length, bytes downloaded).
   - Full lifecycle test: `Download -> Verify -> Register -> Load via llama.rn -> Generate -> Stop -> Unload -> Reload`.

### Priority P0: Handwritten Prescription Engine
1. **Pipeline Implementation:**
   `Image -> Quality Check (Blur/Lighting) -> Preprocessing -> Native OCR -> Medical NER -> Confidence Tiers -> User Confirmation Modal -> Case Memory`.
2. **Three Real Acceptance Fixtures:**
   - **Fixture A (Fever/Cold/Cough):** Dolo 650, Augmentin 625, Montek-LC, Vitals (BP ~110/70, SpO2 ~96-97%, Pulse ~112).
   - **Fixture B (Hypertension/Edema):** Tazloc-CT 40/12.5, Amlip, Pantocid 40, Provigon-HP, Vitals (BP 140/100, Pulse 72, SpO2 98%).
   - **Fixture C (Parkinson's):** Pramipexole 0.25 mg, Syndopa-110, Rasagiline 0.5 mg, amantadine / Mirapex.
   - Uncertain handwriting marked with `[REQUIRES REVIEW]` badge; never hallucinate or invent drugs.
   - Original image preserved without overwrite.

### Priority P1: Medication Query, Reminder Engine & Recovery Tracker
1. **Medicine Query & Schedule Confirmation:**
   - Query: *"What medicines do I have?"* -> Returns medicines extracted from the active Case File only (strict case isolation).
   - Assistant prompts: *"What time did your doctor ask you to take each medicine?"* -> User confirms -> Reminders created in [MedicationReminderService.ts](file:///c:/Users/lokes/OneDrive/Documents/medicare%20ai/src/services/MedicationReminderService.ts).
2. **Recovery Tracker Expansion:**
   - Sleep start/end time, total duration, quality (1-5), awakenings.
   - Pain score (0-10), pain location.
   - Steps, walking distance, activity level, medication adherence, symptoms.
   - 7-day trend calculated from local records.
3. **Samsung Health Data SDK Bridge:**
   - Native Android module implementing current Samsung Health Data SDK (steps, sleep, activity, heart rate).
   - Deterministic fallback: Samsung Health Connected / Unavailable / Manual Entry.

### Priority P1: Multilingual Voice (Hindi + Kannada)
- Android native offline STT/TTS pipeline for Hindi and Kannada speech input.
- Entity extraction from native transcriptions (e.g. Hindi: *"आज मेरे पैर में दर्द कल से ज्यादा है"* -> `pain_increased = true`; Kannada: *"ಇಂದು ನನ್ನ ಕಾಲಿನಲ್ಲಿ ನಿನ್ನೆಗಿಂತ ಹೆಚ್ಚು ನೋವು ಇದೆ"* -> `pain_increased = true`).

### Priority P2: Doctor Handoff & End-to-End Demo
- Clinical summary export with provenance tags (`[DOC]`, `[USER]`, `[HEALTH]`, `[REVIEW]`).
- 100% offline verification in Airplane Mode.

---

## 3. Files Prepared & Preserved
- `fixtures/prescriptions/`: WhatsApp screenshots and reference prescription images preserved.
- `docs/REAL_PROBLEM_AUDIT.md`: Forensic audit report generated.
- `docs/WORK_IN_PROGRESS_HANDOFF.md`: This state file.
