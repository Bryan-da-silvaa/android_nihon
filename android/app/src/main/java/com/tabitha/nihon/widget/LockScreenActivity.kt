package com.tabitha.nihon.widget

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class LockScreenActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Afficher par-dessus l'écran de verrouillage et réveiller l'écran
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        // Si on veut rendre l'écran complètement immersif (Optionnel)
        window.decorView.systemUiVisibility = (
            android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
            or android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        val kanji = intent.getStringExtra("KANJI") ?: "漢"
        val reading = intent.getStringExtra("READING") ?: "カン"
        val meaning = intent.getStringExtra("MEANING") ?: "Chine"

        // Récupérer le thème depuis les préférences (enregistré par refreshWidgetData)
        val sharedPref = getSharedPreferences("NihonWidgetData", android.content.Context.MODE_PRIVATE)
        val jsonString = sharedPref.getString("widget_data", null)
        
        var hexBg = "#0F172A"
        var hexText = "#FFFFFF"
        var hexSubtext = "#A1A1AA"
        var hexAccent = "#8B5CF6"

        if (jsonString != null) {
            try {
                val json = org.json.JSONObject(jsonString)
                val themeObj = json.optJSONObject("theme")
                if (themeObj != null) {
                    hexBg = themeObj.optString("hexBg", hexBg)
                    hexText = themeObj.optString("hexText", hexText)
                    hexSubtext = themeObj.optString("hexSubtext", hexSubtext)
                    hexAccent = themeObj.optString("hexAccent", hexAccent)
                }
            } catch (e: Exception) {
                // Ignore
            }
        }

        setContent {
            LockScreenUI(kanji, reading, meaning, hexBg, hexText, hexSubtext, hexAccent) { action ->
                when (action) {
                    "CLOSE" -> finish() // Fermer l'écran
                    "TRACE" -> {
                        // Lancer l'app principale et fermer cet écran
                        val launchIntent = Intent(Intent.ACTION_VIEW).apply {
                            data = Uri.parse("nihon://learn_kanji?literal=$kanji")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                            setPackage(packageName)
                        }
                        startActivity(launchIntent)
                        finish()
                    }
                }
            }
        }
    }
}

@Composable
fun LockScreenUI(kanji: String, reading: String, meaning: String, hexBg: String, hexText: String, hexSubtext: String, hexAccent: String, onAction: (String) -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(android.graphics.Color.parseColor(hexBg))),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(24.dp)
        ) {
            Text(
                text = reading,
                color = Color(android.graphics.Color.parseColor(hexAccent)),
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = kanji,
                color = Color(android.graphics.Color.parseColor(hexText)),
                fontSize = 120.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = meaning,
                color = Color(android.graphics.Color.parseColor(hexSubtext)),
                fontSize = 18.sp
            )
            
            Spacer(modifier = Modifier.height(64.dp))
            
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Button(
                    onClick = { onAction("CLOSE") },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)) // Bouton secondaire (slate)
                ) {
                    Text("J'ai compris", color = Color.White)
                }
                
                Button(
                    onClick = { onAction("TRACE") },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(android.graphics.Color.parseColor(hexAccent)))
                ) {
                    Text("Tracer dans l'App", color = Color.White)
                }
            }
        }
    }
}
