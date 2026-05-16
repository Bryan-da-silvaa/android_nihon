package com.tabitha.nihon.widget

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.database.sqlite.SQLiteDatabase
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class LockScreenService : Service() {

    private val CHANNEL_ID = "NihonLockScreenServiceChannel"

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == Intent.ACTION_SCREEN_ON) {
                // Lancer l'activité native quand l'écran s'allume
                launchLockScreenActivity(context)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        
        // Enregistrer le receiver pour écouter quand l'écran s'allume ou s'éteint
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_SCREEN_OFF)
        }
        registerReceiver(screenReceiver, filter)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Nihon Immersion Active")
            .setContentText("Le mode apprentissage sur écran de verrouillage est activé.")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .build()

        startForeground(1, notification)
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(screenReceiver)
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun launchLockScreenActivity(context: Context) {
        var literal = ""
        var reading = ""
        var meaning = ""

        try {
            val defaultDb = context.getDatabasePath("nihon_mobile.db")
            val expoLegacyDb = java.io.File(context.filesDir, "SQLite/nihon_mobile.db")
            val dbFile = if (defaultDb.exists()) defaultDb else if (expoLegacyDb.exists()) expoLegacyDb else null

            if (dbFile != null) {
                val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
                val cursor = db.rawQuery(
                    "SELECT kd.literal, kd.readings_on, kd.readings_kun, kd.meanings_fr, kd.meanings_en " +
                    "FROM kanji_data kd " +
                    "JOIN user_kanji_stats uks ON kd.id = uks.kanji_id " +
                    "ORDER BY RANDOM() LIMIT 1", null
                )

                if (cursor.moveToFirst()) {
                    literal = cursor.getString(0) ?: ""
                    val readOn = cursor.getString(1)
                    val readKun = cursor.getString(2)
                    val meanFr = cursor.getString(3)
                    val meanEn = cursor.getString(4)

                    val readingStr = if (!readOn.isNullOrEmpty() && readOn != "[]") readOn else readKun
                    val meaningStr = if (!meanFr.isNullOrEmpty() && meanFr != "[]") meanFr else meanEn

                    reading = cleanString(readingStr).takeIf { it.isNotEmpty() } ?: "カン"
                    meaning = cleanString(meaningStr).takeIf { it.isNotEmpty() } ?: "Chine"
                }
                cursor.close()
                db.close()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Si aucun kanji n'a été trouvé (0 kanji appris ou DB introuvable), on ne lance PAS l'écran intrusif
        if (literal.isEmpty()) {
            return
        }

        // Lancer l'activité LockScreenActivity avec le vrai Kanji
        val intent = Intent(context, LockScreenActivity::class.java).apply {
            putExtra("KANJI", literal)
            putExtra("READING", reading)
            putExtra("MEANING", meaning)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        
        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
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

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Canal Service d'Immersion Nihon",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }
}
