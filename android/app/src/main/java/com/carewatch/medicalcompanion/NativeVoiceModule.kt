package com.carewatch.medicalcompanion

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*

class NativeVoiceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), RecognitionListener, TextToSpeech.OnInitListener {

    private var speechRecognizer: SpeechRecognizer? = null
    private var textToSpeech: TextToSpeech? = null
    private var isTtsInitialized = false
    private var isListening = false
    private val mainHandler = Handler(Looper.getMainLooper())

    companion object {
        const val NAME = "NativeVoice"
        private const val PERMISSION_REQUEST_AUDIO = 3001
    }

    init {
        mainHandler.post {
            textToSpeech = TextToSpeech(reactContext, this)
        }
    }

    override fun getName(): String = NAME

    private fun sendEvent(eventName: String, params: WritableMap?) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    @ReactMethod
    fun requestAudioPermission(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            val granted = ContextCompat.checkSelfPermission(
                reactContext,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
            promise.resolve(granted)
            return
        }

        val granted = ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        if (granted) {
            promise.resolve(true)
        } else {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                PERMISSION_REQUEST_AUDIO
            )
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun checkAudioPermission(promise: Promise) {
        val granted = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        promise.resolve(granted)
    }

    @ReactMethod
    fun startListening(languageCode: String, options: ReadableMap?, promise: Promise) {
        mainHandler.post {
            try {
                if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
                    promise.reject("UNAVAILABLE", "Speech recognition service is not available on this device")
                    return@post
                }

                // Clean up previous recognizer
                speechRecognizer?.destroy()
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext).apply {
                    setRecognitionListener(this@NativeVoiceModule)
                }

                val localeTag = when (languageCode.lowercase()) {
                    "te", "telugu" -> "te-IN"
                    "hi", "hindi" -> "hi-IN"
                    "kn", "kannada" -> "kn-IN"
                    else -> "en-IN"
                }

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeTag)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, localeTag)
                    putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, localeTag)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                    putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
                }

                speechRecognizer?.startListening(intent)
                isListening = true

                val result = Arguments.createMap().apply {
                    putBoolean("started", true)
                    putString("language", localeTag)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                isListening = false
                promise.reject("START_ERROR", "Failed to start speech recognizer: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        mainHandler.post {
            try {
                speechRecognizer?.stopListening()
                isListening = false
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("STOP_ERROR", "Failed to stop listening: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun cancelListening(promise: Promise) {
        mainHandler.post {
            try {
                speechRecognizer?.cancel()
                isListening = false
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("CANCEL_ERROR", "Failed to cancel listening: ${e.message}", e)
            }
        }
    }

    // ==========================================
    // TEXT TO SPEECH (OFFLINE NATIVE TTS)
    // ==========================================

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            isTtsInitialized = true
            textToSpeech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    val map = Arguments.createMap().apply {
                        putString("utteranceId", utteranceId)
                    }
                    sendEvent("onTtsStart", map)
                }

                override fun onDone(utteranceId: String?) {
                    val map = Arguments.createMap().apply {
                        putString("utteranceId", utteranceId)
                    }
                    sendEvent("onTtsDone", map)
                }

                override fun onError(utteranceId: String?) {
                    val map = Arguments.createMap().apply {
                        putString("utteranceId", utteranceId)
                    }
                    sendEvent("onTtsError", map)
                }
            })
        }
    }

    @ReactMethod
    fun speak(text: String, languageCode: String, promise: Promise) {
        mainHandler.post {
            if (!isTtsInitialized || textToSpeech == null) {
                promise.reject("NOT_INITIALIZED", "TextToSpeech engine is not initialized yet")
                return@post
            }

            val locale = when (languageCode.lowercase()) {
                "te", "telugu" -> Locale("te", "IN")
                "hi", "hindi" -> Locale("hi", "IN")
                "kn", "kannada" -> Locale("kn", "IN")
                else -> Locale("en", "IN")
            }

            val result = textToSpeech?.setLanguage(locale)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                // Fallback to default Locale
                textToSpeech?.setLanguage(Locale.ENGLISH)
            }

            textToSpeech?.setSpeechRate(0.95f) // Natural clinical cadence
            textToSpeech?.setPitch(1.0f)

            val utteranceId = "carebond_${System.currentTimeMillis()}"
            val params = Bundle().apply {
                putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId)
            }

            val speakResult = textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
            if (speakResult == TextToSpeech.SUCCESS) {
                val map = Arguments.createMap().apply {
                    putString("utteranceId", utteranceId)
                    putBoolean("success", true)
                }
                promise.resolve(map)
            } else {
                promise.reject("SPEAK_ERROR", "Failed to queue speech synthesis")
            }
        }
    }

    @ReactMethod
    fun stopSpeaking(promise: Promise) {
        mainHandler.post {
            try {
                textToSpeech?.stop()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("STOP_TTS_ERROR", "Failed to stop TTS: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun getTtsEngines(promise: Promise) {
        val map = Arguments.createMap().apply {
            putBoolean("isInitialized", isTtsInitialized)
            putString("defaultEngine", textToSpeech?.defaultEngine ?: "Android Native TTS")
            putArray("supportedLanguages", Arguments.createArray().apply {
                pushString("en-IN (English)")
                pushString("te-IN (Telugu)")
                pushString("hi-IN (Hindi)")
                pushString("kn-IN (Kannada)")
            })
        }
        promise.resolve(map)
    }

    // ==========================================
    // SPEECH RECOGNITION LISTENER CALLBACKS
    // ==========================================

    override fun onReadyForSpeech(params: Bundle?) {
        sendEvent("onVoiceReady", null)
    }

    override fun onBeginningOfSpeech() {
        sendEvent("onSpeechStart", null)
    }

    override fun onRmsChanged(rmsdB: Float) {
        // Normalize rmsdB (-2 to 10 dB) to 0.0 - 1.0 audio level
        val normalized = Math.max(0.0f, Math.min(1.0f, (rmsdB + 2.0f) / 12.0f))
        val map = Arguments.createMap().apply {
            putDouble("level", normalized.toDouble())
            putDouble("rawRmsDb", rmsdB.toDouble())
        }
        sendEvent("onAudioLevel", map)
    }

    override fun onBufferReceived(buffer: ByteArray?) {}

    override fun onEndOfSpeech() {
        isListening = false
        sendEvent("onSpeechEnd", null)
    }

    override fun onError(error: Int) {
        isListening = false
        val errorMessage = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient audio permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No speech detected"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service busy"
            SpeechRecognizer.ERROR_SERVER -> "Server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input detected"
            else -> "Speech recognition error ($error)"
        }

        val map = Arguments.createMap().apply {
            putInt("errorCode", error)
            putString("errorMessage", errorMessage)
        }
        sendEvent("onVoiceError", map)
    }

    override fun onResults(results: Bundle?) {
        isListening = false
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val confidences = results?.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)

        val primaryTranscript = if (matches != null && matches.size > 0) matches[0] else ""
        val confidence = if (confidences != null && confidences.size > 0) confidences[0].toDouble() else 0.95

        val map = Arguments.createMap().apply {
            putString("transcript", primaryTranscript)
            putDouble("confidence", Math.max(0.7, confidence))
            putArray("alternatives", Arguments.createArray().apply {
                matches?.forEach { pushString(it) }
            })
        }
        sendEvent("onFinalTranscript", map)
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val partial = if (!matches.isNullOrEmpty()) matches[0] else ""
        val map = Arguments.createMap().apply {
            putString("partialTranscript", partial)
        }
        sendEvent("onPartialTranscript", map)
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
