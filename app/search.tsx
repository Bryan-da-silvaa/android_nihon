import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { DigitalInkCanvas } from '../components/DigitalInkCanvas';
import { getDb } from '../services/db/client';

import { clean } from '../services/db/utils';

export default function SearchScreen() {
  const { colors } = useTheme();
  const [candidates, setCandidates] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleRecognized = async (recognizedKanjis: string[]) => {
    setCandidates(recognizedKanjis);
    
    if (recognizedKanjis.length === 0) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const db = await getDb();
      // On récupère les fiches pour les 5 meilleurs Kanjis reconnus
      const topKanjis = recognizedKanjis.slice(0, 5);
      
      // Construction dynamique de la requête IN (?, ?, ?)
      const placeholders = topKanjis.map(() => '?').join(',');
      const query = `
        SELECT id, literal, meanings_fr, readings_on, readings_kun, jlpt 
        FROM kanji_data 
        WHERE literal IN (${placeholders})
      `;
      
      const dbResults: any[] = await db.getAllAsync(query, topKanjis);
      
      // On trie les résultats pour garder l'ordre de probabilité renvoyé par ML Kit
      const sortedResults = dbResults.sort((a, b) => {
        return topKanjis.indexOf(a.literal) - topKanjis.indexOf(b.literal);
      });
      
      setResults(sortedResults);
    } catch (e) {
      console.error("Erreur de recherche SQLite:", e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.hexBg }}>
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 100, alignItems: 'center' }}>
        <Text className="text-3xl font-black mb-2 self-start" style={{ color: colors.hexText }}>
          Dictionnaire par Tracé
        </Text>
        <Text className="text-base opacity-70 mb-8 self-start" style={{ color: colors.hexSubtext }}>
          Dessinez un Kanji que vous ne connaissez pas. L&apos;IA devinera ce que c&apos;est !
        </Text>

        <DigitalInkCanvas onRecognized={handleRecognized} />

        <View className="w-full mt-10">
          {isSearching && (
            <ActivityIndicator size="small" color={colors.hexAccent} style={{ marginBottom: 20 }} />
          )}

          {results.length > 0 && (
            <View className="gap-4">
              <Text className="text-lg font-bold opacity-50 mb-2" style={{ color: colors.hexSubtext }}>
                Correspondances possibles :
              </Text>
              
              {results.map((item, index) => (
                <View 
                  key={index} 
                  className="p-4 rounded-2xl border flex-row items-center"
                  style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
                >
                  <Text className="text-5xl font-black mr-4" style={{ color: colors.hexText }}>
                    {item.literal}
                  </Text>
                  
                  <View className="flex-1">
                    <Text className="text-xl font-bold mb-1" style={{ color: colors.hexText }}>
                      {clean(item.meanings_fr)}
                    </Text>
                    
                    <View className="flex-row flex-wrap gap-2">
                      {item.readings_kun && (
                        <Text className="text-sm opacity-80" style={{ color: colors.hexSubtext }}>
                          🇯🇵 {clean(item.readings_kun).replace(/, /g, '・')}
                        </Text>
                      )}
                      {item.readings_on && (
                        <Text className="text-sm opacity-80" style={{ color: colors.hexSubtext }}>
                          🇨🇳 {clean(item.readings_on).replace(/, /g, '・')}
                        </Text>
                      )}
                    </View>
                  </View>

                  {item.jlpt && (
                    <View className="px-2 py-1 rounded-lg ml-2" style={{ backgroundColor: colors.hexBgSecondary }}>
                      <Text className="font-black text-xs" style={{ color: colors.hexAccent }}>N{item.jlpt}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {candidates.length > 0 && results.length === 0 && !isSearching && (
            <Text className="text-center opacity-50 italic mt-10" style={{ color: colors.hexSubtext }}>
              Aucun Kanji correspondant trouvé dans le dictionnaire hors-ligne.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
