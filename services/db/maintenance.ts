import { getDb } from './client';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Exporte la base de données SQLite pour sauvegarde.
 */
export async function exportDatabase(mode: 'share' | 'download' = 'share') {
  try {
    const dbName = 'nihon_mobile.db';
    
    // 1. Accéder au dossier SQLite de l'application
    const sqliteDir = new Directory(Paths.document, 'SQLite');
    const dbFile = new File(sqliteDir, dbName);

    // 2. Vérifier si le fichier existe avec la nouvelle API
    if (!dbFile.exists) {
      throw new Error(`Aucune donnée à sauvegarder pour le moment.`);
    }

    if (mode === 'download') {
      // 3. Ouvrir l'explorateur de fichiers natif de l'OS (Téléchargements, Documents...)
      const destDir = await Directory.pickDirectoryAsync();
      
      if (!destDir) return false;

      // 4. Sur Android (Storage Access Framework), on ne peut pas instancier un File avec une simple chaîne.
      // Il faut demander au dossier de créer le fichier de manière sécurisée via l'API native.
      // @ts-ignore : createFile existe sur Directory selon la doc v54
      const backupFile = destDir.createFile('nihon_sauvegarde.db', 'application/x-sqlite3');

      // 5. Lire le contenu de la base et l'écrire dans le nouveau fichier
      // Cela évite l'utilisation de copy() qui est parfois capricieux avec les URIs opaques de SAF
      backupFile.write(dbFile.bytesSync());

      return true;
    } else {
      // Mode PARTAGE (Share)
      const backupFile = new File(Paths.cache, `${dbName}.tmp`);

      if (backupFile.exists) {
        backupFile.delete();
      }

      dbFile.copy(backupFile);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(backupFile.uri, {
          mimeType: 'application/x-sqlite3',
          dialogTitle: 'Sauvegarder ma progression Nihon'
        });
        return true;
      } else {
        throw new Error("Le partage n'est pas disponible sur cet appareil.");
      }
    }
  } catch (error: any) {
    console.error("Erreur lors de l'exportation:", error);
    throw new Error(error.message || "Une erreur est survenue lors de l'export.");
  }
}

/**
 * Réinitialise toute la progression de l'utilisateur.
 */
export async function resetAllProgress() {
  try {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      // 1. Réinitialiser les stats SRS
      await db.execAsync('DELETE FROM user_kanji_stats');
      await db.execAsync(`
        UPDATE kana_stats SET 
          srs_repetition = 0, 
          srs_interval = 0, 
          srs_ease_factor = 2.5, 
          srs_next_review = CURRENT_TIMESTAMP, 
          srs_streak = 0, 
          srs_lapses = 0
      `);
      await db.execAsync(`
        UPDATE custom_cards SET 
          repetition = 0, 
          interval_days = 0, 
          ease_factor = 2.5, 
          next_review = CURRENT_TIMESTAMP
      `);
      
      // 2. Supprimer l'historique
      await db.execAsync('DELETE FROM game_sessions');
      await db.execAsync('DELETE FROM user_vocabulary');
      
      // 3. Réinitialiser le profil utilisateur
      await db.execAsync(`
        UPDATE users SET 
          games_played = 0, 
          total_correct = 0, 
          best_score_hiragana = 0, 
          best_score_katakana = 0, 
          best_score_mixed = 0,
          streak_count = 0,
          last_study_date = NULL
      `);
    });
    console.log("✅ [Maintenance] Progression réinitialisée.");
  } catch (error: any) {
    console.error("Erreur lors de la réinitialisation:", error);
    throw new Error(error.message || "Impossible de réinitialiser la progression.");
  }
}
