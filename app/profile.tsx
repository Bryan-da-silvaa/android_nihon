import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getUserProfile, UserProfile } from '../services/db/queries';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function loadProfile() {
        const data = await getUserProfile();
        setProfile(data);
      }
      loadProfile();
    }, [])
  );

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView 
        className="flex-1" 
        bounces={false} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        
        {/* Hero Section: Banner + Avatar + Name Overlay */}
        <View className="w-full h-[450px] relative justify-center items-center">
          {profile?.banner ? (
            <Image 
              source={{ uri: profile.banner }} 
              className="absolute top-0 left-0 w-full h-full" 
              resizeMode="cover" 
            />
          ) : (
            <View className="absolute top-0 left-0 w-full h-full bg-indigo-950" />
          )}
          
          {/* Header Back Button */}
          <View className="absolute top-6 left-6 z-20">
            <Pressable 
              onPress={() => router.back()} 
              className="w-12 h-12 bg-black/40 rounded-full items-center justify-center border border-white/10 backdrop-blur-md"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
          </View>

          {/* User Info Centered ON Banner */}
          <View className="items-center z-10">
            <View className="w-36 h-36 bg-slate-900 rounded-full items-center justify-center overflow-hidden border-[4px] border-white/20 shadow-2xl mb-6">
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
              <Text className="text-xl font-black text-indigo-300 drop-shadow-md">
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

        {/* Content Area */}
        <View className="bg-slate-950 px-6 pt-8 pb-20 min-h-[500px]">

          {/* Grid Stats */}
          <Text className="text-xs font-black text-slate-500 mb-4 tracking-[0.2em] ml-2">
            RÉSUMÉ DES PERFORMANCES
          </Text>
          
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1 bg-slate-900 rounded-[2rem] p-6 border border-slate-800/50 items-center shadow-xl relative overflow-hidden">
              <View className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-[2rem]" />
              <Text className="text-4xl font-black text-white mb-1">{profile?.games_played || 0}</Text>
              <Text className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest text-center">Parties Jouées</Text>
            </View>
            
            <View className="flex-1 bg-slate-900 rounded-[2rem] p-6 border border-slate-800/50 items-center shadow-xl relative overflow-hidden">
              <View className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-[2rem]" />
              <Text className="text-4xl font-black text-white mb-1">{profile?.total_correct || 0}</Text>
              <Text className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest text-center">Réponses Justes</Text>
            </View>
          </View>

          {/* Huge Score Widget */}
          <View className="bg-slate-900 rounded-[2.5rem] p-8 mb-10 border border-slate-800 shadow-2xl items-center relative overflow-hidden">
            <View className="absolute -right-4 -bottom-4 w-32 h-32 bg-amber-500/10 rounded-full" />
            <Text className="text-amber-200/50 font-bold text-xs uppercase tracking-[0.2em] mb-2">Record Absolu</Text>
            <View className="flex-row items-baseline gap-2">
              <Text className="text-6xl font-black text-amber-400">{profile?.best_score || 0}</Text>
              <Text className="text-xl font-bold text-amber-500/50">pts</Text>
            </View>
          </View>

          {/* Settings Section */}
          <Text className="text-xs font-black text-slate-500 mb-4 tracking-[0.2em] ml-2">
            RÉGLAGES & COMPTE
          </Text>

          <View className="bg-slate-900 rounded-[2rem] p-2 border border-slate-800 mb-10 shadow-xl">
            <Pressable className="flex-row items-center justify-between p-5 border-b border-slate-800/50 active:bg-slate-800 rounded-2xl transition-colors">
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-indigo-500/20 rounded-full items-center justify-center">
                  <Text className="text-lg">⚙️</Text>
                </View>
                <Text className="text-white font-bold text-lg">Préférences</Text>
              </View>
              <Text className="text-slate-600 font-black text-xl">{'>'}</Text>
            </Pressable>

            <Pressable className="flex-row items-center justify-between p-5 border-b border-slate-800/50 active:bg-slate-800 rounded-2xl transition-colors">
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-emerald-500/20 rounded-full items-center justify-center">
                  <Text className="text-lg">🔄</Text>
                </View>
                <Text className="text-white font-bold text-lg">Synchronisation</Text>
              </View>
              <Text className="text-slate-600 font-black text-xl">{'>'}</Text>
            </Pressable>

            <Pressable className="flex-row items-center justify-between p-5 active:bg-slate-800 rounded-2xl transition-colors">
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-red-500/20 rounded-full items-center justify-center">
                  <Text className="text-lg">🚪</Text>
                </View>
                <Text className="text-red-400 font-bold text-lg">Déconnexion</Text>
              </View>
            </Pressable>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
