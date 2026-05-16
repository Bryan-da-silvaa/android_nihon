package com.tabitha.nihon.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File

class UnlockReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_USER_PRESENT) {
            MainScope().launch {
                updateWidgetNatively(context)
            }
        }
    }

    private fun cleanString(input: String?): String {
        if (input.isNullOrEmpty() || input == "[]" || input == "null") return ""
        return try {
            input.replace(Regex("[\\[\\]\"]"), "").split(",").firstOrNull()?.trim() ?: input
        } catch (e: Exception) {
            input ?: ""
        }
    }

    private suspend fun updateWidgetNatively(context: Context) {
        try {
            val dbFile = context.getDatabasePath("nihon_mobile.db")
            if (!dbFile.exists()) return

            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)

            val cursor = db.rawQuery(
                "SELECT kd.literal, kd.readings_on, kd.readings_kun, kd.meanings_fr, kd.meanings_en " +
                "FROM kanji_data kd " +
                "JOIN user_kanji_stats uks ON kd.id = uks.kanji_id " +
                "ORDER BY RANDOM() LIMIT 1", null
            )

            if (cursor.moveToFirst()) {
                val literal = cursor.getString(0) ?: "漢"
                val readOn = cursor.getString(1)
                val readKun = cursor.getString(2)
                val meanFr = cursor.getString(3)
                val meanEn = cursor.getString(4)

                val readingStr = if (!readOn.isNullOrEmpty() && readOn != "[]") readOn else readKun
                val meaningStr = if (!meanFr.isNullOrEmpty() && meanFr != "[]") meanFr else meanEn

                val reading = cleanString(readingStr).takeIf { it.isNotEmpty() } ?: "カン"
                val meaning = cleanString(meaningStr).takeIf { it.isNotEmpty() } ?: "Chine"

                cursor.close()
                db.close()

                val sharedPref = context.getSharedPreferences("NihonWidgetData", Context.MODE_PRIVATE)
                val oldJsonStr = sharedPref.getString("widget_data", "{}")
                val json = JSONObject(oldJsonStr ?: "{}")
                
                json.put("kanji", literal)
                json.put("reading", reading)
                json.put("meaning", meaning)
                json.put("actionUrl", "nihon://learn_kanji?literal=$literal")

                sharedPref.edit().putString("widget_data", json.toString()).apply()

                // Mettre à jour Glance
                NihonGlanceWidget().updateAll(context)

                // Pop-up Intrusif : Lancer l'application directement sur ce Kanji !
                val launchIntent = Intent(Intent.ACTION_VIEW).apply {
                    data = android.net.Uri.parse("nihon://learn_kanji?literal=$literal")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    setPackage(context.packageName)
                }
                
                try {
                    context.startActivity(launchIntent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            } else {
                cursor.close()
                db.close()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
