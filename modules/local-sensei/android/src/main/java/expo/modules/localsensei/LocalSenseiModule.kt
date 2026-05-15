package expo.modules.localsensei

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.google.ai.edge.litertlm.*
import java.io.File
import kotlinx.coroutines.*
import android.os.SystemClock

class LocalSenseiModule : Module() {
  private var engine: Engine? = null
  private var conversation: Conversation? = null
  private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

  override fun definition() = ModuleDefinition {
    Name("LocalSensei")

    Events("onTokenReceived")

    Function("isModelPresent") { modelPath: String ->
      File(modelPath).exists()
    }

    AsyncFunction("initializeEngine") { modelPath: String ->
      try {
        if (!File(modelPath).exists()) {
          return@AsyncFunction "Error: Model file not found at $modelPath"
        }

        var gpuDetail = ""
        try {
          // Simplified config for 0.11.0 compatibility
          val config = EngineConfig(modelPath = modelPath, backend = Backend.GPU())
          engine = Engine(config)
          engine?.initialize()
          conversation = engine?.createConversation()
          
          // WARM-UP
          scope.launch {
            try {
              conversation?.sendMessage(Message.user(" "))
            } catch (e: Exception) {}
          }
          
          return@AsyncFunction "Success (GPU)"
        } catch (gpuError: Exception) {
          gpuDetail = gpuError.message ?: "Unknown GPU error"
        }

        try {
          val config = EngineConfig(modelPath = modelPath, backend = Backend.CPU())
          engine = Engine(config)
          engine?.initialize()
          conversation = engine?.createConversation()
          
          // WARM-UP
          scope.launch {
            try {
              conversation?.sendMessage(Message.user(" "))
            } catch (e: Exception) {}
          }
          
          "Success (CPU Fallback: $gpuDetail)"
        } catch (cpuError: Exception) {
          "Error: CPU failed too: ${cpuError.message}"
        }
      } catch (e: Exception) {
        "Error: ${e.message}"
      }
    }

    AsyncFunction("sendMessage") { text: String ->
      try {
        val currentConv = conversation ?: return@AsyncFunction "Error: Engine not initialized"
        val userMessage = Message.user(text)
        
        scope.launch {
          try {
            val startTime = SystemClock.elapsedRealtime()
            val response = currentConv.sendMessage(userMessage)
            
            // Robust parsing of the response string to extract pure text
            val rawResponse = response.toString()
            var fullResponse = rawResponse
            
            // Handle the "Text(text=...)" wrapper if present
            if (rawResponse.contains("Text(text=")) {
              val match = Regex("Text\\(text=(.*)\\)").find(rawResponse)
              if (match != null) {
                fullResponse = match.groupValues[1]
              }
            }
            
            val chunks = fullResponse.split(" ")
            var accumulatedText = ""
            var tokenCount = 0
            var lastEmitTime = SystemClock.elapsedRealtime()
            
            for (i in chunks.indices) {
              accumulatedText += chunks[i] + " "
              tokenCount++
              
              val currentTime = SystemClock.elapsedRealtime()
              
              if (currentTime - lastEmitTime >= 100 || i == chunks.size - 1) {
                val durationSec = (currentTime - startTime).toDouble() / 1000.0
                val tps = if (durationSec > 0) (tokenCount * 1.3) / durationSec else 0.0
                
                this@LocalSenseiModule.sendEvent("onTokenReceived", mapOf(
                  "text" to accumulatedText,
                  "isDone" to (i == chunks.size - 1),
                  "tps" to "%.1f".format(tps)
                ))
                lastEmitTime = currentTime
              }
              delay(15)
            }
          } catch (e: Exception) {
            this@LocalSenseiModule.sendEvent("onTokenReceived", mapOf(
              "text" to "Error: ${e.message}",
              "isDone" to true,
              "tps" to "0.0"
            ))
          }
        }
        "Generation started"
      } catch (e: Exception) {
        "Error: ${e.message}"
      }
    }

    Function("close") {
      conversation = null
      engine?.close()
      engine = null
      scope.cancel()
    }
  }
}
