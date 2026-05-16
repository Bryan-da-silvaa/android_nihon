import { getDb } from './client';

export interface DashboardStats {
  jlptN5: { learned: number; total: number };
  jlptN4: { learned: number; total: number };
  hiragana: { learned: number; total: number };
  katakana: { learned: number; total: number };
  customDecks: {
    id: number;
    name: string;
    learned: number;
    total: number;
    due: number;
    newCount: number;
  }[];
  dueKanjis: number;
  dueHiragana: number;
  dueKatakana: number;
  streak: number;
  dailyGoal: number;
  dailyProgress: number;
  leechCount: number;
  rank: { title: string; color: string; icon: string; id: string; totalLearned: number };
}

export interface UserProfile {
  username: string;
  avatar: string | null;
  banner: string | null;
  kanji: number;
  reading: number;
  games_played: number;
  total_correct: number;
  best_score: number;
  created_at: string;
  daily_goal: number;
  learning_strategy: 'intensive' | 'balanced' | 'relaxed';
  kanji_trace_count: number;
  show_exams: number;
  brush_skin: string;
  app_theme: string;
}

export function getUserRank(totalLearned: number): { title: string; icon: string; color: string; id: string } {
  if (totalLearned >= 500) return { title: 'Shogun', icon: '🏯', color: '#8B5CF6', id: 'shogun' };
  if (totalLearned >= 300) return { title: 'Samouraï', icon: '⚔️', color: '#EF4444', id: 'samurai' };
  if (totalLearned >= 150) return { title: 'Ronin', icon: '🎋', color: '#4B5563', id: 'ronin' };
  if (totalLearned >= 50) return { title: 'Apprenti', icon: '🏮', color: '#F59E0B', id: 'apprenti' };
  return { title: 'Novice', icon: '🌱', color: '#10B981', id: 'novice' };
}

