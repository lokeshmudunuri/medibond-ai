# CareBond AI — Jury Testing Guide

> **Target Audience:** Hackathon Judges, Evaluators, and Non-Developer Testers  
> **App Version:** `1.0.0` (Jury Demo Build)  
> **Package ID:** `com.carewatch.medicalcompanion`  
> **Distribution:** Standalone Android APK via GitHub Release  

---

## 1. What You Need

| Requirement | Specification | Notes |
|---|---|---|
| **Device Type** | Physical Android Phone or Tablet | Tested on Samsung Galaxy S24 Ultra (Android 14/15) |
| **Android OS** | Android 10.0 (API 29) or higher | Recommended: Android 12+ |
| **RAM** | Minimum 4 GB RAM | 8 GB+ recommended for running 4B GGUF models |
| **Free Storage** | 500 MB for core APK + database | 3 GB - 5 GB additional if downloading local GGUF models |
| **Architecture** | `arm64-v8a` or `x86_64` | All modern Android devices run `arm64-v8a` |

### Installation Internet vs. Runtime Internet

* **Installation Internet:** Required **only once** to download the APK (`~168 MB`) from GitHub Releases.
* **Runtime Internet:** **NOT REQUIRED** for core application operations.
  * Medical Case isolation, Document Vault, OCR text extraction, Medical NER, Safety Rule validation, Recovery Check-ins, Doctor Handoff summaries, and Storage Management all operate **100% offline**.
  * If you choose to download additional quantized GGUF models (e.g. MedGemma 4B / Gemma 4), Wi-Fi is needed during the model file download. Once downloaded, all AI inference is strictly offline on-device.

---

## 2. Installing the APK (Step-by-Step)

1. **Download the APK:**
   * On your Android device, open Chrome or your preferred browser.
   * Go to the GitHub Releases page:  
     `https://github.com/lokeshmudunuri/medibond-ai/releases/tag/v1.0.0-jury`
   * Tap on **`CareBondAI-Jury-Demo.apk`** to download.
   * *(Optional)* Verify SHA-256 checksum:  
     `51f80a0b1f9664111274a2fa776bbc4b8ede32a02625fe5f70a9b074af34156e`

2. **Allow Installation from Unknown Sources:**
   * When prompted *"File might be harmful"*, tap **Download anyway** (standard Android warning for direct APK downloads outside Google Play).
   * Open the downloaded file. If Android displays *"For your security, your phone is not allowed to install unknown apps from this source"*:
     1. Tap **Settings**.
     2. Toggle **Allow from this source** to ON.
     3. Press Back and tap **Install**.

3. **Launch the App:**
   * Look for the **CareBond AI** icon with the medical cross in your app drawer.
   * Tap to open.

---

## 3. First Launch Experience

When you open CareBond AI:
1. **Instant Offline Startup:** The app bundles its offline JavaScript engine and local database. No login or cloud account creation is requested—your data never leaves your device.
2. **Main Dashboard (Home):**
   * Displays the active **Case File Selector** at the top.
   * Quick-launch cards for:
     * 📁 **Case Files & Document Vault**
     * 🩺 **Doctor Handoff Brief**
     * 🔄 **Recovery Track & Daily Check-in**
     * 🤖 **Offline AI Assistant**
     * 💾 **Storage & Model Manager**

---

## 4. Recommended 5–10 Minute Jury Demo Script

Follow these 5 self-guided test scenarios to experience the core innovations of CareBond AI:

### Demo 1 — Create a Case File & Test Medical Isolation
* **Goal:** Verify that medical data and AI context are partitioned into isolated cases (e.g., separating chronic conditions from post-op recovery).
1. On the **Home** tab, tap **"+ New Case"** (or use the Case Switcher header).
2. Enter:
   * **Case Title:** `Diabetes Management`
   * **Category:** `Chronic Disease`
   * **Doctor:** `Dr. Priya Sharma`
