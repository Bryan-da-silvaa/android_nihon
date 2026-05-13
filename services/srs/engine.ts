import { getDb } from '../db/client';
import { clean, sanitizeReading } from '../db/utils';

export type QuestionType = 
  | 'kanji_to_meaning' 
  | 'kanji_to_reading' 
  | 'meaning_to_kanji'
  | 'kana_to_romaji'
  | 'romaji_to_kana'
  | 'custom_front_to_back'
  | 'custom_back_to_front'
  | 'custom_reading_to_back'
  | 'custom_front_to_reading';

/**
 * Grade de performance SRS (inspiré d'Anki)
 * 1: Again (Échec)
 * 2: Hard
 * 3: Good
 * 4: Easy
 */
export type SRSGrade = 1 | 2 | 3 | 4;

export interface QuizItem {
  id: string;
  dbId: number;
  kanjiId?: number;
  kanjiLiteral?: string; // Le caractère Kanji original pour le tracé
  sourceTable: 'user_kanji_stats' | 'kana_stats' | 'custom_cards';
  questionType: QuestionType;
  prompt: string;
  answer: string;
  distractors: string[];
  reading?: string;
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  isCorrect?: boolean;
  grade?: SRSGrade;
  strategy?: 'intensive' | 'balanced' | 'relaxed';
}

// Cache mémoire
let cachedKanjis: any[] = [];
let kanaDataMap = new Map<string, string>();
let allKanas: string[] = [];
let allRomajis: string[] = [];

