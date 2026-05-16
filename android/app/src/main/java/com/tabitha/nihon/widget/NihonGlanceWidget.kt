package com.tabitha.nihon.widget

import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.appwidget.cornerRadius
import org.json.JSONObject
import android.content.Intent
import android.net.Uri

class NihonGlanceWidget : GlanceAppWidget() {

    override val sizeMode = androidx.glance.appwidget.SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val sharedPref = context.getSharedPreferences("NihonWidgetData", Context.MODE_PRIVATE)
        val jsonString = sharedPref.getString("widget_data", null)

        var kanji = "漢"
        var reading = "カン"
        var meaning = "Chine, Han"
        var actionUrl = "nihon://"
        
        // Couleurs par défaut (Indigo Zen)
        var hexBg = "#1E1E24"
        var hexText = "#FFFFFF"
        var hexSubtext = "#A1A1AA"
        var hexAccent = "#8B5CF6"

        if (jsonString != null) {
            try {
                val json = JSONObject(jsonString)
                kanji = json.optString("kanji", kanji)
                reading = json.optString("reading", reading)
                meaning = json.optString("meaning", meaning)
                actionUrl = json.optString("actionUrl", actionUrl)
                
                val themeObj = json.optJSONObject("theme")
                if (themeObj != null) {
                    hexBg = themeObj.optString("hexBg", hexBg)
                    hexText = themeObj.optString("hexText", hexText)
                    hexSubtext = themeObj.optString("hexSubtext", hexSubtext)
                    hexAccent = themeObj.optString("hexAccent", hexAccent)
                }
            } catch (e: Exception) {
                // Ignore parsing errors
            }
        }

        provideContent {
            val size = androidx.glance.LocalSize.current
            val width = size.width
            val height = size.height

            // Calculer la taille dynamique de la police en fonction des dimensions
            val kanjiSize = when {
                width >= 250.dp && height >= 250.dp -> 130.sp
                width >= 200.dp && height >= 200.dp -> 96.sp
                width >= 150.dp && height >= 150.dp -> 72.sp
                else -> 48.sp
            }

            val readingSize = when {
                width >= 200.dp && height >= 200.dp -> 20.sp
                width >= 150.dp && height >= 150.dp -> 16.sp
                else -> 12.sp
            }

            val meaningSize = when {
                width >= 200.dp && height >= 200.dp -> 18.sp
                width >= 150.dp && height >= 150.dp -> 14.sp
                else -> 12.sp
            }

            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(Color(android.graphics.Color.parseColor(hexBg)))
                    .cornerRadius(24.dp)
                    .padding(16.dp)
                    .clickable(actionStartActivity(
                        Intent(Intent.ACTION_VIEW).apply {
                            data = Uri.parse(actionUrl)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            setPackage(context.packageName)
                        }
                    )),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    modifier = GlanceModifier.fillMaxSize(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = reading,
                        style = TextStyle(
                            color = androidx.glance.unit.ColorProvider(Color(android.graphics.Color.parseColor(hexAccent))),
                            fontSize = readingSize,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Spacer(modifier = GlanceModifier.height(4.dp))
                    Text(
                        text = kanji,
                        style = TextStyle(
                            color = androidx.glance.unit.ColorProvider(Color(android.graphics.Color.parseColor(hexText))),
                            fontSize = kanjiSize,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Spacer(modifier = GlanceModifier.height(8.dp))
                    Text(
                        text = meaning,
                        style = TextStyle(
                            color = androidx.glance.unit.ColorProvider(Color(android.graphics.Color.parseColor(hexSubtext))),
                            fontSize = meaningSize
                        )
                    )
                }
            }
        }
    }
}
