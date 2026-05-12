import * as SQLite from 'expo-sqlite';

// Le nom de la base de données locale
const DB_NAME = 'nihon_mobile.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Initialise et retourne la connexion à la base de données SQLite.
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  
  try {
    // expo-sqlite v14+ utilise openDatabaseAsync
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Activer les clés étrangères et le mode WAL pour de meilleures performances
    await dbInstance.execAsync(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
    `);
    
    return dbInstance;
  } catch (error) {
    console.error("Erreur lors de l'initialisation de SQLite:", error);
    throw error;
  }
}
