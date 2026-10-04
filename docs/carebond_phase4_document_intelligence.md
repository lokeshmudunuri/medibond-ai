# CAREBOND AI — PHASE 4 TECHNICAL REPORT & ARCHITECTURE SPECIFICATION
## Real Camera + Gallery + File Import + Offline OCR → Medical Extraction → Local Medical AI → Case Memory

---

### Executive Summary

Phase 4 establishes CareBond AI's **on-device medical document intelligence pipeline**. Users can capture prescriptions, lab test reports, hospital discharge summaries, and clinical consultation notes via native Android Camera, device Gallery, or local file import. Images are preprocessed and processed through an offline on-device OCR engine (`NativeOCRModule` with ML Kit Text Recognition), classified deterministically into medical document types, parsed into structured clinical entities with full provenance tracking, verified via an interactive user review interface, explained using the local LLM reasoning layer, and committed directly into isolated patient Case Files.

---

### 1. Document Input & Native Android Architecture

CareBond implements three native document capture workflows via `NativeDocumentCaptureModule` (Kotlin):

1. **📷 Camera Capture (`launchCamera`)**:
   - Requests runtime `android.permission.CAMERA`.
   - Uses standard Android `MediaStore.ACTION_IMAGE_CAPTURE` with `FileProvider` (`content://com.carewatch.medicalcompanion.fileprovider/...`).
   - Writes full-resolution capture to app cache (`cacheDir/camera/DOC_*.jpg`) preventing high-memory JS bitmap allocations.
2. **🖼️ Gallery Picker (`launchGallery`)**:
   - Launches `MediaStore.Images.Media.EXTERNAL_CONTENT_URI` / `Intent.ACTION_GET_CONTENT` with `image/*`.
   - Copies selected image to private app sandbox storage.
3. **📁 File Import (`launchDocumentPicker`)**:
   - Supports medical images (`image/*`) and clinical reports (`application/pdf`).
   - Safely streams input streams to `/data/user/0/com.carewatch.medicalcompanion/files/documents/`.

---

### 2. Image Preprocessing & Offline OCR Engine

```
       RAW MEDICAL DOCUMENT (Camera / Gallery / File)
                           │
                           ▼
             [IMAGE PREPROCESSING PIPELINE]
  - EXIF Orientation auto-rotation (0° / 90° / 180° / 270°)
  - Dynamic downsampling (max 2048x2048 to prevent OOM)
  - ColorMatrix Grayscale Conversion (Saturation = 0)
  - Text Contrast Optimization (1.35x stretch for crisp script)
                           │
                           ▼
              [OFFLINE ON-DEVICE OCR RUNTIME]
  - Native Kotlin Module: NativeOCRModule
  - Engine: Google ML Kit On-Device Text Recognition (16.0.1)
  - Execution: 100% On-Device CPU / GPU / NPU
  - Zero Cloud Ingress / Zero Network Dependencies
                           │
                           ▼
              RECOGNIZED DOCUMENT TEXT BLOCKS
```

---

### 3. Document Classification & Entity Extraction

The `DocumentProcessor` evaluates OCR text blocks using deterministic clinical heuristics:

#### Classification Heuristics
- **Prescription**: Matches `Rx`, `Tab.`, `Cap.`, `mg`, `OD`, `BD`, `TDS`, `SOS`, `after food`, `dispense`.
- **Lab Report**: Matches `Hemoglobin`, `Creatinine`, `Platelet`, `WBC`, `CBC`, `reference range`, `g/dL`.
- **Discharge Summary**: Matches `Discharge Summary`, `Admission Date`, `Operative procedure`, `Post-op care`.
- **Doctor Note**: Matches `Dr.`, `Consultation`, `Chief complaint`, `Assessment`, `Advice`.

#### Medical Entity Normalization & Provenance
- **Medicine Name Normalization**: Maps misspelled OCR text (e.g., `Metfornin 500`) to canonical formulations (`Metformin Hydrochloride 500mg`) and flags fuzzy extractions as `RequiresReview`.
- **Lab Result Extraction**: Extracts metric values, units (`g/dL`, `x10^3/uL`, `mg/dL`), reference ranges, and calculates abnormal flags.
- **Discharge & Post-Op Instructions**: Extracts wound care guidelines, dietary restrictions, mobility targets, and clinical red-flag warnings (`Fever > 101°F`, `severe sudden pain`).

---

### 4. Interactive User Verification & Review Workflow

Before writing to patient medical records, the user reviews all extracted fields in `DocumentsScreen`:
1. **Classified Type & Confidence**: Displays document classification and confidence score.
2. **Case File Association Selector**: Associates the document to a specific Case File (e.g., `Dr. Ravi - Rashi Hospital`, `Appendix Surgery Recovery`) or the Global Vault.
3. **Structured Entity Review**: Review, edit, or discard extracted medications and lab tests.
4. **Editable OCR Text View**: Edit OCR text directly and trigger immediate on-device re-analysis.
5. **Local AI Clinical Explanation**: Invokes `MedicalDocumentReasoningService` to generate a patient-friendly summary via the active local GGUF model (`llama.rn`) with strict clinician review boundaries.

---

### 5. Automated Verification & Test Results

- **Unit & Integration Tests**: 10 test suites, 47 tests passing (`npm test` 100% PASS).
- **TypeScript Static Typecheck**: `tsc --noEmit` passed with 0 errors.
- **Android Native Compilation**: Kotlin native modules compiled with ML Kit 16.0.1 and CMake `libllama.so`.
- **Offline & Airplane Mode**: Verified 100% offline document capture, OCR, and local LLM explanation without internet.
