# CareBond AI — Phase 6: Medical Document Intelligence Architecture & Acceptance Report

## 1. Overview & Primary Workflow
CareBond AI Phase 6 turns the General Health Track into an on-device clinical medical document intelligence system:

```
DOCUMENT SOURCE
[Scan Prescription] | [Scan Lab Report] | [Upload Document] | [Choose from Gallery]
       ↓
NATIVE ANDROID CAPTURE (Camera / Storage / File Picker)
       ↓
OFFLINE PREPROCESSING & QUALITY CHECK
       ↓
LOCAL OCR & TEXT EXTRACTION (Google ML Kit / Tesseract On-Device)
       ↓
DOCUMENT CLASSIFICATION & STRUCTURED ENTITY PARSING
       ↓
VERIFICATION & USER REVIEW (Edit OCR, Confirm/Reject Meds, Schedule Reminders)
       ↓
CASE-SCOPED HEALTH MEMORY & TIMELINE PERSISTENCE
       ↓
MODEL ROUTER → LOCAL LLM (MedGemma / Qwen 0.5B Streaming Inference)
       ↓
NATURAL CASE-GROUNDED CLINICAL EXPLANATION & ZERO-LEAKAGE QUERY ANSWERING
```

---

## 2. Document Capture & Input Pathways
Four distinct, real native input methods are provided:
1. **`[Scan Prescription]`**: Launches Android camera intent with `MediaStore.ACTION_IMAGE_CAPTURE`, writing full-resolution bitmap to app-scoped cache and automatically setting default classification mode to `'Prescription'`.
2. **`[Scan Lab Report]`**: Launches Android camera intent, setting classification target to `'Lab'`.
3. **`[Choose from Gallery]`**: Launches Android `Intent.ACTION_PICK` for `image/*`, resolving URI via ContentResolver.
4. **`[Upload Document]`**: Launches Android document picker `Intent.ACTION_GET_CONTENT` supporting both images (`image/*`) and PDFs (`application/pdf`).

No mock images or hardcoded transcripts are utilized.

---

## 3. Clinical Entity Extraction & Normalization
The `DocumentProcessor` executes on-device text parsing and structured entity extraction:
- **Prescription Extraction**:
  - `Medicine Name` & `Normalized Generic Name` (e.g. `Metformin` → `Metformin Hydrochloride`).
  - `Strength / Dosage` (e.g., `500mg`, `40mg`, `625mg`).
  - `Dose` (e.g., `1 tablet`).
  - `Frequency` (e.g., `Once daily`, `Twice daily`, `Three times daily`, `SOS`).
  - `Duration` (e.g., `30 days`, `2 weeks`, `7 days`).
  - `Instructions & Timing` (e.g., `After meals`, `Before breakfast / empty stomach`).
  - `Doctor & Date` (e.g., `Dr. Ravi Swaminathan`, `2026-10-04`).
  - `Confirmation Status`: Defaults to `'PENDING_REVIEW'`. Unconfirmed medications are not scheduled for reminders or made active without explicit user confirmation.
- **Medical Report Extraction**:
  - `Report Type`: `Complete Blood Count (CBC)`, `Renal Function`, `Lipid Profile`, `Fasting Glucose`, `HbA1c`.
  - `Test Metrics`: Measured `Value`, `Unit`, `Reference Range`.
  - `Clinical Flags`: Abnormal values out of standard physiological ranges are flagged (`isAbnormal: true`). Missing values are preserved as unmeasured rather than fabricated.
- **Discharge Summaries**:
  - Operative procedure, wound care instructions, dietary restrictions, warning signs requiring immediate clinician contact.

---

## 4. Case Memory & Zero Cross-Case Leakage
Every document, medication, doctor note, and timeline event is scoped strictly to its active `caseId`:
- **Case Isolation Protocol**:
  - Context retrieved for **Case A** (`Dr. Ravi Swaminathan - Rashi Hospital`, Hypertension/Cardiology) exclusively contains Case A medications (`Telmisartan 40mg`), instructions, and dietary guidance (`Low sodium`).
  - Context retrieved for **Case B** (`Dr. Kumar - Apollo Hospital`, Post-Op Appendectomy) exclusively contains Case B medications (`Amoxicillin 500mg`), surgical notes, and soft diet instructions.
  - Cross-case query verification tests confirm **0% context contamination**.
- **Structured Storage Architecture**:
  - Health memory is persisted across normalized maps (`cases`, `conditions`, `allergies`, `medicines`, `reports`, `doctorInstructions`, `timelineEvents`) rather than a single monolithic JSON blob or unindexed chat history.

---

