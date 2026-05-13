/**
 * Moteur d'Analyse Vectorielle des Tracés
 * Valide pédagogiquement l'écriture des Kanjis (Sens, Ordre, Position)
 */

interface Point {
  x: number;
  y: number;
}

export interface ValidationResult {
  isValid: boolean;
  score?: number;
  errorMsg?: string;
  failedStrokeIndex?: number;
}

/**
 * Extrait le point de départ officiel (M x,y) d'un tracé SVG KanjiVG
 */
function getModelStartPoint(svgPath: string): Point | null {
  const match = svgPath.match(/M\s*([\d.-]+)\s*[, ]\s*([\d.-]+)/);
  if (match) {
    return {
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
    };
  }
  return null;
}

/**
 * Extrait les points de départ et d'arrivée du tracé de l'utilisateur
 * (Généré par KanjiCanvas sous la forme 'M x,y L x,y L x,y...')
 */
function getUserPoints(userPath: string): { start: Point; end: Point } | null {
  // Point de départ (M)
  const startMatch = userPath.match(/M\s*([\d.-]+),([\d.-]+)/);
  
  // Point d'arrivée (Dernier L)
  // On utilise un regex pour attraper le dernier couple X,Y
  const points = userPath.split(' L ');
  if (!startMatch || points.length === 0) return null;

  const start = { x: parseFloat(startMatch[1]), y: parseFloat(startMatch[2]) };
  
  let end = start; // Par défaut si le tracé est un simple point
  if (points.length > 1) {
    const lastPointStr = points[points.length - 1];
    const coords = lastPointStr.split(',');
    if (coords.length >= 2) {
      end = { x: parseFloat(coords[0]), y: parseFloat(coords[1]) };
    }
  }

  return { start, end };
}

/**
 * Calcule la distance Euclidienne entre deux points
 */
function getDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Valide l'ensemble du Kanji dessiné par l'utilisateur
 * @param userPaths Tableau des tracés de l'utilisateur
 * @param modelPaths Tableau des tracés officiels KanjiVG
 * @param tolerance Rayon de tolérance pour la position du point de départ (sur une grille de 100x100)
 */
export function validateKanjiDrawing(
  userPaths: string[],
  modelPaths: string[],
  tolerance: number = 25
): ValidationResult {
  
  // 1. Validation de l'Ordre/Quantité
  if (userPaths.length !== modelPaths.length) {
    return {
      isValid: false,
      errorMsg: `Nombre de traits incorrect (${userPaths.length} au lieu de ${modelPaths.length}).`,
    };
  }

  // 2. Validation de chaque trait (Direction et Position)
  let totalScore = 0;

  for (let i = 0; i < modelPaths.length; i++) {
    const modelStart = getModelStartPoint(modelPaths[i]);
    const userPts = getUserPoints(userPaths[i]);

    if (!modelStart || !userPts) continue; // Si impossible d'analyser, on passe

    const distUserStartToModelStart = getDistance(userPts.start, modelStart);
    const distUserEndToModelStart = getDistance(userPts.end, modelStart);

    // A. Test de Direction (Sens du trait)
    if (distUserEndToModelStart < distUserStartToModelStart) {
      return {
        isValid: false,
        score: 0,
        errorMsg: `Le trait n°${i + 1} a été dessiné dans le mauvais sens.`,
        failedStrokeIndex: i,
      };
    }

    // B. Test de Position globale
    if (distUserStartToModelStart > tolerance) {
      return {
        isValid: false,
        score: 0,
        errorMsg: `Le trait n°${i + 1} est trop éloigné de sa position officielle (ou mauvais ordre).`,
        failedStrokeIndex: i,
      };
    }

    // Calcul du score pour ce trait (100% si distance = 0, 0% si distance >= tolerance)
    const strokeAccuracy = Math.max(0, 1 - (distUserStartToModelStart / tolerance));
    totalScore += strokeAccuracy * 100;
  }

  const finalScore = Math.round(totalScore / modelPaths.length);

  return { 
    isValid: true,
    score: finalScore
  };
}
