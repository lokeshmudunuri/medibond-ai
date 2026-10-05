# CareBond AI — Local Model Setup & Management Guide

> **Architectural Philosophy:** Complete medical privacy demands 100% on-device AI inference. No sensitive health logs, symptoms, or prescription images are ever transmitted to a cloud LLM server.

---

## 1. Why AI Models Are Distributed Separately from the APK

* **APK Size Limits:** Google Play and standard Android package installations have practical size boundaries (~150–200 MB for direct APK delivery). High-parameter quantized LLM weights range from **1.4 GB to 4.5 GB**.
* **Device Granularity:** Users with mid-range phones (4 GB RAM) require smaller quantized models (`Q4_K_M` ~1.4 GB), whereas high-end flagships (12 GB+ RAM like the Samsung S24 Ultra) can comfortably run 4B-parameter clinical specialists (`Q4_K_M` or `Q8_0` ~2.5 GB–4.4 GB).
* **Decoupled Updates:** Weights and medical knowledge bases can be updated or quantized independently without requiring full native app reinstallations.

---

## 2. Model Profiles & Supported Tiers

CareBond AI defines three on-device model tiers in `ModelRegistry.ts`:

| Profile | Model Identifier | Base Architecture | Quantization | Disk Footprint | Target Devices / Use Case |
|---|---|---|---|---|---|
| **Profile A (Specialist)** | `medgemma-4b-it-q4` | MedGemma 1.5 4B Instruct | `Q4_K_M` | ~2.57 GB | 8 GB+ RAM. Deep clinical explanations, lab interpretation, complex drug questions. |
| **Profile B (General)** | `gemma-4-e2b-q4_k_m` | Gemma 4 E2B Instruct | `Q4_K_M` | ~1.54 GB | 6 GB+ RAM. Daily check-ins, caregiver reassurance, lifestyle and diet guidance. |
| **Profile C (Ultra-Light)** | `phi-3-mini-4k-q4` | Phi-3 Mini / SmolLM2 | `Q4_K_M` | ~1.20 GB | 4 GB RAM. Ultra-fast triage, medication schedule reminders, basic health notes. |

---

## 3. How Models Are Downloaded & Stored Locally

1. **Storage Path:** Downloaded GGUF models are stored exclusively in the app's sandboxed external files directory:
   ```text
   /storage/emulated/0/Android/data/com.carewatch.medicalcompanion/files/models/
   ```
2. **Download Engine (`NativeDownloader.ts`):**
   * Uses chunked streaming via Android `DownloadManager` / native background HTTP client.
   * Periodically queries progress (`bytesRead / totalBytes`) and verifies file integrity using SHA-256 upon completion.
   * Prevents system sleep during downloads via native wake locks.
3. **Model Manager (`ModelManager.ts`):**
   * Scans the local filesystem directory upon app launch.
   * Auto-registers any `.gguf` file matching the model registry definitions.
   * Initializes the native `llama.rn` context with tailored thread counts (typically 4 threads on modern ARM cores).

---

## 4. Current Limitations & Real-World Gotchas

> [!WARNING]
> ### ⚠️ CURRENT LIMITATION (October 2026 Checkpoint)
> 
> * **Stale Hugging Face Target Paths:** Some upstream Hugging Face repositories have updated their GGUF release filenames (e.g. replacing `medgemma-1.5-4b-it-q4_k_m.gguf` with differing capitalization or sub-quant naming). This can cause direct in-app HTTP downloads to encounter HTTP 404 unless dynamic HF API resolution is active.
> * **Manual Sideloading (Alternative for Hackathon Testing):** If in-app downloading encounters network or upstream CDN errors, jury members or evaluators can manually push any standard GGUF model via ADB:
>   ```bash
>   adb push medgemma-1.5-4b-it-q4_k_m.gguf /storage/emulated/0/Android/data/com.carewatch.medicalcompanion/files/models/
>   ```
>   Once pushed, tap **"Scan Local Storage"** in the **Storage / Model Manager** tab, and CareBond AI will immediately detect and activate the model!
> * **Deterministic Fallback Engine:** When no heavy GGUF model is loaded, CareBond AI **does not crash or freeze**. It automatically falls back to its deterministic rule engines (`MedicationSafetyChecker`, `EmergencySafetyEngine`, and `RecoveryEngine`), ensuring all critical safety checks and case tracking continue working flawlessly.

---

## 5. Offline Operation After Model Installation

Once a model is present on disk:
1. Turn on **Airplane Mode**.
2. Go to **Storage / Models** and tap **Load Model**.
3. The native `llama.cpp` runtime allocates tensor memory directly into the device's RAM/NPU.
4. All subsequent token generation, clinical summarization, and safety audits run entirely within the phone's CPU/GPU with **zero network transmissions**.