async function loadDistractorsPool() {
  if (cachedKanjis.length > 0) return;
  const db = await getDb();
  // On récupère plus de détails pour la similarité
  const rows = await db.getAllAsync('SELECT literal, meanings_fr, readings_on, readings_kun, jlpt FROM kanji_data LIMIT 1500');
  cachedKanjis = rows as any[];

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

/**
 * Génère des distracteurs intelligents
 */
function getRandomDistractors(type: QuestionType, correctAnswer: string, count: number = 3, customPool?: string[], pool?: any[]): string[] {
  const distractors = new Set<string>();
  
  if (customPool && customPool.length >= count) {
    let attempts = 0;
    while(distractors.size < count && attempts < 50) {
      attempts++;
      const dist = customPool[Math.floor(Math.random() * customPool.length)];
      if (dist !== correctAnswer && dist.trim() !== "") distractors.add(dist);
    }
    if (distractors.size >= count) return Array.from(distractors);
  }

  const effectivePool = pool || cachedKanjis;
  let attempts = 0;
  while(distractors.size < count && attempts < 100) {
    attempts++;
    let distractor = '';
    
    if (type === 'kana_to_romaji') {
      distractor = allRomajis[Math.floor(Math.random() * allRomajis.length)];
    } else if (type === 'romaji_to_kana') {
      distractor = allKanas[Math.floor(Math.random() * allKanas.length)];
    } else {
      const randomKanji = effectivePool[Math.floor(Math.random() * effectivePool.length)];
      if (!randomKanji) break;
      
      if (type === 'meaning_to_kanji' || type === 'custom_back_to_front') {
        distractor = randomKanji.literal;
      } else if (type === 'kanji_to_meaning' || type === 'custom_front_to_back' || type === 'custom_reading_to_back') {
        distractor = clean(randomKanji.meanings_fr || randomKanji.meanings_en);
      } else {
        distractor = clean(randomKanji.readings_kun || randomKanji.readings_on).split(',')[0];
      }
    }

    if (distractor && distractor !== correctAnswer && !distractors.has(distractor)) {
      distractors.add(distractor);
    }
  }
  
  return Array.from(distractors);
}

export async function fetchDueCards(deckType: 'kanji' | 'hiragana' | 'katakana' | 'custom', limit: number = 20, jlpt?: number, deckId?: number, isLearning?: boolean, isCram?: boolean): Promise<QuizItem[]> {
	const db = await getDb();
	await loadDistractorsPool();

	const now = new Date().toISOString();
	let allDue: any[] = [];
  let customDistractorPool: string[] = [];

	if (deckType === 'kanji') {
		let query = `
      SELECT 
        uks.id as dbId, uks.kanji_id, uks.repetition, uks.interval_days, uks.ease_factor, uks.next_review,
        kd.literal, kd.meanings_fr, kd.meanings_en, kd.readings_kun, kd.readings_on, kd.jlpt
      FROM user_kanji_stats uks
      JOIN kanji_data kd ON uks.kanji_id = kd.id
      WHERE ${isCram ? 'uks.repetition > 0' : 'uks.next_review <= ?'}
    `;
		const params: any[] = isCram ? [] : [now];

		if (jlpt) {
			query += ` AND kd.jlpt = ?`;
			params.push(jlpt);
		}

		query += ` ORDER BY uks.next_review ASC LIMIT ?`;
		params.push(limit);

		const dueKanjis: any[] = await db.getAllAsync(query, params);
		allDue = dueKanjis;
	} else if (deckType === 'custom' && deckId !== undefined) {
		let whereClause = '';
		let queryParams: any[] = [deckId];

		if (isLearning) {
			whereClause = 'repetition = 0';
		} else if (isCram) {
			whereClause = 'repetition > 0';
		} else {
			whereClause = 'next_review <= ? AND repetition > 0';
			queryParams.push(now);
		}
		queryParams.push(limit);

		allDue = await db.getAllAsync(`
			SELECT id as dbId, front, reading, back, repetition, interval_days, ease_factor, next_review
			FROM custom_cards
			WHERE deck_id = ? AND ${whereClause}
			ORDER BY next_review ASC
			LIMIT ?
		`, queryParams);

		const allCards = await db.getAllAsync('SELECT front, reading, back FROM custom_cards WHERE deck_id = ?', [deckId]) as any[];
		customDistractorPool = allCards.flatMap(c => [c.front, c.reading, c.back].filter(x => x));
	} else {
		const dueKanas: any[] = await db.getAllAsync(`
      SELECT id as dbId, kana, srs_repetition as repetition, srs_interval as interval_days, srs_ease_factor as ease_factor, srs_next_review as next_review
      FROM kana_stats
      WHERE ${isCram ? 'srs_repetition > 0' : 'srs_next_review <= ?'}
      ORDER BY srs_next_review ASC
    `, isCram ? [] : [now]);

		const targetJson = deckType === 'hiragana' ? require('../../constants/hiragana.json') : require('../../constants/katakana.json');
		const targetSet = new Set(targetJson.map((k: any) => k.kana));

		allDue = dueKanas.filter((k: any) => targetSet.has(k.kana)).slice(0, limit);
	}

  const quizItems: QuizItem[] = [];

  for (const row of allDue) {
    let prompt = '';
    let answer = '';
    let selectedType: QuestionType;
    let sourceTable: 'user_kanji_stats' | 'kana_stats' | 'custom_cards';

    if (row.kana) {
      sourceTable = 'kana_stats';
      const romaji = kanaDataMap.get(row.kana) || 'a';
      const types: QuestionType[] = ['kana_to_romaji', 'romaji_to_kana'];
      selectedType = types[Math.floor(Math.random() * types.length)];
      if (selectedType === 'kana_to_romaji') {
        prompt = row.kana;
        answer = romaji;
      } else {
        prompt = romaji.toUpperCase();
        answer = row.kana;
      }
    } else if (row.front) {
			sourceTable = 'custom_cards';
			const possibleTypes: QuestionType[] = ['custom_front_to_back', 'custom_back_to_front'];
			if (row.reading) possibleTypes.push('custom_reading_to_back', 'custom_front_to_reading');
			selectedType = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];

			if (selectedType === 'custom_front_to_back') { prompt = row.front; answer = row.back; }
			else if (selectedType === 'custom_back_to_front') { prompt = row.back; answer = row.front; }
			else if (selectedType === 'custom_reading_to_back') { prompt = row.reading; answer = row.back; }
			else if (selectedType === 'custom_front_to_reading') { prompt = row.front; answer = row.reading; }
		} else {
      sourceTable = 'user_kanji_stats';
      const types: QuestionType[] = ['kanji_to_meaning', 'meaning_to_kanji'];
      selectedType = types[Math.floor(Math.random() * types.length)];
      const meaning = clean(row.meanings_fr || row.meanings_en);
      const reading = clean(row.readings_kun || row.readings_on).split(',')[0];

      if (selectedType === 'kanji_to_meaning') { prompt = row.literal; answer = meaning; }
      else if (selectedType === 'kanji_to_reading') { prompt = row.literal; answer = reading; }
      else if (selectedType === 'meaning_to_kanji') { prompt = meaning; answer = row.literal; }
    }

    const jlptPool = row.jlpt ? cachedKanjis.filter(k => k.jlpt === row.jlpt) : null;
    const distractors = getRandomDistractors(selectedType, answer, 3, customDistractorPool, jlptPool && jlptPool.length > 5 ? jlptPool : cachedKanjis);

    // Priorité à l'Onyomi (comme Renshu/Wagotabi pour les Kanjis isolés)
    let kanjiReading = undefined;
    if (row.readings_on || row.readings_kun) {
      kanjiReading = row.readings_on ? sanitizeReading(row.readings_on) : sanitizeReading(row.readings_kun);
    }

    quizItems.push({
      id: `${sourceTable}_${row.dbId}_${Date.now()}`,
      dbId: row.dbId,
      kanjiId: row.kanji_id,
      kanjiLiteral: row.literal || row.kana || row.front, // On stocke la forme originale pour le tracé
      sourceTable,
      questionType: selectedType,
      prompt,
      answer,
      distractors,
      reading: row.reading || (row.kana ? kanaDataMap.get(row.kana) : kanjiReading),
      repetition: row.repetition || 0,
      intervalDays: row.interval_days || 0,
      easeFactor: row.ease_factor || 2.5
    });
  }
  return quizItems;
}