3. Tap **Create Case**.
4. Observe the timeline initializes with zero contamination from other cases.
5. Create a second case: `Knee Arthroscopy Recovery` (`Post-Op Recovery`).
6. Switch between the two cases. Notice how case memory, medications, and documents are strictly compartmentalized.

### Demo 2 — Document Vault & Prescription Review
* **Goal:** Test medical document ingestion, native OCR processing, and the deterministic safety review flow.
1. Tap the **Documents** tab in the bottom navigation.
2. Tap **"Upload / Scan Prescription"**.
3. Select an existing sample prescription or camera photo (sample images are also pre-loaded in the demo).
4. Tap **"Extract & Parse"**.
5. Observe the extraction results:
   * Extracted medications (e.g. *Metformin 500mg*, *Dolo 650*, *Pantocid 40*).
   * Dosage instructions and frequency.
   * **Safety Badge:** High-confidence items show `[VERIFIED]`, while ambiguous handwriting displays `[REQUIRES REVIEW]`.
6. Tap **"Confirm & Save to Case"**.
7. The extracted medications and clinical notes are now securely indexed in the active Case memory.

### Demo 3 — Medical Safety Engine & AI Inquiry
* **Goal:** Test medical question answering and verify deterministic safety guardrails.
1. Tap the **Chat** tab in the bottom navigation.
2. Ask: *"What medicines do I have in my current case?"*
   * The assistant reads strictly from the active case memory and lists confirmed medications.
3. Test an Emergency Safety query:
   * Type: *"I have severe crushing chest pain and shortness of breath."*
   * **Safety Guardrail Trigger:** The Emergency Safety Engine immediately intercepts the prompt, displays an unmistakable red **EMERGENCY WARNING**, advises calling local emergency services (112/911), and refuses to provide unverified home remedies.
4. Test a Contraindication / Allergy query:
   * Ask about taking a duplicate NSAID or unprescribed antibiotic.
   * Observe the safety engine flagging potential adverse interactions based on local case history.

### Demo 4 — Recovery Track & Caretaker Check-in
* **Goal:** Demonstrate post-discharge recovery monitoring, pain tracking, and doctor handoff generation.
1. Switch to your `Knee Arthroscopy Recovery` case.
2. Tap the **Recovery** tab.
3. Tap **"Log Daily Check-in"**:
   * Set **Pain Score:** `4 / 10` (Moderate).
   * Enter **Pain Location:** `Right Knee`.
   * Log **Mobility:** `Walking with crutches, 450 steps`.
   * Select **Symptoms:** `Mild swelling, no redness`.
4. Tap **Save Check-in**.
5. Observe the 7-day trend graph and baseline status updating.
6. Tap **"Generate Doctor Handoff"**:
   * An exportable clinical summary is instantly generated, tagged with provenance (`[DOC]`, `[USER]`, `[HEALTH]`), formatted for rapid physician review during follow-up visits.

### Demo 5 — 100% Offline Airplane Mode Verification
* **Goal:** Prove beyond doubt that the app does not rely on external cloud servers for daily medical operations.
1. Swipe down the Android Notification shade and turn on **Airplane Mode** (disable both Wi-Fi and Mobile Data).
2. Switch between Case Files.
3. Add a new document note or log a recovery check-in.
4. Run an AI query on stored case medications.
5. Generate a doctor handoff report.
6. **Result:** Every operation executes seamlessly on-device with zero network latency and complete privacy.

---

## 5. Summary of Tested Device Baseline

| Metric | Result on Test Baseline (Galaxy S24 Ultra) |
|---|---|
| **App Cold Start** | < 1.2 seconds |
| **Offline DB Query Latency** | < 15 ms |
| **Local OCR Parsing** | ~850 ms |
| **Doctor Handoff Generation** | Instantaneous (< 50 ms) |
| **Storage Footprint** | ~170 MB APK install size |
| **Telemetry / Tracking** | Zero network requests (0 B cloud upload) |
