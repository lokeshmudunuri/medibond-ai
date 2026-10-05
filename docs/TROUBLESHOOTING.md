# CareBond AI — Jury Troubleshooting Guide

This guide assists hackathon juries and evaluators in rapidly diagnosing and resolving any environment or device issues during testing.

---

## 1. APK Installation & Permissions

### Problem: "App not installed" or "Installation blocked"
* **Cause:** Android blocks APK installations from third-party browsers by default to protect users against malicious sideloading.
* **What to do:**
  1. Open your device **Settings** -> **Apps** -> **Special app access** -> **Install unknown apps**.
  2. Locate your browser (e.g., Chrome) or file manager and toggle **Allow from this source** to **ON**.
  3. Re-open `CareBondAI-Jury-Demo.apk` and proceed with the installation.
  4. If Google Play Protect shows a pop-up: tap **"More details"** -> **"Install anyway"**.

### Problem: "App crashes immediately on first launch"
* **Cause:** Incompatible CPU architecture or stale local app data from an earlier test build.
* **What to do:**
  1. Ensure your device is `arm64-v8a` (standard on all modern Android devices).
  2. If an earlier prototype was installed, uninstall it first:
     ```bash
     adb uninstall com.carewatch.medicalcompanion
     ```
  3. Reinstall the clean release APK:
     ```bash
     adb install release/CareBondAI-Jury-Demo.apk
     ```

### Problem: Camera or Storage permissions not granted
* **Cause:** Android runtime permission dialog was dismissed or rejected.
* **What to do:**
  1. Go to **Settings** -> **Apps** -> **CareBond AI** -> **Permissions**.
  2. Enable **Camera** (for scanning medical documents) and **Files/Media** (for saving vault files).

---

## 2. Models & Local AI Inference

### Problem: In-app model download returns HTTP 404 or fails
* **Cause:** Upstream Hugging Face repositories periodically rename GGUF files or update directory structures.
* **What to do:**
  1. CareBond AI operates fully in deterministic mode without a downloaded model! All case isolation, document vault features, safety rule engines, and recovery tracking work immediately.
  2. If you wish to test local GGUF inference, you can sideload any standard GGUF model via ADB:
     ```bash
     adb push your-model.gguf /storage/emulated/0/Android/data/com.carewatch.medicalcompanion/files/models/
     ```
  3. In the app, navigate to **Storage / Models** and tap **"Scan Local Storage"**. The model will be recognized and ready to load.

### Problem: "Out of memory" when loading a model
* **Cause:** Attempting to load a 4B parameter model on a device with 4 GB or less RAM.
* **What to do:**
  1. Choose a lighter quantized model (`Q4_K_M` ~1.4 GB or Profile C ~1.2 GB).
  2. Close background apps on the device before loading the model.

---

## 3. Documents, OCR & Safety

### Problem: Extracted prescription text shows `[REQUIRES REVIEW]`
* **Cause:** This is an intentional safety feature! In accordance with clinical safety principles, low-contrast or ambiguous handwritten physician notes are never guessed or hallucinated by the system.
* **What to do:**
  1. Tap the flagged medication item to view the original cropped image snippet.
  2. Confirm or edit the drug name, dosage, or frequency.
  3. Tap **"Verify & Confirm"** to lock the record into case memory.

### Problem: "Emergency warning triggered for my question"
* **Cause:** Your input contained clinical red-flag terms (e.g. severe chest pain, shortness of breath, sudden numbness, anaphylaxis).
* **What to do:**
  1. This verifies that the deterministic **EmergencySafetyEngine** is actively protecting the patient.
  2. The system deliberately blocks non-emergency responses and advises seeking immediate emergency medical care.

---

## 4. Offline Verification

### Problem: "Does the app need Wi-Fi after initial setup?"
* **Cause:** Confusion between APK installation and runtime execution.
* **What to do:**
  1. Turn on **Airplane Mode** on your device.
  2. Navigate through Cases, Document Vault, Recovery Track, and Chat.
  3. Notice that all core features remain fully functional without any internet connection.
