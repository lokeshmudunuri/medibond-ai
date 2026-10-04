package com.carewatch.medicalcompanion

import android.os.StatFs
import android.os.Environment
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import okhttp3.*
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.io.RandomAccessFile
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class ModelDownloadModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val activeCalls = ConcurrentHashMap<String, Call>()
    private val cancelledJobs = ConcurrentHashMap<String, Boolean>()
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    override fun getName(): String = "CareBondModelDownloader"

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built-in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built-in Event Emitter Calls
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    @ReactMethod
    fun getModelsDirectory(promise: Promise) {
        try {
            val modelsDir = File(reactContext.filesDir, "models/gguf")
            if (!modelsDir.exists()) {
                modelsDir.mkdirs()
            }
            promise.resolve(modelsDir.absolutePath)
        } catch (e: Exception) {
            promise.reject("DIR_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getStorageInfo(promise: Promise) {
        try {
            val path = reactContext.filesDir
            val stat = StatFs(path.path)
            val blockSize = stat.blockSizeLong
            val availableBlocks = stat.availableBlocksLong
            val totalBlocks = stat.blockCountLong

            val map = Arguments.createMap().apply {
                putDouble("freeBytes", (availableBlocks * blockSize).toDouble())
                putDouble("totalBytes", (totalBlocks * blockSize).toDouble())
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("STORAGE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun downloadModel(
        downloadId: String,
        url: String,
        destPath: String,
        resume: Boolean,
        promise: Promise
    ) {
        Thread {
            try {
                cancelledJobs[downloadId] = false
                val destFile = File(destPath)
                val destDir = destFile.parentFile
                if (destDir != null && !destDir.exists()) {
                    destDir.mkdirs()
                }

                val partFile = File("$destPath.part")
                var existingBytes = 0L

                val requestBuilder = Request.Builder().url(url)
                if (resume && partFile.exists() && partFile.length() > 0) {
                    existingBytes = partFile.length()
                    requestBuilder.header("Range", "bytes=$existingBytes-")
                }

                val request = requestBuilder.build()
                val call = client.newCall(request)
                activeCalls[downloadId] = call

                val response = call.execute()
                if (!response.isSuccessful && response.code != 206) {
                    activeCalls.remove(downloadId)
                    promise.reject("HTTP_ERROR", "Server returned HTTP ${response.code}: ${response.message}")
                    return@Thread
                }

                val body = response.body
                if (body == null) {
                    activeCalls.remove(downloadId)
                    promise.reject("EMPTY_BODY", "Response body is empty")
                    return@Thread
                }

                val contentLength = body.contentLength()
                val totalBytes = if (contentLength > 0) {
                    if (response.code == 206) contentLength + existingBytes else contentLength
                } else {
                    -1L
                }

                val inputStream: InputStream = body.byteStream()
                val outputStream = if (response.code == 206 && existingBytes > 0) {
                    FileOutputStream(partFile, true)
                } else {
                    FileOutputStream(partFile, false)
                }

                val buffer = ByteArray(64 * 1024) // 64KB buffer
                var bytesRead: Int
                var totalDownloaded = if (response.code == 206) existingBytes else 0L
                var lastEmitTime = System.currentTimeMillis()
                var lastDownloadedBytes = totalDownloaded

                try {
                    while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                        if (cancelledJobs[downloadId] == true) {
                            outputStream.flush()
                            outputStream.close()
                            inputStream.close()
                            activeCalls.remove(downloadId)
                            cancelledJobs.remove(downloadId)
                            promise.reject("CANCELLED", "Download cancelled by user")
                            return@Thread
                        }

                        outputStream.write(buffer, 0, bytesRead)
                        totalDownloaded += bytesRead

                        val now = System.currentTimeMillis()
                        if (now - lastEmitTime >= 250) { // Emit every 250ms
                            val timeDeltaSec = (now - lastEmitTime) / 1000.0
                            val bytesDelta = totalDownloaded - lastDownloadedBytes
                            val speedBytesPerSec = if (timeDeltaSec > 0) (bytesDelta / timeDeltaSec).toLong() else 0L
                            val progress = if (totalBytes > 0) totalDownloaded.toDouble() / totalBytes.toDouble() else 0.0

                            val eventMap = Arguments.createMap().apply {
                                putString("downloadId", downloadId)
                                putDouble("bytesDownloaded", totalDownloaded.toDouble())
                                putDouble("totalBytes", totalBytes.toDouble())
                                putDouble("progress", progress)
                                putDouble("speedBytesPerSec", speedBytesPerSec.toDouble())
                            }
                            sendEvent("onModelDownloadProgress", eventMap)

                            lastEmitTime = now
                            lastDownloadedBytes = totalDownloaded
                        }
                    }

                    outputStream.flush()
                } finally {
                    outputStream.close()
                    inputStream.close()
                    activeCalls.remove(downloadId)
                    cancelledJobs.remove(downloadId)
                }

                // Atomic rename from .part to final destination
                if (destFile.exists()) {
                    destFile.delete()
                }
                val renamed = partFile.renameTo(destFile)
                if (!renamed) {
                    // Fallback copy if rename fails across filesystems
                    partFile.copyTo(destFile, overwrite = true)
                    partFile.delete()
                }

                val resultMap = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("localPath", destFile.absolutePath)
                    putDouble("totalBytes", destFile.length().toDouble())
                }
                promise.resolve(resultMap)

            } catch (e: Exception) {
                activeCalls.remove(downloadId)
                cancelledJobs.remove(downloadId)
                promise.reject("DOWNLOAD_FAILED", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun cancelDownload(downloadId: String, promise: Promise) {
        try {
            cancelledJobs[downloadId] = true
            val call = activeCalls.remove(downloadId)
            call?.cancel()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun verifyModelFile(
        filePath: String,
        expectedSize: Double,
        expectedSha256: String?,
        promise: Promise
    ) {
        Thread {
            try {
                val file = File(filePath)
                if (!file.exists() || !file.isFile) {
                    val map = Arguments.createMap().apply {
                        putBoolean("valid", false)
                        putString("reason", "FILE_NOT_FOUND")
                    }
                    promise.resolve(map)
                    return@Thread
                }

                val actualSize = file.length()
                // If expectedSize > 0, ensure it matches within 5% or exact if specified
                if (expectedSize > 0 && Math.abs(actualSize - expectedSize.toLong()) > (expectedSize * 0.1).toLong()) {
                    val map = Arguments.createMap().apply {
                        putBoolean("valid", false)
                        putString("reason", "SIZE_MISMATCH")
                        putDouble("actualSize", actualSize.toDouble())
                        putDouble("expectedSize", expectedSize)
                    }
                    promise.resolve(map)
                    return@Thread
                }

                var sha256Hex = ""
                if (!expectedSha256.isNullOrBlank()) {
                    val digest = MessageDigest.getInstance("SHA-256")
                    file.inputStream().use { input ->
                        val buffer = ByteArray(256 * 1024)
                        var bytesRead: Int
                        while (input.read(buffer).also { bytesRead = it } != -1) {
                            digest.update(buffer, 0, bytesRead)
                        }
                    }
                    val hashBytes = digest.digest()
                    sha256Hex = hashBytes.joinToString("") { "%02x".format(it) }

                    if (!sha256Hex.equals(expectedSha256, ignoreCase = true)) {
                        val map = Arguments.createMap().apply {
                            putBoolean("valid", false)
                            putString("reason", "CHECKSUM_MISMATCH")
                            putString("actualSha256", sha256Hex)
                            putString("expectedSha256", expectedSha256)
                        }
                        promise.resolve(map)
                        return@Thread
                    }
                }

                val map = Arguments.createMap().apply {
                    putBoolean("valid", true)
                    putDouble("size", actualSize.toDouble())
                    putString("sha256", sha256Hex)
                    putString("path", file.absolutePath)
                }
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("VERIFY_ERROR", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun deleteModelFile(filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            var deleted = false
            if (file.exists()) {
                deleted = file.delete()
            }
            val partFile = File("$filePath.part")
            if (partFile.exists()) {
                partFile.delete()
            }
            promise.resolve(deleted)
        } catch (e: Exception) {
            promise.reject("DELETE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun listModelFiles(promise: Promise) {
        try {
            val candidateDirs = listOf(
                File(reactContext.filesDir, "models/gguf"),
                File(reactContext.filesDir, "models"),
                File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "models"),
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            )
            val array = Arguments.createArray()
            val seenPaths = HashSet<String>()
            for (dir in candidateDirs) {
                if (dir.exists() && dir.isDirectory) {
                    val files = dir.listFiles { _, name -> name.endsWith(".gguf", ignoreCase = true) }
                    files?.forEach { f ->
                        if (!seenPaths.contains(f.absolutePath)) {
                            seenPaths.add(f.absolutePath)
                            val map = Arguments.createMap().apply {
                                putString("name", f.name)
                                putString("path", f.absolutePath)
                                putDouble("sizeBytes", f.length().toDouble())
                                putDouble("modifiedAt", f.lastModified().toDouble())
                            }
                            array.pushMap(map)
                        }
                    }
                }
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("LIST_ERROR", e.message, e)
        }
    }
}