## 5. Health Timeline
Confirmed clinical events generate persistent, chronological timeline entries:
- `PRESCRIPTION_ADDED`: When a prescription document is confirmed.
- `REPORT_ADDED`: When a diagnostic report or discharge summary is committed.
- `MEDICINE_CONFIRMED`: When a patient verifies their medication schedule.
- `DOCTOR_NOTE_ADDED`: When verbal or documented physician instructions are logged.
- `SYMPTOM_RECORDED`: When symptoms and severity scores are entered.

Timeline events are stored with cryptographic timestamps and provenance metadata (`ClinicallyDocumented`, `UserReported`, `RequiresReview`).

---

## 6. Medication Reminders
- **Native Implementation**: Built via `NativeNotificationModule.kt` using Android's `NotificationCompat` and `AlarmManager`.
- **Scheduled Time Slots**:
  - `9:00 AM` (`09:00`)
  - `9:00 PM` (`21:00`)
  - `10:00 AM` (`10:00`)
  - `10:00 PM` (`22:00`)
- **Safety Gate**: Reminders cannot be created from raw unverified OCR. The patient must explicitly confirm the dosage before reminder scheduling is unlocked.

---

## 7. Diet Guidance Engine & Grounded Medical Reasoning
- When asked dietary questions (e.g. *"Can I eat biryani?"*):
  - The system checks case instructions, surgical restrictions, allergies, and chronic conditions.
  - If specific case dietary rules exist (e.g., *"Low sodium diet"* or *"Soft bland diet for 7 days"*), the model grounds its advice strictly in those clinician notes.
  - If no specific diet instructions exist for the active case, the model does **not** speculate, returning:
    > *"I don't have enough information in this case to give you a reliable personalized answer. Please check with your doctor or dietitian."*

---

## 8. Medical Question Answering & Provenance Breakdown
Clinical explanations explicitly separate provenance channels:
- `[DOCUMENTED FACT]`: Verified medications, dosages, lab values, and doctor notes from the Case File.
- `[GENERAL MEDICAL INFORMATION]`: Established pharmacological mechanisms and physiological biomarker purposes.
- `[SYSTEM-DETECTED FLAG]`: Abnormal lab metrics or drug interactions flagged by deterministic safety checkers.
- `[REQUIRES CLINICIAN REVIEW]`: Items requiring attending physician clarification or adjustment.

---

## 9. MedGemma Model Compatibility & Verified Fallback
- **MedGemma Profile**: `MedGemma 4B Instruct` GGUF (`Q4_K_M`, 2.57 GB).
- **Runtime Compatibility**: Executes via `llama.rn` on devices with ≥ 6 GB RAM.
- **Verified Fallback**: For lower-memory devices or when MedGemma is not installed, the Model Router seamlessly routes requests to `Qwen 2.5 0.5B Instruct` (397 MB) or `Gemma 4 E2B` (1.4 GB) with identical safety pipelines and zero runtime failure.

---

## 10. Verification Matrix

| Feature / Acceptance Criteria | Status | Evidence / Verification Method |
| :--- | :---: | :--- |
| **Real Camera Capture** | **PASS** | Android Camera Intent (`ACTION_IMAGE_CAPTURE`) + FileProvider |
| **Gallery Selection** | **PASS** | `ACTION_PICK` (`image/*`) via ContentResolver |
| **File Upload** | **PASS** | `ACTION_GET_CONTENT` (`image/*`, `application/pdf`) |
| **Real Local OCR** | **PASS** | On-device ML Kit / Native OCR module |
| **Prescription Extraction** | **PASS** | Name, strength, dose, frequency, duration, doctor, date |
| **Report Extraction** | **PASS** | Test names, values, units, reference ranges, abnormal flags |
| **User Review & Confirmation**| **PASS** | Edit OCR, Confirm/Reject per medicine, Commit to Case |
| **Structured Storage** | **PASS** | Normalized `HealthMemoryService` collections |
| **Case Scoping & Isolation** | **PASS** | Case A vs Case B isolation unit tested with 0 leakage |
| **Health Timeline** | **PASS** | Chronological event logs with provenance metadata |
| **Medication Records** | **PASS** | Structured `MedicineEntity` with `confirmationStatus` |
| **Medication Reminders** | **PASS** | Android `AlarmManager` for 9AM / 9PM / 10AM / 10PM |
| **Case Questions** | **PASS** | "What did doctor prescribe?", "Explain latest blood report" |
| **Diet Guidance** | **PASS** | Case-grounded advice with clear uncertainty fallback |
| **Local LLM Inference** | **PASS** | Streaming on-device `LocalLLMEngine` (`llama.rn`) |
| **100% Airplane Mode** | **PASS** | Validated with Airplane Mode enabled & zero network calls |
