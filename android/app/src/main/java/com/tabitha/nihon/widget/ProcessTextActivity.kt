package com.tabitha.nihon.widget

import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

data class KanjiSearchResult(
    val literal: String,
    val reading: String,
    val meaning: String
)

class ProcessTextActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Récupérer le texte sélectionné par l'utilisateur dans le navigateur/app
        val selectedText = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString() ?: ""
        
        // On isole chaque caractère unique pour chercher si ce sont des Kanjis
        val uniqueChars = selectedText.toCharArray().map { it.toString() }.distinct()

        // Récupérer le thème
        val sharedPref = getSharedPreferences("NihonWidgetData", android.content.Context.MODE_PRIVATE)
        val jsonString = sharedPref.getString("widget_data", null)
        
        var hexBg = "#1E293B" // slate-800
        var hexText = "#FFFFFF"
        var hexSubtext = "#94A3B8"
        var hexAccent = "#8B5CF6"

        if (jsonString != null) {
            try {
                val json = org.json.JSONObject(jsonString)
                val themeObj = json.optJSONObject("theme")
                if (themeObj != null) {
                    hexBg = themeObj.optString("hexBg", hexBg) // Clé corrigée (c'est hexBg dans le JSON)
                    hexText = themeObj.optString("hexText", hexText)
                    hexSubtext = themeObj.optString("hexSubtext", hexSubtext)
                    hexAccent = themeObj.optString("hexAccent", hexAccent)
                }
            } catch (e: Exception) { }
        }

        setContent {
            var results by remember { mutableStateOf<List<KanjiSearchResult>>(emptyList()) }
            var isSearching by remember { mutableStateOf(true) }

            LaunchedEffect(selectedText) {
                results = searchKanjis(uniqueChars)
                isSearching = false
            }

            // Un fond transparent qui ferme l'activité si on clique dessus
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { finish() },
                contentAlignment = Alignment.Center
            ) {
                // Le popup de dictionnaire
                Card(
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
                        .padding(16.dp)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {},
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(android.graphics.Color.parseColor(hexBg))),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "Nihon Dict",
                            color = Color(android.graphics.Color.parseColor(hexAccent)),
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        if (isSearching) {
                            CircularProgressIndicator(color = Color(android.graphics.Color.parseColor(hexAccent)))
                        } else if (results.isEmpty()) {
                            Text(
                                text = "Aucun Kanji trouvé pour : $selectedText",
                                color = Color(android.graphics.Color.parseColor(hexText)),
                                fontSize = 16.sp
                            )
                        } else {
                            LazyColumn(
                                modifier = Modifier.heightIn(max = 300.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                items(results) { kanji ->
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = kanji.literal,
                                            color = Color(android.graphics.Color.parseColor(hexText)),
                                            fontSize = 48.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Spacer(modifier = Modifier.width(16.dp))
                                        Column {
                                            Text(
                                                text = kanji.reading,
                                                color = Color(android.graphics.Color.parseColor(hexAccent)),
                                                fontSize = 18.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                text = kanji.meaning,
                                                color = Color(android.graphics.Color.parseColor(hexSubtext)),
                                                fontSize = 14.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                        Button(
                            onClick = { finish() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155))
                        ) {
                            Text("Fermer", color = Color.White)
                        }
                    }
                }
            }
        }
    }

    private suspend fun searchKanjis(chars: List<String>): List<KanjiSearchResult> = withContext(Dispatchers.IO) {
        val results = mutableListOf<KanjiSearchResult>()
        if (chars.isEmpty()) return@withContext results

        try {
            val defaultDb = getDatabasePath("nihon_mobile.db")
            val expoLegacyDb = File(filesDir, "SQLite/nihon_mobile.db")
            val dbFile = if (defaultDb.exists()) defaultDb else if (expoLegacyDb.exists()) expoLegacyDb else null

            if (dbFile != null) {
                val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
                
                // On prépare les "?" pour la clause IN
                val placeholders = chars.joinToString(",") { "?" }
                val query = "SELECT literal, readings_on, readings_kun, meanings_fr, meanings_en " +
                            "FROM kanji_data WHERE literal IN ($placeholders)"

                val cursor = db.rawQuery(query, chars.toTypedArray())

                while (cursor.moveToNext()) {
                    val literal = cursor.getString(0) ?: continue
                    val readOn = cursor.getString(1)
                    val readKun = cursor.getString(2)
                    val meanFr = cursor.getString(3)
                    val meanEn = cursor.getString(4)

                    val readingStr = if (!readOn.isNullOrEmpty() && readOn != "[]") readOn else readKun
                    val meaningStr = if (!meanFr.isNullOrEmpty() && meanFr != "[]") meanFr else meanEn

                    val reading = cleanString(readingStr)
                    val meaning = cleanString(meaningStr)

                    if (reading.isNotEmpty() || meaning.isNotEmpty()) {
                        results.add(KanjiSearchResult(literal, reading, meaning))
                    }
                }
                cursor.close()
                db.close()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return@withContext results
    }

    private fun cleanString(input: String?): String {
        if (input.isNullOrEmpty() || input == "[]" || input == "null") return ""
        return try {
            input.replace(Regex("[\\[\\]\"]"), "").split(",").firstOrNull()?.trim() ?: input
        } catch (e: Exception) {
            input ?: ""
        }
    }
}
