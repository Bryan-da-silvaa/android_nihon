import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MenuModal({ visible, onClose }: MenuModalProps) {
  const router = useRouter();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60">
        <Pressable className="flex-1" onPress={onClose} />
        
        <View className="absolute left-0 top-0 bottom-0 w-3/4 bg-slate-900 shadow-2xl p-6 pt-16">
          <Text className="text-2xl font-black text-white mb-10 tracking-widest">
            MENU
          </Text>

          <View className="gap-8">
            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
                router.push('/');
              }}
            >
              <Text className="text-xl text-slate-300 font-bold">🏠 Accueil</Text>
            </Pressable>
            
            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
                // TODO: router.push('/kanjis');
              }}
            >
              <Text className="text-xl text-slate-300 font-bold">⛩️ Kanjis (N5-N1)</Text>
            </Pressable>

            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
                // TODO: router.push('/vocabulary');
              }}
            >
              <Text className="text-xl text-slate-300 font-bold">📚 Vocabulaire</Text>
            </Pressable>

            <Pressable 
              className="active:opacity-50 flex-row items-center"
              onPress={() => {
                onClose();
                router.push('/radicals');
              }}
            >
              <Text className="text-xl text-slate-300 font-bold">🎋 Radicaux</Text>
            </Pressable>

            <Pressable 
              className="active:opacity-50 flex-row items-center mt-8 pt-8 border-t border-slate-800"
              onPress={() => {
                onClose();
                router.push('/profile');
              }}
            >
              <Text className="text-xl text-slate-500 font-bold">👤 Profil & Réglages</Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}