/**
 * Compte le nombre total de cartes dues pour révision (tous types confondus)
 */
export async function countTotalDueCards(): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  // Compter Kanji
  const kanjiRow = await db.getFirstAsync<{count: number}>(
    'SELECT COUNT(*) as count FROM user_kanji_stats WHERE next_review <= ? AND repetition > 0',
    [now]
  );
  
  // Compter Kana
  const kanaRow = await db.getFirstAsync<{count: number}>(
    'SELECT COUNT(*) as count FROM kana_stats WHERE srs_next_review <= ? AND srs_repetition > 0',
    [now]
  );
  
  // Compter Custom
  const customRow = await db.getFirstAsync<{count: number}>(
    'SELECT COUNT(*) as count FROM custom_cards WHERE next_review <= ? AND repetition > 0',
    [now]
  );
  
  return (kanjiRow?.count || 0) + (kanaRow?.count || 0) + (customRow?.count || 0);
}

/**
 * Récupère la date de la toute prochaine révision prévue dans le futur
 */
export async function getEarliestNextReviewDate(): Promise<Date | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  const query = (table: string, nextCol: string) => `
    SELECT ${nextCol} as nextReview 
    FROM ${table} 
    WHERE ${nextCol} > ? 
    ORDER BY ${nextCol} ASC 
    LIMIT 1
  `;

  const results = await Promise.all([
    db.getFirstAsync<{nextReview: string}>(query('user_kanji_stats', 'next_review'), [now]),
    db.getFirstAsync<{nextReview: string}>(query('kana_stats', 'srs_next_review'), [now]),
    db.getFirstAsync<{nextReview: string}>(query('custom_cards', 'next_review'), [now]),
  ]);

  const dates = results
    .map(r => r?.nextReview ? new Date(r.nextReview) : null)
    .filter((d): d is Date => d !== null);

  if (dates.length === 0) return null;

  return new Date(Math.min(...dates.map(d => d.getTime())));
}

