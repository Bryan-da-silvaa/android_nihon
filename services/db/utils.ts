/**
 * Utilitaire de nettoyage pour les données SQLite (JSON ou texte brut).
 */
export function clean(input: any): string {
	if (!input) return "";
	const str = String(input).trim();
	
	if (str.startsWith('[') && str.endsWith(']')) {
		try {
			const parsed = JSON.parse(str);
			if (Array.isArray(parsed)) {
				return parsed.join(', ');
			}
			return str;
		} catch (e) {
			return str;
		}
	}
	return str;
}

/**
 * Récupère seulement la première entrée d'une liste.
 */
export function first(input: any): string {
	const cleaned = clean(input);
	return cleaned.split(',')[0].trim();
}

/**
 * Nettoie une lecture japonaise pour la synthèse vocale ou l'affichage simple.
 * Supprime les points (okurigana) et les tirets (préfixes/suffixes).
 */
export function sanitizeReading(input: any): string {
	const str = first(input);
	return str.replace(/[.\-]/g, '');
}
