import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

export function MiniAudioPlayer() {
  const { currentArticle, isPlaying, togglePlayback, stopPlayback, progress } = useAudio();
  const { colors } = useTheme();

  if (!currentArticle) return null;

  return (
    <Animated.View 
      entering={FadeInDown} 
      exiting={FadeOutDown}
      className="absolute bottom-2 left-2 right-2 rounded-2xl overflow-hidden shadow-2xl"
      style={{ 
        backgroundColor: colors.hexCard,
        borderWidth: 1,
        borderColor: colors.hexBorder,
        elevation: 10,
        zIndex: 9999
      }}
    >
      {/* Progress Bar */}
      <View 
        className="absolute top-0 left-0 h-1 bg-indigo-500" 
        style={{ width: `${progress * 100}%` }} 
      />

      <View className="flex-row items-center p-3">
        <View className="w-10 h-10 rounded-xl bg-indigo-500/20 items-center justify-center mr-3">
          <Ionicons name="musical-notes" size={20} color={colors.hexAccent} />
        </View>

        <View className="flex-1">
          <Text 
            numberOfLines={1} 
            className="font-bold text-sm" 
            style={{ color: colors.hexText }}
          >
            {currentArticle.title}
          </Text>
          <Text className="text-xs opacity-50" style={{ color: colors.hexText }}>
            NHK News Easy
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable 
            onPress={togglePlayback}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.hexAccent + '20' }}
          >
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={20} 
              color={colors.hexAccent} 
            />
          </Pressable>

          <Pressable 
            onPress={stopPlayback}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <Ionicons name="close" size={20} color={colors.hexText} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
