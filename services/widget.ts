import { NativeModules, Platform } from 'react-native';
import { getDb } from './db/client';
import { getDashboardStats } from './db/queries';

const WidgetModule = NativeModules.WidgetModule;

/**
 * Met à jour le widget Android avec les données actuelles
 * @param kanji Le Kanji à afficher
 * @param progress La progression du jour (0-100)
 * @param scoreText Le texte du score (ex: "12/20")
 */
export function updateAndroidWidget(kanji: string, progress: number, scoreText: string) {
  if (Platform.OS === 'android' && WidgetModule) {
    WidgetModule.updateWidget(kanji, progress, scoreText);
  }
}

/**
 * Utilitaire pour mettre à jour le widget à partir des données globales
 */
export async function refreshWidgetData() {
  if (Platform.OS !== 'android') return;

  try {
    const stats = await getDashboardStats();
    
    // 1. Calculer la progression
    const progress = Math.min(100, Math.round((stats.dailyProgress / stats.dailyGoal) * 100));
    const scoreText = `${stats.dailyProgress}/${stats.dailyGoal}`;

    // 2. Choisir un Kanji aléatoire pour le widget (Immersion)
    const db = await getDb();
    
    // On essaye de prendre un Kanji que l'utilisateur est en train d'apprendre
    // pour que ce soit plus utile
    let kanjiToDisplay = "漢";
    try {
      const randomKanji = await db.getFirstAsync<{literal: string}>(
        'SELECT kd.literal FROM kanji_data kd JOIN user_kanji_stats uks ON kd.id = uks.kanji_id ORDER BY RANDOM() LIMIT 1'
      );
      if (randomKanji) kanjiToDisplay = randomKanji.literal;
    } catch (e) {
      // Fallback sur n'importe quel Kanji si aucun n'est appris
      const fallback = await db.getFirstAsync<{literal: string}>('SELECT literal FROM kanji_data ORDER BY RANDOM() LIMIT 1');
      if (fallback) kanjiToDisplay = fallback.literal;
    }

    // 3. Envoyer au natif
    updateAndroidWidget(kanjiToDisplay, progress, scoreText);
  } catch (e) {
    console.warn("Erreur lors de la mise à jour du widget:", e);
  }
}
