/**
 * Service de récupération des tracés Kanji (KanjiVG)
 * Charge la base de données complète depuis les assets
 */

let kanjiDatabase: Record<string, string[]> | null = null;

/**
 * Charge la base de données en mémoire
 * On utilise require pour que Metro l'embarque dans le bundle
 */
function loadDatabase() {
  if (kanjiDatabase) return kanjiDatabase;
  
  try {
    // Note: Le fichier doit être présent dans assets/data/kanjivg.json
    // On utilise require ici pour la performance au chargement initial
    const data = require('../assets/data/kanjivg.json');
    kanjiDatabase = data;
    return kanjiDatabase;
  } catch (error) {
    console.warn("La base de données KanjiVG n'a pas pu être chargée. Utilisez la commande curl pour la télécharger.");
    return {};
  }
}

/**
 * Récupère les traits d'un Kanji
 */
export function getKanjiStrokes(kanji: string): string[] | null {
  const db = loadDatabase();
  
  // Dans le fichier kanjivg.json, les clés sont souvent les caractères eux-mêmes
  if (db && db[kanji]) {
    return db[kanji];
  }
  
  return null;
}

/**
 * Vérifie si les données sont disponibles pour un Kanji donné
 */
export function hasStrokeData(kanji: string): boolean {
  const db = loadDatabase();
  return !!(db && db[kanji]);
}
