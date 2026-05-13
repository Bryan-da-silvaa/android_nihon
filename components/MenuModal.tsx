import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MenuModal({ visible, onClose }: MenuModalProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60">
        <Pressable className="flex-1" onPress={onClose} />
        
        <View 
          className={`absolute left-0 top-0 bottom-0 w-3/4 shadow-2xl p-6 pt-16 border-r`}
          style={{ backgroundColor: colors.hexCard, borderRightColor: colors.hexBorder }}
        >
          <Text className={`text-2xl font-black mb-10 tracking-widest uppercase`} style={{ color: colors.hexText }}>
            Menu
          </Text>

          <View className="gap-8">
            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
                router.push('/');
              }}
            >
              <Text className={`text-xl font-bold opacity-80`} style={{ color: colors.hexText }}>🏠 Accueil</Text>
            </Pressable>
            
            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
              }}
            >
              <Text className={`text-xl font-bold opacity-80`} style={{ color: colors.hexText }}>⛩️ Kanjis (N5-N1)</Text>
            </Pressable>

            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
              }}
            >
              <Text className={`text-xl font-bold opacity-80`} style={{ color: colors.hexText }}>📚 Vocabulaire</Text>
            </Pressable>

            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
                router.push('/search');
              }}
            >
              <Text className={`text-xl font-bold opacity-80`} style={{ color: colors.hexText }}>✍️ Dictionnaire IA</Text>
            </Pressable>

            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
                router.push('/radicals');
              }}
            >
              <Text className={`text-xl font-bold opacity-80`} style={{ color: colors.hexText }}>🎋 Radicaux</Text>
            </Pressable>

            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
                router.push('/reading');
              }}
            >
              <Text className={`text-xl font-bold opacity-80`} style={{ color: colors.hexText }}>📖 Lecture</Text>
            </Pressable>

            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
                router.push('/news');
              }}
            >
              <Text className={`text-xl font-bold opacity-80`} style={{ color: colors.hexText }}>📰 Actualités</Text>
            </Pressable>

            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
                router.push('/decks');
              }}
            >
              <Text className={`text-xl font-bold opacity-80`} style={{ color: colors.hexText }}>🗂️ Mes Decks</Text>
            </Pressable>

            <Pressable 
              className={`active:opacity-50 flex-row items-center mt-8 pt-8 border-t`}
              style={{ borderTopColor: colors.hexBorder }}
              onPress={() => {
                onClose();
                router.push('/profile');
              }}
            >
              <Text className={`text-xl font-bold`} style={{ color: colors.hexSubtext }}>👤 Profil & Réglages</Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}