export interface Radical {
  id: number;
  literal: string;
  stroke_count: number;
  meanings_fr: string;
  meanings_en: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  const now = new Date().toISOString();
  try {
    // 1. JLPT Stats
    const jlptStats = await db.getAllAsync(`
      SELECT kd.jlpt, COUNT(uks.id) as learned 
      FROM kanji_data kd
      JOIN user_kanji_stats uks ON kd.id = uks.kanji_id
      WHERE uks.level > 0
      GROUP BY kd.jlpt
    `) as any[];

    const n5Learned = jlptStats.find(s => s.jlpt === 5)?.learned || 0;
    const n4Learned = jlptStats.find(s => s.jlpt === 4)?.learned || 0;

    // 2. Due Kanjis
    const dueKanjisRow: any = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM user_kanji_stats WHERE next_review <= ?
    `, [now]);

    // 3. Due Kanas & Mastery
    const kanaRows = await db.getAllAsync(`
      SELECT kana, srs_repetition, srs_next_review FROM kana_stats
    `) as any[];

    // Load JSONs for categorization
    const hiragana = require('../../constants/hiragana.json');
    const katakana = require('../../constants/katakana.json');
    const hSet = new Set(hiragana.map((h: any) => h.kana));
    const kSet = new Set(katakana.map((k: any) => k.kana));

    let dueHiragana = 0;
    let learnedHiragana = 0;
    let dueKatakana = 0;
    let learnedKatakana = 0;

    for (const row of kanaRows) {
      const isDue = row.srs_next_review <= now;
      const isLearned = row.srs_repetition > 0;

      if (hSet.has(row.kana)) {
        if (isDue) dueHiragana++;
        if (isLearned) learnedHiragana++;
      } else if (kSet.has(row.kana)) {
        if (isDue) dueKatakana++;
        if (isLearned) learnedKatakana++;
      }
    }

    // 4. Custom Decks (Only visible ones)
    const customDecksStats = await db.getAllAsync(`
      SELECT 
        d.id, d.name,
        (SELECT COUNT(*) FROM custom_cards WHERE deck_id = d.id AND repetition > 0) as learned,
        (SELECT COUNT(*) FROM custom_cards WHERE deck_id = d.id) as total,
        (SELECT COUNT(*) FROM custom_cards WHERE deck_id = d.id AND next_review <= ? AND repetition > 0) as due,
        (SELECT COUNT(*) FROM custom_cards WHERE deck_id = d.id AND repetition = 0) as newCount
      FROM custom_decks d
      WHERE d.is_visible = 1
      ORDER BY d.created_at DESC
    `, [now]) as any[];

    // 5. Streak & Daily Goal
    const userRow: any = await db.getFirstAsync('SELECT streak_count, last_study_date, daily_goal FROM users LIMIT 1');
    let streak = userRow?.streak_count || 0;
    const dailyGoal = userRow?.daily_goal || 20;

    // Si on a manqué plus d'un jour, le streak affiché est 0
    if (userRow?.last_study_date) {
      const lastDate = new Date(userRow.last_study_date);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 1) streak = 0;
    }

    // 6. Daily Progress (Somme des cartes vues aujourd'hui)
    const todayStr = new Date().toISOString().split('T')[0];
    const kanjiToday: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM user_kanji_stats WHERE last_seen LIKE ?', [`${todayStr}%`]);
    const kanaToday: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM kana_stats WHERE last_seen LIKE ?', [`${todayStr}%`]);
    const customToday: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM custom_cards WHERE last_seen LIKE ?', [`${todayStr}%`]);
    const dailyProgress = (kanjiToday?.count || 0) + (kanaToday?.count || 0) + (customToday?.count || 0);

    // 7. Leech Count (3+ fails)
    const kanjiLeech: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM user_kanji_stats WHERE fail_count >= 3');
    const kanaLeech: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM kana_stats WHERE srs_fail_count >= 3');
    const customLeech: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM custom_cards WHERE fail_count >= 3');

    const totalLearned = n5Learned + n4Learned + learnedHiragana + learnedKatakana + customDecksStats.reduce((acc, d) => acc + d.learned, 0);
    const leechCount = (kanjiLeech?.count || 0) + (kanaLeech?.count || 0) + (customLeech?.count || 0);

    return {
      jlptN5: { learned: n5Learned, total: 79 },
      jlptN4: { learned: n4Learned, total: 166 },
      hiragana: { learned: learnedHiragana, total: hSet.size || 71 },
      katakana: { learned: learnedKatakana, total: kSet.size || 71 },
      customDecks: customDecksStats.map(d => ({
        id: d.id,
        name: d.name,
        learned: d.learned,
        total: d.total,
        due: d.due,
        newCount: d.newCount
      })),
      dueKanjis: dueKanjisRow?.count || 0,
      dueHiragana,
      dueKatakana,
      streak,
      dailyGoal,
      dailyProgress,
      leechCount,
      rank: { ...getUserRank(totalLearned), totalLearned }
    };
  } catch (e) {
    console.error("Erreur lors de la récupération des statistiques:", e);
    return {
      jlptN5: { learned: 0, total: 79 },
      jlptN4: { learned: 0, total: 166 },
      hiragana: { learned: 0, total: 71 },
      katakana: { learned: 0, total: 71 },
      customDecks: [],
      dueKanjis: 0,
      dueHiragana: 0,
      dueKatakana: 0,
      streak: 0,
      dailyGoal: 20,
      dailyProgress: 0,
      leechCount: 0,
      rank: { ...getUserRank(0), totalLearned: 0 }
    };
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  try {
    const user: any = await db.getFirstAsync(`
      SELECT 
        username, avatar, banner, kanji, reading, 
        games_played, total_correct, best_score_mixed as best_score, created_at,
        daily_goal, learning_strategy, kanji_trace_count, show_exams, brush_skin, app_theme
      FROM users 
      LIMIT 1
    `);
    
    if (!user) return null;
    return user as UserProfile;
  } catch (e) {
    console.error("Erreur lors de la récupération du profil:", e);
    return null;
  }
}

export async function getRadicals(): Promise<Radical[]> {
	const db = await getDb();
	try {
		return await db.getAllAsync(`
      SELECT id, literal, stroke_count, meanings_fr, meanings_en 
      FROM kanji_data 
      WHERE is_radical = 1 
      ORDER BY stroke_count ASC, literal ASC
    `) as Radical[];
	} catch (e) {
		console.error("Erreur lors de la récupération des radicaux:", e);
		return [];
	}
}

export async function getNewRadicals(limit: number = 5): Promise<Radical[]> {
	const db = await getDb();
	try {
		return await db.getAllAsync(`
      SELECT kd.id, kd.literal, kd.stroke_count, kd.meanings_fr, kd.meanings_en 
      FROM kanji_data kd
      LEFT JOIN user_kanji_stats uks ON kd.id = uks.kanji_id
      WHERE kd.is_radical = 1 AND (uks.id IS NULL)
      ORDER BY kd.stroke_count ASC, kd.literal ASC
      LIMIT ?
    `, [limit]) as Radical[];
	} catch (e) {
		console.error("Erreur lors de la récupération des nouveaux radicaux:", e);
		return [];
	}
}

export async function updateDailyStreak(): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  try {
    const user: any = await db.getFirstAsync('SELECT streak_count, last_study_date FROM users LIMIT 1');
    if (!user) return 0;

    let newStreak = user.streak_count || 0;
    const lastDate = user.last_study_date;

    if (!lastDate) {
      newStreak = 1;
    } else if (lastDate === todayStr) {
      // Déjà étudié aujourd'hui
      return newStreak;
    } else {
      const lastDateObj = new Date(lastDate);
      const diffTime = Math.abs(now.getTime() - lastDateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1.5) { // Tolérance pour les fuseaux horaires/heures
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    await db.runAsync('UPDATE users SET streak_count = ?, last_study_date = ?', [newStreak, todayStr]);
    return newStreak;
  } catch (e) {
    console.error("Erreur lors de la mise à jour du streak:", e);
    return 0;
  }
}

export async function updateDailyGoal(newGoal: number): Promise<void> {
  const db = await getDb();
  try {
    await db.runAsync('UPDATE users SET daily_goal = ?', [newGoal]);
  } catch (e) {
    console.error("Erreur lors de la mise à jour de l'objectif:", e);
  }
}

export async function updateLearningStrategy(strategy: 'intensive' | 'balanced' | 'relaxed'): Promise<void> {
  const db = await getDb();
  try {
    await db.runAsync('UPDATE users SET learning_strategy = ?', [strategy]);
  } catch (e) {
    console.error("Erreur lors de la mise à jour de la stratégie SRS:", e);
  }
}

export async function updateKanjiTraceCount(count: number): Promise<void> {
  const db = await getDb();
  try {
    await db.runAsync('UPDATE users SET kanji_trace_count = ?', [count]);
  } catch (e) {
    console.error("Erreur lors de la mise à jour du nombre de tracés:", e);
  }
}

export async function getUserStreak(): Promise<number> {
  const db = await getDb();
  const userRow: any = await db.getFirstAsync('SELECT streak_count, last_study_date FROM users LIMIT 1');
  if (!userRow) return 0;

  let streak = userRow.streak_count || 0;
  if (userRow.last_study_date) {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastDateStr = userRow.last_study_date.split('T')[0];
    
    if (lastDateStr !== todayStr) {
      const lastDate = new Date(lastDateStr + 'T00:00:00Z');
      const today = new Date(todayStr + 'T00:00:00Z');
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        streak = 0; // Streak perdu si plus d'un jour d'écart
      }
    }
  }
  return streak;
}

export async function updateUserStreak(): Promise<number> {
  const db = await getDb();
  const userRow: any = await db.getFirstAsync('SELECT id, streak_count, last_study_date FROM users LIMIT 1');
  if (!userRow) return 0;

  const todayStr = new Date().toISOString().split('T')[0];
  let newStreak = userRow.streak_count || 0;

  if (userRow.last_study_date) {
    const lastDateStr = userRow.last_study_date.split('T')[0];
    
    if (lastDateStr === todayStr) {
      return newStreak; // Déjà validé aujourd'hui
    }

    const lastDate = new Date(lastDateStr + 'T00:00:00Z');
    const today = new Date(todayStr + 'T00:00:00Z');
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak += 1; // +1 jour consécutif !
    } else if (diffDays > 1) {
      newStreak = 1; // Streak brisé, on repart à 1
    }
  } else {
    newStreak = 1; // Premier jour
  }

  await db.runAsync(
    'UPDATE users SET streak_count = ?, last_study_date = ? WHERE id = ?', 
    newStreak, 
    new Date().toISOString(), 
    userRow.id
  );
  
  // Emettre un événement pour rafraîchir l'UI en temps réel (ex: Navbar)
  const { DeviceEventEmitter } = require('react-native');
  DeviceEventEmitter.emit('streakUpdated', newStreak);

  return newStreak;
}

// ====== LECTURE INTERACTIVE ======
export async function addInteractiveWordToDeck(front: string, back: string, reading?: string) {
  const db = await getDb();
  
  // Chercher un deck existant, ou en créer un "Lecture" par défaut
  let deckRow: any = await db.getFirstAsync("SELECT id FROM custom_decks WHERE name = 'Vocabulaire Lecture' LIMIT 1");
  let deckId;
  
  if (!deckRow) {
    const result = await db.runAsync("INSERT INTO custom_decks (name) VALUES ('Vocabulaire Lecture')");
    deckId = result.lastInsertRowId;
  } else {
    deckId = deckRow.id;
  }

  // Vérifier si la carte existe déjà dans ce deck pour éviter les doublons
  const existingCard: any = await db.getFirstAsync(
    "SELECT id FROM custom_cards WHERE deck_id = ? AND front = ? LIMIT 1",
    deckId, front
  );

  if (existingCard) {
    return false; // Déjà ajouté
  }

  // Ajouter la carte
  await db.runAsync(
    "INSERT INTO custom_cards (deck_id, front, back, reading) VALUES (?, ?, ?, ?)",
    deckId, front, back, reading || null
  );

  return true; // Ajouté avec succès
}

import { clean } from './utils';

export async function lookupWord(word: string, reading?: string): Promise<{meaning?: string, reading?: string}> {
  const db = await getDb();
  try {
    // 1. Chercher dans le dictionnaire général
    let query = "SELECT meaning_fr, reading FROM dictionary WHERE word = ? OR reading = ?";
    let params = [word, word];
    
    if (reading) {
      query = "SELECT meaning_fr, reading FROM dictionary WHERE word = ? AND reading = ?";
      params = [word, reading];
    }
    
    const dictResult: any = await db.getFirstAsync(query, params);
    if (dictResult) {
      return { 
        meaning: clean(dictResult.meaning_fr), 
        reading: clean(dictResult.reading) 
      };
    }

    // 2. Si non trouvé, chercher dans les Kanjis (si c'est un seul caractère)
    if (word.length === 1) {
      const kanjiResult: any = await db.getFirstAsync(
        "SELECT meanings_fr, readings_on, readings_kun FROM kanji_data WHERE literal = ?",
        [word]
      );
      if (kanjiResult) {
        return {
          meaning: clean(kanjiResult.meanings_fr),
          reading: clean(kanjiResult.readings_on || kanjiResult.readings_kun)
        };
      }
    }

    return {};
  } catch (e) {
    console.error("Erreur lookupWord:", e);
    return {};
  }
}

export async function getLeechStats(): Promise<number> {
  const db = await getDb();
  try {
    const kanas: any = await db.getFirstAsync("SELECT COUNT(*) as count FROM kana_stats WHERE srs_fail_count >= 3");
    const kanjis: any = await db.getFirstAsync("SELECT COUNT(*) as count FROM user_kanji_stats WHERE fail_count >= 3");
    const custom: any = await db.getFirstAsync("SELECT COUNT(*) as count FROM custom_cards WHERE fail_count >= 3");
    
    return (kanas?.count || 0) + (kanjis?.count || 0) + (custom?.count || 0);
  } catch (e) {
    console.error("Erreur getLeechStats:", e);
    return 0;
  }
}

export async function getLeechItems(): Promise<any[]> {
  const db = await getDb();
  const items: any[] = [];
  
  try {
    // 1. Kanas
    const kanas = await db.getAllAsync(`
      SELECT 'kana' as type, kana as front, '' as reading, srs_fail_count as fail_count 
      FROM kana_stats WHERE srs_fail_count >= 3
    `) as any[];
    items.push(...kanas);

    // 2. Kanjis
    const kanjis = await db.getAllAsync(`
      SELECT 'kanji' as type, kd.literal as front, (kd.readings_on || ' ' || kd.readings_kun) as reading, uks.fail_count 
      FROM user_kanji_stats uks
      JOIN kanji_data kd ON uks.kanji_id = kd.id
      WHERE uks.fail_count >= 3
    `) as any[];
    items.push(...kanjis);

    // 3. Custom Cards
    const custom = await db.getAllAsync(`
      SELECT 'custom' as type, front, reading, fail_count, back as meaning
      FROM custom_cards WHERE fail_count >= 3
    `) as any[];
    items.push(...custom);

    return items.sort((a, b) => b.fail_count - a.fail_count);
  } catch (e) {
    console.error("Erreur getLeechItems:", e);
    return [];
  }
}

export async function updateShowExams(show: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE users SET show_exams = ?', [show ? 1 : 0]);
}

export async function updateBrushSkin(skin: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE users SET brush_skin = ?', [skin]);
}

export async function updateAppTheme(theme: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE users SET app_theme = ?', [theme]);
}
