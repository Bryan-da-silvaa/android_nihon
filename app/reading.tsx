import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal, ToastAndroid, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { addInteractiveWordToDeck } from '../services/db/queries';

import { clean } from '../services/db/utils';

// Import local pour l'instant
const storiesData = require('../assets/data/stories.json');

export default function ReadingScreen() {
  const { colors } = useTheme();
  const [selectedStory, setSelectedStory] = useState(storiesData[0]);
  const [selectedWord, setSelectedWord] = useState<any | null>(null);

  const handleWordPress = (word: any) => {
    if (!word.isClickable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedWord(word);
  };

  const handleAddDeck = async () => {
    if (!selectedWord) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await addInteractiveWordToDeck(
      selectedWord.text,
      selectedWord.meaning,
      selectedWord.reading
    );

    if (success) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Ajouté au deck Lecture !', ToastAndroid.SHORT);
      }
    } else {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Déjà dans le deck !', ToastAndroid.SHORT);
      }
    }
    setSelectedWord(null);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.hexBg }}>
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-sm font-bold opacity-60 mb-2 uppercase tracking-widest" style={{ color: colors.hexAccent }}>
          Niveau {selectedStory.level}
        </Text>
        <Text className="text-4xl font-black mb-8" style={{ color: colors.hexText }}>
          {selectedStory.title}
        </Text>

        {/* CONTENU DE L'HISTOIRE */}
        <View className="flex-row flex-wrap items-center">
          {selectedStory.content.map((word: any, index: number) => {
            // Rendu spécifique pour les retours à la ligne
            if (word.text === '\n' || word.text === '\n\n') {
              return <View key={`br-${index}`} className="w-full h-4" />;
            }

            return (
              <Pressable
                key={`word-${index}`}
                onPress={() => handleWordPress(word)}
                className={`py-1 ${word.isClickable ? 'active:opacity-50' : ''}`}
                style={({ pressed }) => ({
                  backgroundColor: pressed && word.isClickable ? colors.hexCard : 'transparent',
                  borderRadius: 4,
                  marginHorizontal: 1
                })}
              >
                <Text 
                  className={`text-2xl`} 
                  style={{ 
                    color: colors.hexText,
                    // Petit effet visuel subtil sur les mots cliquables (soulignement ou couleur légèrement différente)
                    textDecorationLine: word.isClickable ? 'underline' : 'none',
                    textDecorationColor: colors.hexBorder,
                  }}
                >
                  {word.text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* BOTTOM SHEET MODAL (Custom) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedWord}
        onRequestClose={() => setSelectedWord(null)}
      >
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setSelectedWord(null)} />
          
          <View 
            className="p-6 rounded-t-3xl shadow-2xl"
            style={{ backgroundColor: colors.hexCard }}
          >
            <View className="flex-row justify-between items-start mb-6">
              <View>
                {selectedWord?.reading && (
                  <Text className="text-lg font-bold opacity-70 mb-1" style={{ color: colors.hexSubtext }}>
                    {clean(selectedWord.reading)}
                  </Text>
                )}
                <Text className="text-5xl font-black" style={{ color: colors.hexText }}>
                  {selectedWord?.text}
                </Text>
              </View>
              <Pressable 
                onPress={() => setSelectedWord(null)}
                className="p-2 rounded-full active:opacity-50"
                style={{ backgroundColor: colors.hexBg }}
              >
                <Ionicons name="close" size={24} color={colors.hexText} />
              </Pressable>
            </View>

            <View className="p-4 rounded-2xl mb-6" style={{ backgroundColor: colors.hexBg }}>
              <Text className="text-xl font-medium" style={{ color: colors.hexText }}>
                {clean(selectedWord?.meaning)}
              </Text>
            </View>

            <Pressable
              onPress={handleAddDeck}
              className="py-4 rounded-2xl flex-row items-center justify-center active:scale-95 transition-transform"
              style={{ backgroundColor: colors.hexAccent }}
            >
              <Ionicons name="layers" size={24} color="#ffffff" style={{ marginRight: 10 }} />
              <Text className="text-white text-lg font-black tracking-wide">
                Ajouter aux Révisions (SRS)
              </Text>
            </Pressable>
            
            <View className="h-6" />
          </View>
        </View>
      </Modal>
    </View>
  );
}
