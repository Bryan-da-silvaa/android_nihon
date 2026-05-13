import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { getDashboardStats } from '../services/db/queries';
import { useTheme } from '../context/ThemeContext';

interface CustomNavbarProps {
  onMenuPress: () => void;
}

export function CustomNavbar({ onMenuPress }: CustomNavbarProps) {
  const { colors } = useTheme();
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    async function loadStreak() {
      const stats = await getDashboardStats();
      setStreak(stats.streak);
    }
    loadStreak();

    const { DeviceEventEmitter } = require('react-native');
    const subscription = DeviceEventEmitter.addListener('streakUpdated', (newStreak: number) => {
      setStreak(newStreak);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View 
      className={`flex-row items-center justify-between px-6 pt-16 pb-4 border-b`}
      style={{ backgroundColor: colors.hexBg, borderBottomColor: colors.hexBorder }}
    >
      {/* Hamburger Menu Button */}
      <Pressable 
        onPress={onMenuPress}
        className="p-2 -ml-2 rounded-full active:opacity-60"
      >
        <View className="gap-1.5">
          <View className={`w-6 h-0.5 rounded-full`} style={{ backgroundColor: colors.hexText }} />
          <View className={`w-4 h-0.5 rounded-full`} style={{ backgroundColor: colors.hexText }} />
          <View className={`w-6 h-0.5 rounded-full`} style={{ backgroundColor: colors.hexText }} />
        </View>
      </Pressable>

      {/* App Title */}
      <Text className={`text-xl font-black tracking-widest`} style={{ color: colors.hexText }}>
        NIHON
      </Text>

      {/* Streak Indicator */}
      <View 
        className={`flex-row items-center px-3 py-1.5 rounded-full border`}
        style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
      >
        <Text className="text-amber-500 mr-1.5 text-sm">🔥</Text>
        <Text className={`font-bold text-sm`} style={{ color: colors.hexText }}>{streak}</Text>
      </View>
    </View>
  );
}
