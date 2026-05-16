import { WidgetManagerModule } from '../modules/widget-manager';
import { getDb } from './db/client';
import { getDashboardStats, getUserProfile } from './db/queries';
import { clean } from './db/utils';
import { Themes, AppTheme } from '../context/ThemeContext';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';

const WIDGET_UPDATE_TASK = 'WIDGET_UPDATE_TASK';

// Définition globale de la tâche (doit être exécutée au chargement du fichier JS)
TaskManager.defineTask(WIDGET_UPDATE_TASK, async () => {
  try {
    console.log("🔄 Background Fetch : Mise à jour du widget...");
    await refreshWidgetData();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("❌ Erreur Background Task Widget:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export interface WidgetData {
  kanji: string;
  reading: string;
  meaning: string;
  progress: number;
  streak: number;
  actionUrl: string;
  theme: {
    hexBg: string;
    hexText: string;
    hexSubtext: string;
    hexAccent: string;
  };
}

/**
 * Met à jour les données partagées pour les widgets natifs (Glance / WidgetKit)
 */
export async function refreshWidgetData() {
  try {
    const stats = await getDashboardStats();
    const progress = stats.dailyGoal > 0 ? Math.min(100, Math.round((stats.dailyProgress / stats.dailyGoal) * 100)) : 0;
    const streak = stats.streak || 0;

    const profile = await getUserProfile();
    const activeThemeColors = Themes[(profile?.app_theme as AppTheme) || 'indigo_zen'];

    const db = await getDb();
    let kanji = "漢";
    let reading = "カン";
    let meaning = "Chine, Han";
    let actionUrl = "nihon://";

    try {
      // Priorité 1 : Leech (Le kanji avec le plus d'échecs)
      const leech = await db.getFirstAsync<{id: number, literal: string, meanings_fr: string, meanings_en: string, readings_on: string, readings_kun: string}>(
        `SELECT kd.* FROM user_kanji_stats uks 
         JOIN kanji_data kd ON uks.kanji_id = kd.id 
         WHERE uks.fail_count >= 3 
         ORDER BY RANDOM() LIMIT 1`
      );

      // Priorité 2 : Prochain à réviser
      const due = await db.getFirstAsync<{id: number, literal: string, meanings_fr: string, meanings_en: string, readings_on: string, readings_kun: string}>(
        `SELECT kd.* FROM user_kanji_stats uks 
         JOIN kanji_data kd ON uks.kanji_id = kd.id 
         WHERE uks.next_review <= ? 
         ORDER BY uks.next_review ASC LIMIT 1`,
         [new Date().toISOString()]
      );

      // Priorité 3 : Un kanji en cours d'apprentissage aléatoire
      const random = await db.getFirstAsync<{id: number, literal: string, meanings_fr: string, meanings_en: string, readings_on: string, readings_kun: string}>(
        `SELECT kd.* FROM kanji_data kd 
         JOIN user_kanji_stats uks ON kd.id = uks.kanji_id 
         ORDER BY RANDOM() LIMIT 1`
      );

      const target = leech || due || random;

      if (target) {
        kanji = target.literal;
        meaning = clean(target.meanings_fr || target.meanings_en);
        reading = clean(target.readings_on || target.readings_kun);
        actionUrl = `nihon://learn_kanji?literal=${encodeURIComponent(target.literal)}`;
      }
    } catch (e) {
      console.warn("Erreur lors de la sélection du Kanji pour le widget:", e);
    }

    const widgetData: WidgetData = {
      kanji,
      reading,
      meaning,
      progress,
      streak,
      actionUrl,
      theme: {
        hexBg: activeThemeColors.hexCard, // hexCard for widget background to feel premium
        hexText: activeThemeColors.hexText,
        hexSubtext: activeThemeColors.hexSubtext,
        hexAccent: activeThemeColors.hexAccent
      }
    };

    // Envoyer au module natif
    WidgetManagerModule.setWidgetData(JSON.stringify(widgetData));
  } catch (e) {
    console.warn("Erreur globale refreshWidgetData:", e);
  }
}

/**
 * Enregistre la tâche pour s'exécuter périodiquement en arrière-plan.
 * L'OS décide du moment exact, mais on demande environ toutes les 4 heures.
 */
export async function registerWidgetUpdateTask() {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
      console.warn("⚠️ Background Task refusé ou restreint par le système.");
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(WIDGET_UPDATE_TASK);
    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(WIDGET_UPDATE_TASK, {
        minimumInterval: 240, // 4 heures (en minutes)
      });
      console.log("✅ Background Task du Widget enregistré !");
    }
  } catch (err) {
    console.error("Erreur lors de l'enregistrement de la tâche de widget:", err);
  }
}