/**
 * Algorithme SM2 Raffiné (Spaced Repetition)
 */
export function calculateSM2(item: QuizItem, grade: SRSGrade, strategy: 'intensive' | 'balanced' | 'relaxed' = 'balanced') {
  let { repetition, intervalDays, easeFactor } = item;

  // Multiplicateurs basés sur la stratégie
  const strategyMultipliers = {
    intensive: 0.7, // Révisions plus fréquentes (intervalles plus courts)
    balanced: 1.0,
    relaxed: 1.5    // Révisions moins fréquentes (intervalles plus longs)
  };

  const multiplier = strategyMultipliers[strategy] || 1.0;

  // Si échec (Again)
  if (grade === 1) {
    repetition = 0;
    intervalDays = 0.007 * multiplier; // ~10 minutes ajusté
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    // Si succès
    if (grade === 2) { // Hard
      intervalDays = Math.max(0.1, intervalDays * 1.2 * multiplier);
      easeFactor = Math.max(1.3, easeFactor - 0.15);
    } else if (grade === 3) { // Good
      if (repetition === 0) intervalDays = 1 * multiplier;
      else if (repetition === 1) intervalDays = 3 * multiplier;
      else intervalDays = intervalDays * easeFactor * multiplier;
      repetition += 1;
    } else if (grade === 4) { // Easy
      if (repetition === 0) intervalDays = 4 * multiplier;
      else intervalDays = intervalDays * easeFactor * 1.3 * multiplier;
      repetition += 1;
      easeFactor = Math.min(3, easeFactor + 0.15);
    }
  }

  // Calcul de la prochaine date
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

import { updateDailyStreak } from '../db/queries';

export async function syncReviews(items: QuizItem[], isCram?: boolean): Promise<void> {
  if (isCram) return;
  const db = await getDb();

  await updateDailyStreak();

  await db.withTransactionAsync(async () => {
    const kanjiStmt = await db.prepareAsync(`
      UPDATE user_kanji_stats SET repetition = ?, interval_days = ?, ease_factor = ?, next_review = ?, last_seen = ? WHERE id = ?
    `);
    const kanaStmt = await db.prepareAsync(`
      UPDATE kana_stats SET srs_repetition = ?, srs_interval = ?, srs_ease_factor = ?, srs_next_review = ?, last_seen = ? WHERE id = ?
    `);
    const customStmt = await db.prepareAsync(`
      UPDATE custom_cards SET repetition = ?, interval_days = ?, ease_factor = ?, next_review = ?, last_seen = ? WHERE id = ?
    `);

    const now = new Date().toISOString();

    for (const item of items) {
      if (item.grade === undefined && item.isCorrect === undefined) continue;

      const grade = item.grade || (item.isCorrect ? 3 : 1);
      const newState = calculateSM2(item, grade, item.strategy || 'balanced');

      if (item.sourceTable === 'user_kanji_stats') {
        await kanjiStmt.executeAsync([newState.repetition, newState.intervalDays, newState.easeFactor, newState.nextReview, now, item.dbId]);
      } else if (item.sourceTable === 'kana_stats') {
        await kanaStmt.executeAsync([newState.repetition, newState.intervalDays, newState.easeFactor, newState.nextReview, now, item.dbId]);
      } else if (item.sourceTable === 'custom_cards') {
        await customStmt.executeAsync([newState.repetition, newState.intervalDays, newState.easeFactor, newState.nextReview, now, item.dbId]);
      }
    }
    
    await kanjiStmt.finalizeAsync();
    await kanaStmt.finalizeAsync();
    await customStmt.finalizeAsync();
  });
}
