package com.tabitha.nihon.widget

import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

class LockScreenTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        updateTileState()
    }

    override fun onClick() {
        super.onClick()
        val prefs = getSharedPreferences("NihonWidgetData", Context.MODE_PRIVATE)
        val isEnabled = prefs.getBoolean("lock_screen_enabled", true) // Activé par défaut
        
        val newState = !isEnabled
        prefs.edit().putBoolean("lock_screen_enabled", newState).apply()
        
        if (newState) {
            val intent = Intent(this, LockScreenService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        } else {
            val intent = Intent(this, LockScreenService::class.java)
            stopService(intent)
        }
        
        updateTileState()
    }

    private fun updateTileState() {
        val tile = qsTile ?: return
        val prefs = getSharedPreferences("NihonWidgetData", Context.MODE_PRIVATE)
        val isEnabled = prefs.getBoolean("lock_screen_enabled", true)
        
        tile.state = if (isEnabled) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
        tile.label = "Nihon Immersion"
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            tile.subtitle = if (isEnabled) "Activé" else "Désactivé"
        }
        
        tile.updateTile()
    }
}
