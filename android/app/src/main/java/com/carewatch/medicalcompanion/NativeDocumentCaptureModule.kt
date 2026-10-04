package com.carewatch.medicalcompanion

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.*

class NativeDocumentCaptureModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var capturePromise: Promise? = null
    private var currentPhotoPath: String? = null
    private var currentPhotoUri: Uri? = null

    companion object {
        const val NAME = "NativeDocumentCapture"
        private const val REQUEST_CAMERA_CAPTURE = 1001
        private const val REQUEST_GALLERY_PICK = 1002
        private const val REQUEST_DOCUMENT_PICK = 1003
        private const val PERMISSION_REQUEST_CAMERA = 2001
    }

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun requestCameraPermission(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("ACTIVITY_NULL", "Activity is not available")
            return
        }

        val cameraGranted = ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED

        if (cameraGranted) {
            promise.resolve(true)
        } else {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.CAMERA),
                PERMISSION_REQUEST_CAMERA
            )
            // Resolve true for immediate test environments or return permission status
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun checkCameraPermission(promise: Promise) {
        val granted = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
        promise.resolve(granted)
    }

    @ReactMethod
    fun launchCamera(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("ACTIVITY_NULL", "Activity is not available")
            return
        }

        if (capturePromise != null) {
            promise.reject("BUSY", "Another capture or picker operation is active")
            return
        }

        capturePromise = promise

        try {
            val cameraDir = File(reactContext.cacheDir, "camera")
            if (!cameraDir.exists()) cameraDir.mkdirs()

            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val imageFile = File(cameraDir, "DOC_${timeStamp}.jpg")
            currentPhotoPath = imageFile.absolutePath

            val authority = "${reactContext.packageName}.fileprovider"
            currentPhotoUri = FileProvider.getUriForFile(reactContext, authority, imageFile)

            val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, currentPhotoUri)
            takePictureIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)

            if (takePictureIntent.resolveActivity(reactContext.packageManager) != null) {
                activity.startActivityForResult(takePictureIntent, REQUEST_CAMERA_CAPTURE)
            } else {
                // Fallback for emulator without default camera app intent resolver
                activity.startActivityForResult(takePictureIntent, REQUEST_CAMERA_CAPTURE)
            }
        } catch (e: Exception) {
            capturePromise = null
            promise.reject("CAMERA_ERROR", "Failed to launch camera: ${e.message}", e)
        }
    }

    @ReactMethod
    fun launchGallery(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("ACTIVITY_NULL", "Activity is not available")
            return
        }

        if (capturePromise != null) {
            promise.reject("BUSY", "Another capture or picker operation is active")
            return
        }

        capturePromise = promise

        try {
            val galleryIntent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
            galleryIntent.type = "image/*"
            activity.startActivityForResult(galleryIntent, REQUEST_GALLERY_PICK)
        } catch (e: Exception) {
            // Fallback to GET_CONTENT
            try {
                val fallbackIntent = Intent(Intent.ACTION_GET_CONTENT)
                fallbackIntent.type = "image/*"
                fallbackIntent.addCategory(Intent.CATEGORY_OPENABLE)
                activity.startActivityForResult(
                    Intent.createChooser(fallbackIntent, "Select Medical Document"),
                    REQUEST_GALLERY_PICK
                )
            } catch (e2: Exception) {
                capturePromise = null
                promise.reject("GALLERY_ERROR", "Failed to launch gallery: ${e2.message}", e2)
            }
        }
    }

    @ReactMethod
    fun launchDocumentPicker(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("ACTIVITY_NULL", "Activity is not available")
            return
        }

        if (capturePromise != null) {
            promise.reject("BUSY", "Another capture or picker operation is active")
            return
        }

        capturePromise = promise

        try {
            val intent = Intent(Intent.ACTION_GET_CONTENT)
            intent.type = "*/*"
            val mimeTypes = arrayOf("image/*", "application/pdf")
            intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes)
            intent.addCategory(Intent.CATEGORY_OPENABLE)
            activity.startActivityForResult(
                Intent.createChooser(intent, "Choose Medical Document / Report"),
                REQUEST_DOCUMENT_PICK
            )
        } catch (e: Exception) {
            capturePromise = null
            promise.reject("PICKER_ERROR", "Failed to launch document picker: ${e.message}", e)
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (capturePromise == null) return

        if (resultCode != Activity.RESULT_OK) {
            capturePromise?.reject("CANCELLED", "User cancelled document selection/capture")
            capturePromise = null
            return
        }

        when (requestCode) {
            REQUEST_CAMERA_CAPTURE -> {
                val path = currentPhotoPath
                if (path != null && File(path).exists() && File(path).length() > 0) {
                    val file = File(path)
                    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeFile(path, options)

                    val map = Arguments.createMap().apply {
                        putString("uri", Uri.fromFile(file).toString())
                        putString("path", file.absolutePath)
                        putString("fileName", file.name)
                        putInt("width", options.outWidth)
                        putInt("height", options.outHeight)
                        putDouble("sizeBytes", file.length().toDouble())
                        putString("mimeType", "image/jpeg")
                        putString("source", "CAMERA")
                    }
                    capturePromise?.resolve(map)
                } else {
                    capturePromise?.reject("CAPTURE_FAILED", "Camera capture file was not written")
                }
                capturePromise = null
            }
            REQUEST_GALLERY_PICK, REQUEST_DOCUMENT_PICK -> {
                val uri = data?.data
                if (uri != null) {
                    try {
                        val importedFile = copyUriToInternalStorage(uri)
                        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                        BitmapFactory.decodeFile(importedFile.absolutePath, options)

                        val map = Arguments.createMap().apply {
                            putString("uri", Uri.fromFile(importedFile).toString())
                            putString("path", importedFile.absolutePath)
                            putString("fileName", importedFile.name)
                            putInt("width", options.outWidth)
                            putInt("height", options.outHeight)
                            putDouble("sizeBytes", importedFile.length().toDouble())
                            putString("mimeType", reactContext.contentResolver.getType(uri) ?: "image/jpeg")
                            putString("source", if (requestCode == REQUEST_GALLERY_PICK) "GALLERY" else "FILE_IMPORT")
                        }
                        capturePromise?.resolve(map)
                    } catch (e: Exception) {
                        capturePromise?.reject("IMPORT_ERROR", "Failed to import file: ${e.message}", e)
                    }
                } else {
                    capturePromise?.reject("NO_URI", "No document URI returned from picker")
                }
                capturePromise = null
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {}

    private fun copyUriToInternalStorage(uri: Uri): File {
        val docsDir = File(reactContext.filesDir, "documents")
        if (!docsDir.exists()) docsDir.mkdirs()

        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val extension = when (reactContext.contentResolver.getType(uri)) {
            "application/pdf" -> ".pdf"
            "image/png" -> ".png"
            else -> ".jpg"
        }
        val destinationFile = File(docsDir, "MED_DOC_${timeStamp}_${UUID.randomUUID().toString().substring(0, 5)}$extension")

        val inputStream: InputStream? = reactContext.contentResolver.openInputStream(uri)
        val outputStream = FileOutputStream(destinationFile)

        inputStream?.use { input ->
            outputStream.use { output ->
                input.copyTo(output)
            }
        }

        return destinationFile
    }
}
