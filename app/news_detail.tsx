import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, Pressable, Modal, ToastAndroid, Platform, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { getDb } from '../services/db/client';
import { Article, fetchArticleContent } from '../services/news/nhkService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudio } from '../context/AudioContext';
import { addInteractiveWordToDeck, lookupWord } from '../services/db/queries';

import { RubyText } from '../components/ui/RubyText';

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const router = useRouter();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState<{text: string, reading?: string, meaning?: string} | null>(null);
  const [manualMeaning, setManualMeaning] = useState('');

  const { playArticle, isPlaying, togglePlayback, currentArticle } = useAudio();
  const isThisArticlePlaying = currentArticle?.audioUrl === article?.audio_url && isPlaying;

  useEffect(() => {
    async function loadArticle() {
      try {
        const db = await getDb();
        const articleId = Array.isArray(id) ? id[0] : id;
        const results: any[] = await db.getAllAsync('SELECT * FROM articles WHERE id = ?', [articleId]);
        
        if (results.length > 0) {
          setArticle(results[0] as Article);
        }
      } catch (e) {
        console.error("Erreur chargement détail article:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadArticle();
  }, [id]);

  const handleTogglePlayback = () => {
    if (!article?.audio_url || !article?.title) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Audio non disponible pour cet article', ToastAndroid.SHORT);
      }
      return;
    }
    playArticle(article.title, article.audio_url);
  };

  const handleWordClick = async (word: string, reading?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // On lance la recherche dans le dictionnaire
    const dictEntry = await lookupWord(word, reading);
    
    setManualMeaning('');
    setSelectedWord({ 
      text: word, 
      reading: dictEntry.reading || reading,
      meaning: dictEntry.meaning
    });
  };

  const handleSaveWord = async () => {
    if (!selectedWord) return;

    const finalMeaning = selectedWord.meaning || manualMeaning;
    if (!finalMeaning) {
      if (Platform.OS === 'android') ToastAndroid.show('Veuillez saisir une traduction', ToastAndroid.SHORT);
      return;
    }

    try {
      // 1. Ajouter au Deck SRS
      await addInteractiveWordToDeck(selectedWord.text, finalMeaning, selectedWord.reading);
      
      // 2. Si c'est une saisie manuelle, on l'ajoute aussi au dictionnaire global
      if (!selectedWord.meaning && manualMeaning) {
        const db = await getDb();
        await db.runAsync(
          "INSERT OR IGNORE INTO dictionary (word, reading, meaning_fr, is_common) VALUES (?, ?, ?, ?)",
          [selectedWord.text, selectedWord.reading || '', manualMeaning, 1]
        );
      }

      if (Platform.OS === 'android') ToastAndroid.show('Ajouté aux révisions !', ToastAndroid.SHORT);
      setSelectedWord(null);
    } catch (e) {
      console.error("Erreur sauvegarde mot:", e);
    }
  };

  if (isLoading || !article) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.hexBg }}>
        <ActivityIndicator size="large" color={colors.hexAccent} />
      </View>
    );
  }

  // Découpage du contenu en phrases pour la lisibilité
  const sentences = article.content.split('。').filter(s => s.trim().length > 0).map(s => s + '。');

  return (
    <View className="flex-1" style={{ backgroundColor: colors.hexBg }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <Image source={{ uri: article.image_url }} className="w-full h-64" />
        
        <View className="p-6 -mt-10 rounded-t-[3rem]" style={{ backgroundColor: colors.hexBg }}>
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xs font-bold opacity-50 uppercase tracking-widest" style={{ color: colors.hexSubtext }}>
              {new Date(article.publication_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </Text>
            
            <Pressable 
              onPress={handleTogglePlayback}
              className={`w-14 h-14 rounded-full items-center justify-center shadow-lg ${!article.audio_url ? 'opacity-30' : ''}`}
              style={{ backgroundColor: colors.hexAccent }}
            >
              <Ionicons name={isThisArticlePlaying ? "pause" : "play"} size={28} color="white" />
            </Pressable>
          </View>

          <Text className="text-2xl font-black mb-10 leading-tight" style={{ color: colors.hexText }}>
            {article.title}
          </Text>

          {/* Corps de l'article découpé par phrases pour la clarté */}
          <View>
            {sentences.map((sentence, idx) => (
              <View key={idx} className="mb-6">
                <RubyText 
                  html={sentence}
                  baseColor={colors.hexText}
                  rubyColor={colors.hexAccent}
                  baseSize={20}
                  rubySize={10}
                  onWordPress={handleWordClick}
                />
              </View>
            ))}
          </View>
          
          <Pressable 
            onPress={() => router.back()}
            className="mt-16 py-4 rounded-2xl border items-center"
            style={{ borderColor: colors.hexBorder }}
          >
            <Text className="font-bold uppercase tracking-widest text-xs" style={{ color: colors.hexSubtext }}>Retour aux actualités</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal de traduction / Furigana rapide style Premium */}
      <Modal visible={!!selectedWord} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="absolute inset-0" onPress={() => setSelectedWord(null)} />
          
          <View className="p-10 rounded-t-[3rem] shadow-2xl" style={{ backgroundColor: colors.hexCard }}>
            {/* Barre de drag ou petite deco */}
            <View className="w-12 h-1.5 self-center rounded-full mb-8 opacity-20" style={{ backgroundColor: colors.hexText }} />

            <View className="flex-row justify-between items-start mb-6">
              <View>
                <Text className="text-lg font-bold opacity-50 mb-1" style={{ color: colors.hexSubtext }}>
                  {selectedWord?.reading || 'Lecture'}
                </Text>
                <Text className="text-6xl font-black" style={{ color: colors.hexText }}>
                  {selectedWord?.text}
                </Text>
              </View>
              
              <Pressable 
                onPress={() => setSelectedWord(null)}
                className="w-10 h-10 rounded-full items-center justify-center bg-black/10"
              >
                <Ionicons name="close" size={24} color={colors.hexText} />
              </Pressable>
            </View>

            {/* Zone Traduction (Texte ou Saisie) */}
            <View className="bg-black/5 p-6 rounded-2xl mb-8">
              {selectedWord?.meaning ? (
                <Text className="text-xl font-medium" style={{ color: colors.hexText }}>
                  {selectedWord.meaning}
                </Text>
              ) : (
                <TextInput
                  value={manualMeaning}
                  onChangeText={setManualMeaning}
                  placeholder="Saisir la traduction en français..."
                  placeholderTextColor={`${colors.hexSubtext}50`}
                  className="text-xl font-medium p-0"
                  style={{ color: colors.hexText }}
                  autoFocus={true}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveWord}
                />
              )}
            </View>
            
            <Pressable 
              className="w-full py-5 rounded-2xl flex-row items-center justify-center shadow-lg"
              style={{ backgroundColor: colors.hexAccent }}
              onPress={handleSaveWord}
            >
              <Ionicons name="layers" size={22} color="white" className="mr-3" />
              <Text className="text-white font-bold text-lg">Ajouter aux Révisions (SRS)</Text>
            </Pressable>

            {/* Espace pour le bas de l'écran (safe area) */}
            <View className="h-10" />
          </View>
        </View>
      </Modal>
    </View>
  );
}
