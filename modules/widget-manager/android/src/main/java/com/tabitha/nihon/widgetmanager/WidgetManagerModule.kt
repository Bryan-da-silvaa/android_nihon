package com.tabitha.nihon.widgetmanager

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.URL

class WidgetManagerModule : Module() {
  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  override fun definition() = ModuleDefinition {
    Name("WidgetManager")

    Function("setWidgetData") { data: String ->
      val context = appContext.reactContext
      if (context != null) {
          val sharedPreferences = context.getSharedPreferences("NihonWidgetData", android.content.Context.MODE_PRIVATE)
          sharedPreferences.edit().putString("widget_data", data).apply()
          
          // Notifier le widget Android de se mettre à jour
          try {
            val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
            val componentName = android.content.ComponentName(context, "com.tabitha.nihon.widget.NihonGlanceWidgetReceiver")
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            
            if (appWidgetIds.isNotEmpty()) {
              val intent = android.content.Intent(context, Class.forName("com.tabitha.nihon.widget.NihonGlanceWidgetReceiver"))
              intent.action = android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE
              intent.putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
              context.sendBroadcast(intent)
            }
          } catch (e: Exception) {
            // Ignorer si la classe n'existe pas ou erreur
          }
      }
    }

    Function("startLockScreenService") {
        val context = appContext.reactContext
        if (context != null) {
            val prefs = context.getSharedPreferences("NihonWidgetData", android.content.Context.MODE_PRIVATE)
            val isEnabled = prefs.getBoolean("lock_screen_enabled", true)
            
            if (isEnabled) {
                try {
                    val intent = android.content.Intent(context, Class.forName("com.tabitha.nihon.widget.LockScreenService"))
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
  }
}

