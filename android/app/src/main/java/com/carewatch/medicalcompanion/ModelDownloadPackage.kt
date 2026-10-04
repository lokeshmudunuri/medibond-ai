package com.carewatch.medicalcompanion

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ModelDownloadPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            ModelDownloadModule(reactContext),
            NativeDocumentCaptureModule(reactContext),
            NativeOCRModule(reactContext),
            NativeVoiceModule(reactContext),
            NativeNotificationModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
