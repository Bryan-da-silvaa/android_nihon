import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { syncNHKNews, getLocalArticles, Article, fetchArticleContent } from '../services/news/nhkService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function NewsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadNews = async (forceSync = false) => {
    try {
      if (forceSync) setIsRefreshing(true);
      else setIsLoading(true);

      // On essaie d'abord de charger le cache local
      let localData = await getLocalArticles();
      
      // Si pas de données ou forceSync, on synchronise
      if (localData.length === 0 || forceSync) {
        await syncNHKNews();
        localData = await getLocalArticles();
      }

      setArticles(localData as Article[]);
    } catch (e) {
      console.error("Erreur chargement news:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.hexBg }}>
        <ActivityIndicator size="large" color={colors.hexAccent} />
        <Text className="mt-4 font-bold" style={{ color: colors.hexSubtext }}>Chargement des actus...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.hexBg }}>
      <ScrollView 
        className="flex-1 px-6" 
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 60 }}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={() => loadNews(true)} 
            tintColor={colors.hexAccent}
          />
        }
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text className="text-3xl font-black" style={{ color: colors.hexText }}>NHK News Easy</Text>
          </View>
          <Pressable 
            onPress={() => loadNews(true)}
            className="p-3 rounded-2xl active:opacity-50"
            style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder, borderWidth: 1 }}
          >
            <Ionicons name="refresh" size={24} color={colors.hexAccent} />
          </Pressable>
        </View>
        
        <Text className="text-base opacity-70 mb-8" style={{ color: colors.hexSubtext }}>
          L&apos;actualité japonaise simplifiée pour les apprenants.
        </Text>

        <View className="gap-6">
          {articles.map((article) => (
            <Pressable 
              key={article.id}
              className="rounded-[2rem] overflow-hidden border shadow-sm active:scale-[0.98] transition-transform"
              style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
              onPress={() => {
                router.push({
                  pathname: '/news_detail',
                  params: { id: article.id }
                });
              }}
            >
              <Image 
                source={{ uri: article.image_url }} 
                className="w-full h-40"
                resizeMode="cover"
              />
              <View className="p-5">
                <Text className="text-xs font-bold opacity-60 mb-2 uppercase tracking-widest" style={{ color: colors.hexAccent }}>
                  {new Date(article.publication_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </Text>
                <Text className="text-xl font-bold leading-tight" style={{ color: colors.hexText }}>
                  {article.title}
                </Text>
                <View className="flex-row items-center mt-4 opacity-50">
                  <Ionicons name="book-outline" size={14} color={colors.hexSubtext} />
                  <Text className="text-xs ml-1" style={{ color: colors.hexSubtext }}>Lire l&apos;article</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {articles.length === 0 && (
          <View className="items-center mt-20">
            <Ionicons name="cloud-offline-outline" size={60} color={colors.hexBorder} />
            <Text className="mt-4 text-center opacity-50" style={{ color: colors.hexSubtext }}>
              Impossible de récupérer les actualités. Vérifiez votre connexion.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
