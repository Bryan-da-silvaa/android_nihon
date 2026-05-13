package expo.modules.digitalink

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

import com.google.mlkit.vision.digitalink.*
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager

class StrokePointRecord : Record {
    @Field var x: Float = 0f
    @Field var y: Float = 0f
    @Field var t: Long? = null
}

class StrokeRecord : Record {
    @Field var points: List<StrokePointRecord> = emptyList()
}

class ExpoDigitalInkModule : Module() {
    private var recognizer: DigitalInkRecognizer? = null

    override fun definition() = ModuleDefinition {
        Name("ExpoDigitalInkModule")

        AsyncFunction("downloadModel") { promise: Promise ->
            try {
                val modelIdentifier = DigitalInkRecognitionModelIdentifier.fromLanguageTag("ja")
                if (modelIdentifier == null) {
                    promise.reject("ERR_MODEL", "Failed to get model identifier", null)
                    return@AsyncFunction
                }
                
                val model = DigitalInkRecognitionModel.builder(modelIdentifier).build()
                val remoteModelManager = RemoteModelManager.getInstance()
                
                remoteModelManager.isModelDownloaded(model).addOnSuccessListener { isDownloaded ->
                    if (isDownloaded) {
                        setupRecognizer(model)
                        promise.resolve(true)
                    } else {
                        val conditions = DownloadConditions.Builder().build() // Pas besoin de WiFi obligatoire
                        remoteModelManager.download(model, conditions)
                            .addOnSuccessListener {
                                setupRecognizer(model)
                                promise.resolve(true)
                            }
                            .addOnFailureListener { e ->
                                promise.reject("ERR_DOWNLOAD", "Failed to download model", e)
                            }
                    }
                }.addOnFailureListener { e ->
                    promise.reject("ERR_CHECK", "Failed to check model status", e)
                }
            } catch (e: Exception) {
                promise.reject("ERR_INIT", "Error initializing download", e)
            }
        }

        AsyncFunction("recognize") { strokesRecord: List<StrokeRecord>, promise: Promise ->
            if (recognizer == null) {
                promise.reject("ERR_NOT_READY", "Recognizer not initialized. Call downloadModel first.", null)
                return@AsyncFunction
            }

            try {
                val inkBuilder = Ink.builder()
                
                for (strokeRec in strokesRecord) {
                    val strokeBuilder = Ink.Stroke.builder()
                    for (pt in strokeRec.points) {
                        if (pt.t != null) {
                            strokeBuilder.addPoint(Ink.Point.create(pt.x, pt.y, pt.t!!))
                        } else {
                            strokeBuilder.addPoint(Ink.Point.create(pt.x, pt.y))
                        }
                    }
                    inkBuilder.addStroke(strokeBuilder.build())
                }
                
                val ink = inkBuilder.build()
                recognizer!!.recognize(ink)
                    .addOnSuccessListener { result ->
                        val candidates = result.candidates.map { it.text }
                        promise.resolve(candidates)
                    }
                    .addOnFailureListener { e ->
                        promise.reject("ERR_RECOGNIZE", "Recognition failed", e)
                    }
            } catch (e: Exception) {
                promise.reject("ERR_BUILD", "Error building ink object", e)
            }
        }
    }

    private fun setupRecognizer(model: DigitalInkRecognitionModel) {
        if (recognizer == null) {
            val options = DigitalInkRecognizerOptions.builder(model).build()
            recognizer = DigitalInkRecognition.getClient(options)
        }
    }
}
