import { getDb } from './client';

/**
 * Initialise le schéma de la base de données SQLite.
 * Reflète exactement l'architecture du projet Web (hors vidéos) 
 * pour faciliter les futurs exports/imports.
 */
export async function initializeSchema() {
  const db = await getDb();

  try {
    // Le schéma est maintenant stable, on ne supprime plus les tables au démarrage
    // pour conserver la progression de l'utilisateur.

    // 1. system_settings
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        config TEXT -- JSON stringifié
      );
    `);

    // 2. users (Pour les paramètres locaux et les best_scores)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, -- Conservé pour symétrie même si non utilisé localement
        learning_strategy TEXT DEFAULT 'balanced',
        session_intensity TEXT DEFAULT 'standard',
        language TEXT DEFAULT 'fr',
        dark_mode INTEGER DEFAULT 1, -- BOOLEAN n'existe pas en SQLite, on utilise 0/1
        require_voice_answer INTEGER DEFAULT 0,
        use_timer INTEGER DEFAULT 0,
        time_limit INTEGER DEFAULT 60,
        last_setup_mode TEXT DEFAULT 'both',
        last_setup_selection TEXT DEFAULT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_admin INTEGER DEFAULT 0,
        banner TEXT DEFAULT NULL,
        avatar TEXT DEFAULT NULL,
        kanji TEXT DEFAULT NULL,
        reading TEXT DEFAULT NULL,
        games_played INTEGER DEFAULT 0,
        total_correct INTEGER DEFAULT 0,
        best_score_hiragana INTEGER DEFAULT 0,
        best_score_katakana INTEGER DEFAULT 0,
        best_score_mixed INTEGER DEFAULT 0,
        enable_kana_audio INTEGER DEFAULT 1,
        kanji_per_page INTEGER DEFAULT 50,
        streak_count INTEGER DEFAULT 0,
        last_study_date TEXT DEFAULT NULL,
        daily_goal INTEGER DEFAULT 20,
        app_theme TEXT DEFAULT 'indigo_zen',
        kanji_trace_count INTEGER DEFAULT 10,
        brush_skin TEXT DEFAULT 'classic',
        show_exams INTEGER DEFAULT 1
      );
    `);

    // Migration : Ajout de colonnes manquantes si nécessaire
    try {
      const userCols: any[] = await db.getAllAsync('PRAGMA table_info(users)');
      const colNames = userCols.map(c => c.name);
      
      if (!colNames.includes('brush_skin')) {
        await db.execAsync("ALTER TABLE users ADD COLUMN brush_skin TEXT DEFAULT 'classic'");
        console.log("Migration: Added brush_skin column");
      }
      if (!colNames.includes('show_exams')) {
        await db.execAsync("ALTER TABLE users ADD COLUMN show_exams INTEGER DEFAULT 1");
        console.log("Migration: Added show_exams column");
      }
    } catch (migError) {
      console.warn("Migration failed or already applied:", migError);
    }

    // 3. user_vocabulary
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_vocabulary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        word TEXT NOT NULL,
        reading TEXT,
        status INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, word)
      );
    `);

    // 4. game_sessions (Historique)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        mode TEXT,
        score INTEGER,
        total INTEGER,
        duration_seconds INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. kana_stats
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS kana_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        kana TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        correct INTEGER DEFAULT 0,
        last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        srs_interval REAL DEFAULT 0,
        srs_repetition INTEGER DEFAULT 0,
        srs_ease_factor REAL DEFAULT 2.5,
        srs_next_review TEXT DEFAULT CURRENT_TIMESTAMP,
        srs_streak INTEGER DEFAULT 0,
        srs_lapses INTEGER DEFAULT 0,
        srs_last_quality INTEGER DEFAULT NULL,
        srs_fail_count INTEGER DEFAULT 0,
        UNIQUE (user_id, kana)
      );
    `);

    // 6. dictionary (Dictionnaire de base)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS dictionary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ent_seq TEXT,
        word TEXT,
        reading TEXT NOT NULL,
        meaning_en TEXT,
        meaning_fr TEXT,
        is_common INTEGER DEFAULT 0,
        pos TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_dict_word ON dictionary(word);
      CREATE INDEX IF NOT EXISTS idx_dict_reading ON dictionary(reading);
      CREATE INDEX IF NOT EXISTS idx_dict_common ON dictionary(is_common);
    `);

    // 7. kanji_data (Dictionnaire Kanji)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS kanji_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        literal TEXT UNIQUE NOT NULL,
        jlpt INTEGER,
        grade INTEGER,
        stroke_count INTEGER,
        frequency INTEGER,
        readings_on TEXT,
        readings_kun TEXT,
        meanings_en TEXT,
        meanings_fr TEXT,
        radicals TEXT,
        is_radical INTEGER DEFAULT 0
      );
    `);

    // 8. user_kanji_stats (Statistiques SRS Kanji liées à l'utilisateur)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_kanji_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        kanji_id INTEGER NOT NULL,
        level INTEGER DEFAULT 0,
        next_review TEXT DEFAULT CURRENT_TIMESTAMP,
        interval_days REAL DEFAULT 0,
        repetition INTEGER DEFAULT 0,
        ease_factor REAL DEFAULT 2.5,
        fail_count INTEGER DEFAULT 0,
        last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, kanji_id)
      );
    `);

    // 9. custom_decks
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS custom_decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_visible INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. custom_cards
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS custom_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        reading TEXT,
        repetition INTEGER DEFAULT 0,
        interval_days REAL DEFAULT 0,
        ease_factor REAL DEFAULT 2.5,
        fail_count INTEGER DEFAULT 0,
        next_review TEXT DEFAULT CURRENT_TIMESTAMP,
        last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deck_id) REFERENCES custom_decks(id) ON DELETE CASCADE
      );
    `);

    // 11. articles (News & Audio Immersion)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        title_ruby TEXT,
        content TEXT,
        image_url TEXT,
        audio_url TEXT,
        publication_date TEXT,
        source_url TEXT,
        timestamps TEXT, -- JSON stringifié [{text, start, end}]
        is_news INTEGER DEFAULT 1
      );
    `);

    // Migrations
    try {
      await db.execAsync("ALTER TABLE custom_cards ADD COLUMN reading TEXT;");
    } catch (e) {}

    try {
      await db.execAsync("ALTER TABLE users ADD COLUMN streak_count INTEGER DEFAULT 0;");
    } catch (e) {}

    try {
      await db.execAsync("ALTER TABLE users ADD COLUMN last_study_date TEXT DEFAULT NULL;");
    } catch (e) {}

    try {
      await db.execAsync("ALTER TABLE users ADD COLUMN daily_goal INTEGER DEFAULT 20;");
    } catch (e) {}

    try {
      await db.execAsync("ALTER TABLE users ADD COLUMN app_theme TEXT DEFAULT 'indigo_zen';");
    } catch (e) {}

    // Ajout des fail_count pour le mode Anti-Sangsues (Leeches)
    try {
      await db.execAsync("ALTER TABLE kana_stats ADD COLUMN srs_fail_count INTEGER DEFAULT 0;");
    } catch (e) {}

    try {
      await db.execAsync("ALTER TABLE user_kanji_stats ADD COLUMN fail_count INTEGER DEFAULT 0;");
    } catch (e) {}

    try {
      await db.execAsync("ALTER TABLE custom_cards ADD COLUMN fail_count INTEGER DEFAULT 0;");
    } catch (e) {}

    try {
      await db.execAsync("ALTER TABLE users ADD COLUMN kanji_trace_count INTEGER DEFAULT 10;");
    } catch (e) {}

    try {
      await db.execAsync("ALTER TABLE users ADD COLUMN show_exams INTEGER DEFAULT 1;");
    } catch (e) {}

    console.log("✅ [SQLite] Schéma initialisé avec succès.");
  } catch (error) {
    console.error("❌ [SQLite] Erreur lors de l'initialisation du schéma :", error);
    throw error;
  }
}
