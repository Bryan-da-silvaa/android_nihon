import { getDb } from './client';

async function importTable(db: any, tableName: string, columns: string[]) {
  try {
    // Note: require dynamique ne marche pas bien avec le bundler Metro, 
    // il vaut mieux faire un switch ou les passer en paramètre.
  } catch(e) {}
}

export async function seedDatabaseIfNeeded() {
  const db = await getDb();

  try {
    const result: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM kanji_data');
    if (result && result.count > 0) {
      console.log('ℹ️ [SQLite] Base de données déjà peuplée (' + result.count + ' kanjis). Ignoré.');
      return;
    }

    console.log('⏳ [SQLite] Début du peuplement TOTAL de la base de données...');

    // Fonction d'import générique
    const importData = async (tableName: string, data: any[], columns: string[]) => {
      if (!data || data.length === 0) return;
      console.log(`⏳ Insertion de ${data.length} lignes dans ${tableName}...`);
      
      await db.withTransactionAsync(async () => {
        const placeholders = columns.map(() => '?').join(', ');
        const statement = await db.prepareAsync(
          `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
        );
        
        for (const row of data) {
          const values = columns.map(col => row[col]);
          await statement.executeAsync(values);
        }
        await statement.finalizeAsync();
      });
      console.log(`✅ ${tableName} peuplé.`);
    };

    // Chargement des fichiers JSON (Metro requiert des chemins statiques)
    const tables = [
      { name: 'system_settings', data: require('../../assets/data/system_settings.json'), cols: ['id', 'config'] },
      { name: 'users', data: require('../../assets/data/users.json'), cols: ['id', 'username', 'password', 'learning_strategy', 'session_intensity', 'language', 'dark_mode', 'require_voice_answer', 'use_timer', 'time_limit', 'last_setup_mode', 'last_setup_selection', 'created_at', 'is_admin', 'banner', 'avatar', 'kanji', 'reading', 'games_played', 'total_correct', 'best_score_hiragana', 'best_score_katakana', 'best_score_mixed', 'enable_kana_audio', 'kanji_per_page'] },
      { name: 'user_vocabulary', data: require('../../assets/data/user_vocabulary.json'), cols: ['id', 'user_id', 'word', 'reading', 'status', 'updated_at'] },
      { name: 'game_sessions', data: require('../../assets/data/game_sessions.json'), cols: ['id', 'user_id', 'mode', 'score', 'total', 'duration_seconds', 'created_at'] },
      { name: 'kana_stats', data: require('../../assets/data/kana_stats.json'), cols: ['id', 'user_id', 'kana', 'attempts', 'correct', 'last_seen', 'srs_interval', 'srs_repetition', 'srs_ease_factor', 'srs_next_review', 'srs_streak', 'srs_lapses', 'srs_last_quality'] },
      { name: 'dictionary', data: require('../../assets/data/dictionary.json'), cols: ['id', 'ent_seq', 'word', 'reading', 'meaning_en', 'meaning_fr', 'is_common', 'pos'] },
      { name: 'kanji_data', data: require('../../assets/data/kanji_data.json'), cols: ['id', 'literal', 'jlpt', 'grade', 'stroke_count', 'frequency', 'readings_on', 'readings_kun', 'meanings_en', 'meanings_fr', 'radicals', 'is_radical'] },
      { name: 'user_kanji_stats', data: require('../../assets/data/user_kanji_stats.json'), cols: ['id', 'user_id', 'kanji_id', 'level', 'next_review', 'interval_days', 'repetition', 'ease_factor', 'last_seen'] }
    ];

    for (const table of tables) {
      try {
        await importData(table.name, table.data, table.cols);
      } catch (e) {
        console.error(`❌ Erreur lors de l'import de ${table.name}:`, e);
      }
    }

    console.log('✅ [SQLite] Peuplement total terminé avec succès.');
  } catch (error) {
    console.error('❌ [SQLite] Erreur majeure lors du peuplement :', error);
    throw error;
  }
}
