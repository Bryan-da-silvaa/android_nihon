import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Modal, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getUserProfile, UserProfile, updateDailyGoal, updateLearningStrategy, updateKanjiTraceCount, updateShowExams, getUserRank } from '../services/db/queries';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, AppTheme } from '../context/ThemeContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, colors, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGoalModalVisible, setGoalModalVisible] = useState(false);
  const [isThemeModalVisible, setThemeModalVisible] = useState(false);
  const [isStrategyModalVisible, setStrategyModalVisible] = useState(false);
  const [isTraceModalVisible, setTraceModalVisible] = useState(false);

  const loadProfile = async () => {
    const data = await getUserProfile();
    setProfile(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const handleUpdateGoal = async (num: number) => {
    await updateDailyGoal(num);
    setGoalModalVisible(false);
    loadProfile();
  };

  const handleUpdateTheme = async (t: AppTheme) => {
    await setTheme(t);
    setThemeModalVisible(false);
  };

  const handleUpdateStrategy = async (s: 'intensive' | 'balanced' | 'relaxed') => {
    await updateLearningStrategy(s);
    setStrategyModalVisible(false);
    loadProfile();
  };

  const handleUpdateTraceCount = async (num: number) => {
    await updateKanjiTraceCount(num);
    setTraceModalVisible(false);
    loadProfile();
  };

  const handleExportShare = async () => {
    try {
      const { exportDatabase } = require('../services/db/maintenance');
      await exportDatabase('share');
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible d'exporter la base.");
    }
  };

  const handleExportDownload = async () => {
    try {
      const { exportDatabase } = require('../services/db/maintenance');
      const success = await exportDatabase('download');
      if (success) {
        Alert.alert("Succès", "Ta sauvegarde a été enregistrée avec succès sur ton appareil !");
      }
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de sauvegarder la base.");
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Réinitialisation",
      "Es-tu sûr de vouloir effacer TOUTE ta progression ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "OUI, TOUT EFFACER", 
          style: "destructive",
          onPress: async () => {
            const { resetAllProgress } = require('../services/db/maintenance');
            await resetAllProgress();
            loadProfile();
            Alert.alert("Succès", "Ta progression a été remise à zéro.");
          }
        }
      ]
    );
  };

  const themeLabels: Record<AppTheme, { label: string; icon: string }> = {
    indigo_zen: { label: 'Indigo Zen', icon: '🌌' },
    sakura_night: { label: 'Sakura Night', icon: '🌸' },
    kyoto_gold: { label: 'Kyoto Gold', icon: '🏯' },
    sakura_white: { label: 'Sakura White', icon: '🍥' },
  };

  const strategyLabels = {
    intensive: { label: 'Intensif', icon: '🔥', desc: 'Révisions fréquentes pour une maîtrise rapide' },
    balanced: { label: 'Équilibré', icon: '⚖️', desc: 'Le rythme standard recommandé' },
    relaxed: { label: 'Relax', icon: '🍃', desc: 'Moins de pression, idéal pour le loisir' },
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.hexBg }}>
      <ScrollView 
        className="flex-1" 
        bounces={false} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        
        {/* Hero Section */}
        <View className="w-full h-[450px] relative justify-center items-center">
          {profile?.banner ? (
            <View className="absolute top-0 left-0 w-full h-full">
              <Image 
                source={{ uri: profile.banner }} 
                className="w-full h-full" 
                resizeMode="cover" 
              />
              <View className="absolute inset-0 bg-black/30" />
            </View>
          ) : (
            <View className={`absolute top-0 left-0 w-full h-full`} style={{ backgroundColor: colors.isLight ? '#f43f5e' : colors.hexBgSecondary }} />
          )}
          
          <View className="absolute top-6 left-6 z-20">
            <Pressable 
              onPress={() => router.back()} 
              className="w-12 h-12 bg-black/40 rounded-full items-center justify-center border border-white/10 backdrop-blur-md"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
          </View>

          <View className="items-center z-10">
            <View 
              className={`w-36 h-36 rounded-full items-center justify-center overflow-hidden border-[4px] border-white/40 shadow-2xl mb-6`}
              style={{ backgroundColor: colors.hexCard }}
            >
              {profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Text className="text-6xl">🐱</Text>
              )}
            </View>
            
            <Text className="text-4xl font-black text-white mb-4 tracking-widest drop-shadow-2xl">
              {profile?.username || 'Sensei'}
            </Text>
            
            <View className="flex-row items-center gap-3 bg-black/40 px-6 py-2.5 rounded-full border border-white/10 backdrop-blur-lg">
              <Text className={`text-xl font-black drop-shadow-md`} style={{ color: colors.hexAccent }}>
                {profile?.kanji || '日本'}
              </Text>
              {profile?.reading && (
                <>
                  <View className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                  <Text className="text-white/90 font-bold tracking-[0.2em] uppercase text-xs">{profile.reading}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View className="px-6 pt-8 pb-20 min-h-[500px]">
          <Text className={`text-xs font-black mb-4 tracking-[0.2em] ml-2`} style={{ color: colors.hexSubtext }}>
            RÉSUMÉ DES PERFORMANCES
          </Text>
          
          <View className="flex-row gap-4 mb-4">
            <View 
              className={`flex-1 rounded-[2rem] p-6 border items-center shadow-xl relative overflow-hidden`}
              style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
            >
              <View className={`absolute top-0 right-0 w-16 h-16 rounded-bl-[2rem]`} style={{ backgroundColor: colors.hexAccent, opacity: 0.1 }} />
              <Text className={`text-4xl font-black mb-1`} style={{ color: colors.hexText }}>{profile?.games_played || 0}</Text>
              <Text className={`font-bold text-[10px] uppercase tracking-widest text-center`} style={{ color: colors.hexAccent }}>Parties Jouées</Text>
            </View>
            
            <View 
              className={`flex-1 rounded-[2rem] p-6 border items-center shadow-xl relative overflow-hidden`}
              style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
            >
              <View className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-[2rem]" />
              <Text className={`text-4xl font-black mb-1`} style={{ color: colors.hexText }}>{profile?.total_correct || 0}</Text>
              <Text className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest text-center">Réponses Justes</Text>
            </View>
          </View>

          <View 
            className={`rounded-[2.5rem] p-8 mb-10 border shadow-2xl items-center relative overflow-hidden`}
            style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
          >
            <View className="absolute -right-4 -bottom-4 w-32 h-32 bg-amber-500/10 rounded-full" />
            <Text className={`font-bold text-xs uppercase tracking-[0.2em] mb-2`} style={{ color: colors.hexSubtext }}>Record Absolu</Text>
            <View className="flex-row items-baseline gap-2">
              <Text className={`text-6xl font-black`} style={{ color: colors.isLight ? '#d97706' : '#fbbf24' }}>{profile?.best_score || 0}</Text>
              <Text className={`text-xl font-bold opacity-50`} style={{ color: colors.isLight ? '#d97706' : '#fbbf24' }}>pts</Text>
            </View>
          </View>

          <Text className={`text-xs font-black mb-4 tracking-[0.2em] ml-2`} style={{ color: colors.hexSubtext }}>
            OBJECTIFS & PRÉFÉRENCES
          </Text>

          <View 
            className={`rounded-[2rem] p-2 border mb-10 shadow-xl`}
            style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
          >
            <Pressable 
              onPress={() => setGoalModalVisible(true)}
              className={`flex-row items-center justify-between p-5 border-b active:opacity-60 rounded-2xl transition-colors`}
              style={{ borderBottomColor: colors.hexBorder }}
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-amber-500/20 rounded-full items-center justify-center">
                  <Text className="text-lg">🎯</Text>
                </View>
                <View>
                  <Text className={`font-bold text-lg`} style={{ color: colors.hexText }}>Objectif Quotidien</Text>
                  <Text className={`text-xs`} style={{ color: colors.hexSubtext }}>{profile?.daily_goal || 20} cartes / jour</Text>
                </View>
              </View>
              <Text className={`font-black text-xl`} style={{ color: colors.hexSubtext }}>{'>'}</Text>
            </Pressable>

            <Pressable 
              onPress={() => setStrategyModalVisible(true)}
              className={`flex-row items-center justify-between p-5 border-b active:opacity-60 rounded-2xl transition-colors`}
              style={{ borderBottomColor: colors.hexBorder }}
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-indigo-500/20 rounded-full items-center justify-center">
                  <Text className="text-lg">🧠</Text>
                </View>
                <View>
                  <Text className={`font-bold text-lg`} style={{ color: colors.hexText }}>Stratégie SRS</Text>
                  <Text className={`text-xs`} style={{ color: colors.hexSubtext }}>
                    Mode {strategyLabels[profile?.learning_strategy || 'balanced'].label}
                  </Text>
                </View>
              </View>
              <Text className={`font-black text-xl`} style={{ color: colors.hexSubtext }}>{'>'}</Text>
            </Pressable>

            <Pressable 
              onPress={() => setTraceModalVisible(true)}
              className={`flex-row items-center justify-between p-5 border-b active:opacity-60 rounded-2xl transition-colors`}
              style={{ borderBottomColor: colors.hexBorder }}
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-orange-500/20 rounded-full items-center justify-center">
                  <Text className="text-lg">✏️</Text>
                </View>
                <View>
                  <Text className={`font-bold text-lg`} style={{ color: colors.hexText }}>Répétitions Tracé</Text>
                  <Text className={`text-xs`} style={{ color: colors.hexSubtext }}>{profile?.kanji_trace_count || 10} fois / caractère</Text>
                </View>
              </View>
              <Text className={`font-black text-xl`} style={{ color: colors.hexSubtext }}>{'>'}</Text>
            </Pressable>

            <Pressable 
              onPress={() => setThemeModalVisible(true)}
              className={`flex-row items-center justify-between p-5 border-b active:opacity-60 rounded-2xl transition-colors`}
              style={{ borderBottomColor: colors.hexBorder }}
            >
              <View className="flex-row items-center gap-4">
                <View className={`w-10 h-10 rounded-full items-center justify-center`} style={{ backgroundColor: colors.hexAccent + '1a' }}>
                  <Text className="text-lg">{themeLabels[theme].icon}</Text>
                </View>
                <View>
                  <Text className={`font-bold text-lg`} style={{ color: colors.hexText }}>Thème de l&apos;app</Text>
                  <Text className={`text-xs`} style={{ color: colors.hexSubtext }}>{themeLabels[theme].label}</Text>
                </View>
              </View>
              <Text className={`font-black text-xl`} style={{ color: colors.hexSubtext }}>{'>'}</Text>
            </Pressable>

            <Pressable 
              onPress={async () => {
                const newValue = profile?.show_exams === 1 ? false : true;
                await updateShowExams(newValue);
                loadProfile();
              }}
              className={`flex-row items-center justify-between p-5 active:opacity-60 rounded-2xl transition-colors`}
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-amber-500/20 rounded-full items-center justify-center">
                  <Text className="text-lg">🔥</Text>
                </View>
                <View>
                  <Text className={`font-bold text-lg`} style={{ color: colors.hexText }}>Section Examens</Text>
                  <Text className={`text-xs`} style={{ color: colors.hexSubtext }}>{profile?.show_exams === 1 ? 'Affichée' : 'Masquée'}</Text>
                </View>
              </View>
              <Ionicons 
                name={profile?.show_exams === 1 ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color={profile?.show_exams === 1 ? colors.hexAccent : colors.hexSubtext} 
              />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between mb-4 ml-2">
            <Text className={`text-xs font-black tracking-[0.2em]`} style={{ color: colors.hexSubtext }}>
              BOUTIQUE DE STYLES
            </Text>
            <View className="bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
              <Text className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                {getUserRank(profile?.total_correct || 0).title}
              </Text>
            </View>
          </View>

          <View 
            className={`rounded-[2rem] p-4 border mb-10 shadow-xl`}
            style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {[
                { id: 'classic', name: 'Classique', icon: '🖌️', rank: 'novice', color: colors.hexText },
                { id: 'sumie', name: 'Sumi-e', icon: '🎋', rank: 'ronin', color: '#4B5563' },
                { id: 'gold', name: 'Or Pur', icon: '✨', rank: 'samurai', color: '#FBBF24' },
                { id: 'neon', name: 'Néon', icon: '🌌', rank: 'shogun', color: '#6366F1' },
              ].map((skin) => {
                const userPoints = profile?.total_correct || 0;
                const rankInfo = getUserRank(userPoints);
                const ranks = ['novice', 'apprenti', 'ronin', 'samurai', 'shogun'];
                const isLocked = ranks.indexOf(skin.rank) > ranks.indexOf(rankInfo.id);
                const isSelected = profile?.brush_skin === skin.id;

                return (
                  <Pressable
                    key={skin.id}
                    onPress={async () => {
                      if (isLocked) {
                        Alert.alert("Style Verrouillé", `Débloque le rang ${skin.rank.toUpperCase()} pour utiliser ce style !`);
                        return;
                      }
                      const { updateBrushSkin } = require('../services/db/queries');
                      await updateBrushSkin(skin.id);
                      loadProfile();
                    }}
                    className="mr-4 items-center"
                    style={{ width: 100 }}
                  >
                    <View 
                      className={`w-20 h-20 rounded-3xl items-center justify-center mb-2 border-2 relative`}
                      style={{ 
                        backgroundColor: isSelected ? skin.color + '20' : colors.hexBgSecondary,
                        borderColor: isSelected ? skin.color : 'transparent',
                        opacity: isLocked ? 0.4 : 1
                      }}
                    >
                      <Text className="text-3xl">{skin.icon}</Text>
                      {isLocked && (
                        <View className="absolute inset-0 items-center justify-center bg-black/20 rounded-3xl">
                          <Ionicons name="lock-closed" size={20} color="white" />
                        </View>
                      )}
                    </View>
                    <Text 
                      className={`text-[10px] font-black uppercase tracking-tighter text-center`} 
                      style={{ color: isSelected ? skin.color : colors.hexSubtext }}
                    >
                      {skin.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Text className={`text-xs font-black mb-4 tracking-[0.2em] ml-2`} style={{ color: colors.hexSubtext }}>
            MAINTENANCE DE LA BASE
          </Text>

          <View 
            className={`rounded-[2rem] p-2 border mb-10 shadow-xl`}
            style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
          >
            <Pressable 
              onPress={handleExportShare}
              className={`flex-row items-center justify-between p-5 border-b active:opacity-60 transition-colors`}
              style={{ borderBottomColor: colors.hexBorder }}
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-blue-500/20 rounded-full items-center justify-center">
                  <Ionicons name="share-outline" size={20} color="#3b82f6" />
                </View>
                <View>
                  <Text className={`font-bold text-lg`} style={{ color: colors.hexText }}>Partager la base</Text>
                  <Text className={`text-xs`} style={{ color: colors.hexSubtext }}>Envoyer via le menu de partage</Text>
                </View>
              </View>
              <Ionicons name="share-social-outline" size={20} color={colors.hexSubtext} />
            </Pressable>

            <Pressable 
              onPress={handleExportDownload}
              className={`flex-row items-center justify-between p-5 border-b active:opacity-60 rounded-b-2xl transition-colors`}
              style={{ borderBottomColor: colors.hexBorder }}
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-emerald-500/20 rounded-full items-center justify-center">
                  <Ionicons name="download-outline" size={20} color="#10b981" />
                </View>
                <View>
                  <Text className={`font-bold text-lg`} style={{ color: colors.hexText }}>Sauvegarder sur l&apos;appareil</Text>
                  <Text className={`text-xs`} style={{ color: colors.hexSubtext }}>Choisir un dossier local</Text>
                </View>
              </View>
              <Ionicons name="folder-open-outline" size={20} color={colors.hexSubtext} />
            </Pressable>

            <Pressable 
              onPress={async () => {
                const { scheduleSRSReviewNotification } = require('../services/notifications');
                await scheduleSRSReviewNotification(5); // Notif dans 5 secondes
                Alert.alert("Test", "Une notification de test a été planifiée dans 5 secondes. Ferme vite l'application (ou mets-la en veille) pour voir si elle s'affiche !");
              }}
              className={`flex-row items-center justify-between p-5 border-b active:opacity-60 transition-colors`}
              style={{ borderBottomColor: colors.hexBorder }}
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-violet-500/20 rounded-full items-center justify-center">
                  <Ionicons name="notifications-outline" size={20} color="#8b5cf6" />
                </View>
                <View>
                  <Text className={`font-bold text-lg`} style={{ color: colors.hexText }}>Tester les Notifications</Text>
                  <Text className={`text-xs`} style={{ color: colors.hexSubtext }}>Vérifier si les rappels arrivent bien</Text>
                </View>
              </View>
              <Ionicons name="flask-outline" size={20} color={colors.hexSubtext} />
            </Pressable>

            <Pressable 
              onPress={handleReset}
              className={`flex-row items-center justify-between p-5 active:opacity-60 rounded-2xl transition-colors`}
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-orange-500/20 rounded-full items-center justify-center">
                  <Text className="text-lg">🧨</Text>
                </View>
                <View>
                  <Text className="text-orange-500 font-bold text-lg">Réinitialiser tout</Text>
                  <Text className={`text-xs`} style={{ color: colors.hexSubtext }}>Remettre à zéro (Action critique)</Text>
                </View>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <Modal visible={isGoalModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View 
            className={`rounded-t-[3rem] p-8 border-t`}
            style={{ backgroundColor: colors.hexCard, borderTopColor: colors.hexBorder }}
          >
            <View className="flex-row justify-between items-center mb-8">
              <Text className={`text-2xl font-black`} style={{ color: colors.hexText }}>Objectif Quotidien</Text>
              <Pressable onPress={() => setGoalModalVisible(false)}><Ionicons name="close" size={28} color={colors.hexSubtext} /></Pressable>
            </View>
            <View className="flex-row flex-wrap gap-4 mb-10">
              {[10, 20, 50, 100].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => handleUpdateGoal(num)}
                  className={`px-8 py-4 rounded-2xl border-2`}
                  style={{ 
                    backgroundColor: profile?.daily_goal === num ? colors.hexAccent + '1a' : colors.hexBgSecondary,
                    borderColor: profile?.daily_goal === num ? colors.hexAccent : 'transparent'
                  }}
                >
                  <Text className={`font-black text-lg`} style={{ color: profile?.daily_goal === num ? colors.hexAccent : colors.hexSubtext }}>{num}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isStrategyModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View 
            className={`rounded-t-[3rem] p-8 border-t`}
            style={{ backgroundColor: colors.hexCard, borderTopColor: colors.hexBorder }}
          >
            <View className="flex-row justify-between items-center mb-8">
              <Text className={`text-2xl font-black`} style={{ color: colors.hexText }}>Stratégie SRS</Text>
              <Pressable onPress={() => setStrategyModalVisible(false)}><Ionicons name="close" size={28} color={colors.hexSubtext} /></Pressable>
            </View>
            <View className="gap-4 mb-10">
              {(Object.keys(strategyLabels) as Array<'intensive' | 'balanced' | 'relaxed'>).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => handleUpdateStrategy(s)}
                  className={`p-5 rounded-2xl border-2 flex-row items-center gap-4`}
                  style={{ 
                    backgroundColor: (profile?.learning_strategy || 'balanced') === s ? colors.hexAccent + '1a' : colors.hexBgSecondary,
                    borderColor: (profile?.learning_strategy || 'balanced') === s ? colors.hexAccent : 'transparent'
                  }}
                >
                  <Text className="text-3xl">{strategyLabels[s].icon}</Text>
                  <View className="flex-1">
                    <Text className={`font-black text-lg`} style={{ color: (profile?.learning_strategy || 'balanced') === s ? colors.hexAccent : colors.hexText }}>
                      {strategyLabels[s].label}
                    </Text>
                    <Text className="text-xs" style={{ color: colors.hexSubtext }}>{strategyLabels[s].desc}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isTraceModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View 
            className={`rounded-t-[3rem] p-8 border-t`}
            style={{ backgroundColor: colors.hexCard, borderTopColor: colors.hexBorder }}
          >
            <View className="flex-row justify-between items-center mb-8">
              <Text className={`text-2xl font-black`} style={{ color: colors.hexText }}>Répétitions du Tracé</Text>
              <Pressable onPress={() => setTraceModalVisible(false)}><Ionicons name="close" size={28} color={colors.hexSubtext} /></Pressable>
            </View>
            <Text className="text-xs mb-6 font-bold" style={{ color: colors.hexSubtext }}>
              Nombre de fois où tu dois tracer un nouveau Kanji pour le valider.
            </Text>
            <View className="flex-row flex-wrap gap-3 mb-10">
              {[1, 3, 5, 10].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => handleUpdateTraceCount(num)}
                  className={`px-6 py-4 rounded-2xl border-2 flex-1 items-center`}
                  style={{ 
                    backgroundColor: (profile?.kanji_trace_count || 10) === num ? colors.hexAccent + '1a' : colors.hexBgSecondary,
                    borderColor: (profile?.kanji_trace_count || 10) === num ? colors.hexAccent : 'transparent'
                  }}
                >
                  <Text className={`font-black text-lg`} style={{ color: (profile?.kanji_trace_count || 10) === num ? colors.hexAccent : colors.hexSubtext }}>{num}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isThemeModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View 
            className={`rounded-t-[3rem] p-8 border-t`}
            style={{ backgroundColor: colors.hexCard, borderTopColor: colors.hexBorder }}
          >
            <View className="flex-row justify-between items-center mb-8">
              <Text className={`text-2xl font-black`} style={{ color: colors.hexText }}>Thème de l&apos;application</Text>
              <Pressable onPress={() => setThemeModalVisible(false)}><Ionicons name="close" size={28} color={colors.hexSubtext} /></Pressable>
            </View>
            <View className="gap-4 mb-10">
              {(Object.keys(themeLabels) as AppTheme[]).map((t) => {
                const userPoints = profile?.total_correct || 0;
                const rankInfo = getUserRank(userPoints);
                const ranks = ['novice', 'apprenti', 'ronin', 'samurai', 'shogun'];
                
                const themeRequiredRank: Record<AppTheme, string> = {
                  indigo_zen: 'novice',
                  sakura_night: 'apprenti',
                  sakura_white: 'ronin',
                  kyoto_gold: 'samurai'
                };

                const isLocked = ranks.indexOf(themeRequiredRank[t]) > ranks.indexOf(rankInfo.id);

                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      if (isLocked) {
                        Alert.alert("Thème Verrouillé", `Débloque le rang ${themeRequiredRank[t].toUpperCase()} pour utiliser ce thème !`);
                        return;
                      }
                      handleUpdateTheme(t);
                    }}
                    className={`p-5 rounded-2xl border-2 flex-row items-center gap-4`}
                    style={{ 
                      backgroundColor: theme === t ? colors.hexAccent + '1a' : colors.hexBgSecondary,
                      borderColor: theme === t ? colors.hexAccent : 'transparent',
                      opacity: isLocked ? 0.5 : 1
                    }}
                  >
                    <View className="relative">
                      <Text className="text-2xl">{themeLabels[t].icon}</Text>
                      {isLocked && (
                        <View className="absolute -bottom-1 -right-1 bg-black/40 rounded-full p-0.5">
                          <Ionicons name="lock-closed" size={10} color="white" />
                        </View>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className={`font-black text-lg`} style={{ color: theme === t ? colors.hexAccent : colors.hexSubtext }}>{themeLabels[t].label}</Text>
                      {isLocked && (
                        <Text className="text-[10px] font-bold opacity-50 uppercase" style={{ color: colors.hexSubtext }}>
                          Requis : {themeRequiredRank[t]}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
