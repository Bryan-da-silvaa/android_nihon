import { getDb } from '../db/client';

export type QuestionType = 
  | 'kanji_to_meaning' 
  | 'kanji_to_reading' 
  | 'meaning_to_kanji'
  | 'kana_to_romaji'
  | 'romaji_to_kana';

export interface QuizItem {
  id: string; // Unique ID for the quiz map
  dbId: number; // Row ID in db
  kanjiId?: number; // Optional, for Kanji
  sourceTable: 'user_kanji_stats' | 'kana_stats';
  questionType: QuestionType;
  prompt: string;
  answer: string;
  distractors: string[]; // 3 wrong answers
  // SRS Context
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  isCorrect?: boolean; // Set during the quiz
}

// Memory cache for distractors
let cachedKanjis: any[] = [];
let kanaDataMap = new Map<string, string>(); // kana -> romaji
let allKanas: string[] = [];
let allRomajis: string[] = [];

/**
 * Charge un pool de Kanjis pour générer des mauvaises réponses très vite.
 */
async function loadDistractorsPool() {
  if (cachedKanjis.length > 0) return;
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT literal, meanings_fr, readings_on, readings_kun FROM kanji_data LIMIT 1000');
  cachedKanjis = rows as any[];

  // Load Kana JSONs
  const hiragana = require('../../constants/hiragana.json');
  const katakana = require('../../constants/katakana.json');
  const combined = [...hiragana, ...katakana];
  
  for (const item of combined) {
    if (item.kana && item.romaji) {
      kanaDataMap.set(item.kana, item.romaji);
      allKanas.push(item.kana);
      allRomajis.push(item.romaji);
    }
  }
}

function getRandomDistractors(type: QuestionType, correctAnswer: string, count: number = 3): string[] {
  const distractors = new Set<string>();
  
  while(distractors.size < count) {
    let distractor = '';
    
    if (type === 'kana_to_romaji') {
      distractor = allRomajis[Math.floor(Math.random() * allRomajis.length)];
    } else if (type === 'romaji_to_kana') {
      distractor = allKanas[Math.floor(Math.random() * allKanas.length)];
    } else {
      const randomKanji = cachedKanjis[Math.floor(Math.random() * cachedKanjis.length)];
      if (type === 'meaning_to_kanji') {
        distractor = randomKanji.literal;
      } else if (type === 'kanji_to_meaning') {
        distractor = randomKanji.meanings_fr?.split(',')[0] || randomKanji.meanings_en?.split(',')[0];
      } else if (type === 'kanji_to_reading') {
        distractor = randomKanji.readings_kun?.split(',')[0] || randomKanji.readings_on?.split(',')[0];
      }
    }

    if (distractor && distractor !== correctAnswer && !distractors.has(distractor)) {
      distractors.add(distractor);
    }
  }
  
  return Array.from(distractors);
}

function parseFullMeanings(meanings: string) {
	if (!meanings) return '?';
	try {
		if (meanings.startsWith('[') && meanings.endsWith(']')) {
			const parsed = JSON.parse(meanings);
			return Array.isArray(parsed) ? parsed.join(', ') : meanings;
		}
		return meanings;
	} catch (e) {
		return meanings;
	}
}

/**
 * Récupère les cartes à réviser (actuellement limité aux Kanjis pour la v1).
 */
