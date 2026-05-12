import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { getDashboardStats } from '../services/db/queries';

interface CustomNavbarProps {
  onMenuPress: () => void;
}

export function CustomNavbar({ onMenuPress }: CustomNavbarProps) {
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    async function loadStreak() {
      const stats = await getDashboardStats();
      setStreak(stats.streak);
    }
    loadStreak();
  }, []);

  return (
    <View className="flex-row items-center justify-between px-6 pt-16 pb-4 bg-slate-950 border-b border-slate-900">
      {/* Hamburger Menu Button */}
      <Pressable 
        onPress={onMenuPress}
        className="p-2 -ml-2 rounded-full active:bg-slate-800"
      >
        <View className="gap-1.5">
          <View className="w-6 h-0.5 bg-slate-200 rounded-full" />
          <View className="w-4 h-0.5 bg-slate-200 rounded-full" />
          <View className="w-6 h-0.5 bg-slate-200 rounded-full" />
        </View>
      </Pressable>

      {/* App Title */}
      <Text className="text-xl font-black text-white tracking-widest">
        NIHON
      </Text>

      {/* Streak Indicator */}
      <View className="flex-row items-center bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
        <Text className="text-amber-500 mr-1.5 text-sm">🔥</Text>
        <Text className="text-slate-200 font-bold text-sm">{streak}</Text>
      </View>
    </View>
  );
}
