import { getDb } from './client';

export interface DashboardStats {
  jlptN5: { learned: number; total: number };
  jlptN4: { learned: number; total: number };
  hiragana: { learned: number; total: number };
  katakana: { learned: number; total: number };
  dueKanjis: number;
  dueHiragana: number;
  dueKatakana: number;
  streak: number;
}

export interface UserProfile {
  username: string;
  avatar: string | null;
  banner: string | null;
  kanji: string | null;
  reading: string | null;
  games_played: number;
  total_correct: number;
  best_score: number;
  created_at: string;
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

    // 4. Streak
    const streakRow: any = await db.getFirstAsync('SELECT MAX(srs_streak) as count FROM kana_stats');

    return {
      jlptN5: { learned: n5Learned, total: 79 },
      jlptN4: { learned: n4Learned, total: 166 },
      hiragana: { learned: learnedHiragana, total: hSet.size || 71 },
      katakana: { learned: learnedKatakana, total: kSet.size || 71 },
      dueKanjis: dueKanjisRow?.count || 0,
      dueHiragana,
      dueKatakana,
      streak: streakRow?.count || 0
    };
  } catch (e) {
    console.error("Erreur lors de la récupération des statistiques:", e);
    return {
      jlptN5: { learned: 0, total: 79 },
      jlptN4: { learned: 0, total: 166 },
      hiragana: { learned: 0, total: 71 },
      katakana: { learned: 0, total: 71 },
      dueKanjis: 0,
      dueHiragana: 0,
      dueKatakana: 0,
      streak: 0
    };
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  try {
    const user: any = await db.getFirstAsync(`
      SELECT 
        username, avatar, banner, kanji, reading, 
        games_played, total_correct, best_score_mixed as best_score, created_at 
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