export async function fetchDueCards(deckType: 'kanji' | 'hiragana' | 'katakana', limit: number = 20, jlpt?: number): Promise<QuizItem[]> {
	const db = await getDb();
	await loadDistractorsPool();

	const now = new Date().toISOString();
	let allDue: any[] = [];

	if (deckType === 'kanji') {
		// 1. Récupérer les kanjis à réviser
		let query = `
      SELECT 
        uks.id as dbId, uks.kanji_id, uks.repetition, uks.interval_days, uks.ease_factor, uks.next_review,
        kd.literal, kd.meanings_fr, kd.meanings_en, kd.readings_kun, kd.readings_on
      FROM user_kanji_stats uks
      JOIN kanji_data kd ON uks.kanji_id = kd.id
      WHERE uks.next_review <= ?
    `;
		const params: any[] = [now];

		if (jlpt) {
			query += ` AND kd.jlpt = ?`;
			params.push(jlpt);
		}

		query += ` ORDER BY uks.next_review ASC LIMIT ?`;
		params.push(limit);

		const dueKanjis: any[] = await db.getAllAsync(query, params);
		allDue = dueKanjis;
	} else {
    // 2. Récupérer les Kanas à réviser
    const dueKanas: any[] = await db.getAllAsync(`
      SELECT id as dbId, kana, srs_repetition as repetition, srs_interval as interval_days, srs_ease_factor as ease_factor, srs_next_review as next_review
      FROM kana_stats
      WHERE srs_next_review <= ?
      ORDER BY srs_next_review ASC
    `, [now]);

    const targetJson = deckType === 'hiragana' ? require('../../constants/hiragana.json') : require('../../constants/katakana.json');
    const targetSet = new Set(targetJson.map((k: any) => k.kana));

    allDue = dueKanas.filter((k: any) => targetSet.has(k.kana)).slice(0, limit);
  }

  const quizItems: QuizItem[] = [];

  for (const row of allDue) {
    let prompt = '';
    let answer = '';
    let selectedType: QuestionType;
    let sourceTable: 'user_kanji_stats' | 'kana_stats';

    if (row.kana) {
      // C'est un Kana
      sourceTable = 'kana_stats';
      const romaji = kanaDataMap.get(row.kana) || 'a';
      
      const types: QuestionType[] = ['kana_to_romaji', 'romaji_to_kana'];
      selectedType = types[Math.floor(Math.random() * types.length)];

      if (selectedType === 'kana_to_romaji') {
        prompt = row.kana;
        answer = romaji;
      } else {
        prompt = romaji.toUpperCase(); // romaji prompt
        answer = row.kana;
      }
    } else {
      // C'est un Kanji
      sourceTable = 'user_kanji_stats';
      const types: QuestionType[] = ['kanji_to_meaning', 'kanji_to_reading', 'meaning_to_kanji'];
      selectedType = types[Math.floor(Math.random() * types.length)];

      const meaning = parseFullMeanings(row.meanings_fr || row.meanings_en);
      const reading = row.readings_kun?.split(',')[0] || row.readings_on?.split(',')[0] || 'Lecture inconnue';

      if (selectedType === 'kanji_to_meaning') {
        prompt = row.literal;
        answer = meaning;
      } else if (selectedType === 'kanji_to_reading') {
        prompt = row.literal;
        answer = reading;
      } else if (selectedType === 'meaning_to_kanji') {
        prompt = meaning;
        answer = row.literal;
      }
    }

    const distractors = getRandomDistractors(selectedType, answer, 3);

    quizItems.push({
      id: `${sourceTable}_${row.dbId}_${Date.now()}`,
      dbId: row.dbId,
      kanjiId: row.kanji_id, // only set for kanji
      sourceTable,
      questionType: selectedType,
      prompt,
      answer,
      distractors,
      repetition: row.repetition || 0,
      intervalDays: row.interval_days || 0,
      easeFactor: row.ease_factor || 2.5
    });
  }

  return quizItems;
}

/**
 * Calcule le nouvel état SRS SuperMemo-2 pour une carte.
 */
export function calculateSM2(item: QuizItem, isCorrect: boolean) {
  let repetition = item.repetition;
  let intervalDays = item.intervalDays;
  let easeFactor = item.easeFactor;

  if (isCorrect) {
    repetition += 1;
    if (repetition === 1) {
      intervalDays = 0.01; // ~14 minutes
    } else if (repetition === 2) {
      intervalDays = 1;
    } else if (repetition === 3) {
      intervalDays = 3;
    } else {
      intervalDays = Math.max(1, intervalDays * easeFactor);
    }
    easeFactor = Math.min(3, easeFactor + 0.08);
  } else {
    repetition = 0;
    intervalDays = 0.01;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }

  const minutesToAdd = Math.max(1, Math.round(intervalDays * 24 * 60));
  const nextReviewDate = new Date();
  nextReviewDate.setMinutes(nextReviewDate.getMinutes() + minutesToAdd);

  return {
    repetition,
    intervalDays,
    easeFactor,
    nextReview: nextReviewDate.toISOString()
  };
}

/**
 * Sauvegarde les résultats du quiz dans la base de données en une seule transaction.
 */
export async function syncReviews(items: QuizItem[]): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    // Prepare statements
    const kanjiStmt = await db.prepareAsync(`
      UPDATE user_kanji_stats 
      SET repetition = ?, interval_days = ?, ease_factor = ?, next_review = ?, last_seen = ?
      WHERE id = ?
    `);

    const kanaStmt = await db.prepareAsync(`
      UPDATE kana_stats 
      SET srs_repetition = ?, srs_interval = ?, srs_ease_factor = ?, srs_next_review = ?, last_seen = ?
      WHERE id = ?
    `);

    const now = new Date().toISOString();

    for (const item of items) {
      if (item.isCorrect === undefined) continue; // Skipped card

      const newState = calculateSM2(item, item.isCorrect);

      if (item.sourceTable === 'user_kanji_stats') {
        await kanjiStmt.executeAsync([
          newState.repetition, 
          newState.intervalDays, 
          newState.easeFactor, 
          newState.nextReview, 
          now, 
          item.dbId
        ]);
      } else if (item.sourceTable === 'kana_stats') {
        await kanaStmt.executeAsync([
          newState.repetition, 
          newState.intervalDays, 
          newState.easeFactor, 
          newState.nextReview, 
          now, 
          item.dbId
        ]);
      }
    }
    
    await kanjiStmt.finalizeAsync();
    await kanaStmt.finalizeAsync();
  });
}
