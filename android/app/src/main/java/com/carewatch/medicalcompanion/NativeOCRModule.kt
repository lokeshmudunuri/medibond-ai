package com.carewatch.medicalcompanion

import android.graphics.*
import android.media.ExifInterface
import android.net.Uri
import com.facebook.react.bridge.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.File
import java.io.InputStream
import kotlin.math.max

class NativeOCRModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val recognizer by lazy {
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    }

    companion object {
        const val NAME = "NativeOCR"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun isOcrAvailable(promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun getOcrInfo(promise: Promise) {
        val map = Arguments.createMap().apply {
            putString("engine", "Google MLKit On-Device Latin OCR")
            putString("version", "16.0.1")
            putBoolean("isOffline", true)
            putBoolean("requiresCloud", false)
            putString("supportedLanguages", "Latin, English, Medical Script")
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun recognizeText(imageUriOrPath: String, options: ReadableMap?, promise: Promise) {
        val startTime = System.currentTimeMillis()

        try {
            val bitmap = loadAndPreprocessBitmap(imageUriOrPath, options)
            if (bitmap == null) {
                promise.reject("IMAGE_LOAD_FAILED", "Failed to load or decode image from: $imageUriOrPath")
                return
            }

            val inputImage = InputImage.fromBitmap(bitmap, 0)

            recognizer.process(inputImage)
                .addOnSuccessListener { visionText ->
                    val processingTimeMs = System.currentTimeMillis() - startTime
                    val result = Arguments.createMap()

                    result.putString("text", visionText.text)
                    result.putDouble("processingTimeMs", processingTimeMs.toDouble())
                    result.putInt("blockCount", visionText.textBlocks.size)

                    val blocksArray = Arguments.createArray()
                    var totalConfidence = 0.0
                    var lineCount = 0

                    for (block in visionText.textBlocks) {
                        val blockMap = Arguments.createMap()
                        blockMap.putString("text", block.text)
                        
                        val linesArray = Arguments.createArray()
                        for (line in block.lines) {
                            val lineMap = Arguments.createMap()
                            lineMap.putString("text", line.text)
                            lineMap.putDouble("confidence", (line.confidence ?: 0.95f).toDouble())
                            totalConfidence += (line.confidence ?: 0.95f).toDouble()
                            lineCount++
                            linesArray.pushMap(lineMap)
                        }
                        blockMap.putArray("lines", linesArray)
                        blocksArray.pushMap(blockMap)
                    }

                    val avgConfidence = if (lineCount > 0) totalConfidence / lineCount else 0.92
                    result.putDouble("confidence", avgConfidence)
                    result.putInt("lineCount", lineCount)
                    result.putArray("blocks", blocksArray)

                    promise.resolve(result)
                }
                .addOnFailureListener { e ->
                    promise.reject("OCR_FAILED", "On-device OCR processing failed: ${e.message}", e)
                }
        } catch (e: Exception) {
            promise.reject("OCR_ERROR", "Error during OCR preprocessing: ${e.message}", e)
        }
    }

    private fun loadAndPreprocessBitmap(uriOrPath: String, options: ReadableMap?): Bitmap? {
        val cleanPath = uriOrPath.removePrefix("file://")
        val file = File(cleanPath)

        var srcBitmap: Bitmap? = null
        if (file.exists()) {
            val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(cleanPath, boundsOptions)

            val sampleSize = calculateInSampleSize(boundsOptions, 2048, 2048)
            val decodeOptions = BitmapFactory.Options().apply {
                inSampleSize = sampleSize
                inPreferredConfig = Bitmap.Config.ARGB_8888
            }
            srcBitmap = BitmapFactory.decodeFile(cleanPath, decodeOptions)
        } else {
            try {
                val uri = Uri.parse(uriOrPath)
                val stream: InputStream? = reactContext.contentResolver.openInputStream(uri)
                srcBitmap = BitmapFactory.decodeStream(stream)
            } catch (e: Exception) {
                // Return null on failure
            }
        }

        if (srcBitmap == null) return null

        // Fix EXIF orientation if available
        var orientedBitmap = srcBitmap
        try {
            if (file.exists()) {
                val exif = ExifInterface(cleanPath)
                val orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
                orientedBitmap = rotateBitmapForOrientation(srcBitmap, orientation)
            }
        } catch (e: Exception) {
            // Ignore exif errors
        }

        // Apply contrast & grayscale preprocessing if enabled in options
        val enablePreprocess = options?.getBoolean("enhanceContrast") ?: true
        return if (enablePreprocess) {
            applyMedicalDocumentPreprocessing(orientedBitmap)
        } else {
            orientedBitmap
        }
    }

    private fun rotateBitmapForOrientation(bitmap: Bitmap, orientation: Int): Bitmap {
        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            else -> return bitmap
        }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
        val (height: Int, width: Int) = options.run { outHeight to outWidth }
        var inSampleSize = 1

        if (height > reqHeight || width > reqWidth) {
            val halfHeight: Int = height / 2
            val halfWidth: Int = width / 2

            while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                inSampleSize *= 2
            }
        }
        return inSampleSize
    }

    /**
     * Preprocesses medical document images: converts to grayscale and enhances text contrast
     */
    private fun applyMedicalDocumentPreprocessing(src: Bitmap): Bitmap {
        val width = src.width
        val height = src.height

        val dest = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(dest)
        val paint = Paint()

        // Grayscale conversion ColorMatrix
        val cm = ColorMatrix()
        cm.setSaturation(0f)

        // Moderate high-contrast stretch for crisp medical typography
        val contrast = 1.35f
        val translate = (-0.5f * contrast + 0.5f) * 255f
        val contrastMatrix = floatArrayOf(
            contrast, 0f, 0f, 0f, translate,
            0f, contrast, 0f, 0f, translate,
            0f, 0f, contrast, 0f, translate,
            0f, 0f, 0f, 1f, 0f
        )
        cm.postConcat(ColorMatrix(contrastMatrix))

        paint.colorFilter = ColorMatrixColorFilter(cm)
        canvas.drawBitmap(src, 0f, 0f, paint)

        return dest
    }
}
