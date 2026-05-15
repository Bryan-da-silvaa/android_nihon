import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ModelManager from '../services/ai/modelManager';
import { initializeEngine, closeEngine } from '../modules/local-sensei';

function AISettingsScreen() {
  const router = useRouter();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modelSize, setModelSize] = useState('0 Mo');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const downloadResumable = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const checkStatus = async () => {
    const exists = await ModelManager.checkModelExists();
    setIsDownloaded(exists);
    if (exists) {
      const size = await ModelManager.getModelSize();
      setModelSize(size);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setProgress(0);
      
      downloadResumable.current = ModelManager.createDownloadResumable((p) => {
        setProgress(p);
      });

      const result = await downloadResumable.current.downloadAsync();
      
      if (result) {
        setIsDownloaded(true);
        setIsDownloading(false);
        const size = await ModelManager.getModelSize();
        setModelSize(size);
        Alert.alert("Succès", "Le modèle Sensei a été téléchargé avec succès !");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Le téléchargement a échoué. Vérifiez votre connexion.");
      setIsDownloading(false);
    }
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    const path = ModelManager.getModelPath();
    const result = await initializeEngine(path);
    setIsInitializing(false);
    
    if (result.startsWith("Success")) {
      setIsReady(true);
      Alert.alert("Sensei est prêt", `L'IA locale a été initialisée : ${result}`);
    } else {
      Alert.alert("Erreur", result || "Impossible d'initialiser l'IA. Vérifiez l'espace disque.");
    }
  };

  const handleGoToChat = () => {
    router.push('/ai_chat');
  };

  const handleDelete = async () => {
    Alert.alert(
      "Supprimer le modèle",
      "Voulez-vous vraiment supprimer le modèle de l'IA (3.6 Go) ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            closeEngine();
            await ModelManager.deleteModel();
            setIsDownloaded(false);
            setIsReady(false);
            setModelSize('0 Mo');
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <Stack.Screen options={{ 
        title: 'Paramètres IA',
        headerTransparent: true,
        headerTintColor: '#fff',
        headerTitleStyle: { fontFamily: 'Outfit_700Bold' }
      }} />

      <ScrollView className="flex-1 px-6 pt-24">
        <View className="items-center mb-10">
          <View className="w-24 h-24 bg-indigo-500/20 rounded-full items-center justify-center mb-4 border border-indigo-500/30">
            <Ionicons name="hardware-chip-outline" size={48} color="#818cf8" />
          </View>
          <Text className="text-white text-2xl font-bold text-center">IA Sensei Locale</Text>
          <Text className="text-gray-400 text-center mt-2">
            Utilisez la puissance de votre processeur pour un apprentissage 100% privé et hors-ligne.
          </Text>
        </View>

        <View className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white font-semibold text-lg">Gemma 4 E4B</Text>
            <View className={`px-3 py-1 rounded-full ${isDownloaded ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
              <Text className={isDownloaded ? 'text-green-400' : 'text-gray-400'}>
                {isDownloaded ? 'Installé' : 'Non installé'}
              </Text>
            </View>
          </View>

          <Text className="text-gray-400 text-sm mb-6">
            Taille du fichier : ~3.6 Go. Le modèle le plus puissant pour votre S24 Ultra.
          </Text>

          {isDownloading ? (
            <View className="mb-4">
              <View className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <Animated.View 
                  className="h-full bg-indigo-500"
                  style={{ width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })}}
                />
              </View>
              <Text className="text-indigo-400 text-right text-xs">{(progress * 100).toFixed(1)}%</Text>
            </View>
          ) : !isDownloaded ? (
            <TouchableOpacity 
              onPress={handleDownload}
              className="bg-indigo-600 py-4 rounded-2xl flex-row items-center justify-center"
            >
              <Ionicons name="download-outline" size={20} color="#fff" className="mr-2" />
              <Text className="text-white font-bold ml-2">Télécharger le modèle</Text>
            </TouchableOpacity>
          ) : (
            <View className="gap-3">
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  onPress={handleInitialize}
                  disabled={isReady || isInitializing}
                  className={`flex-1 py-4 rounded-2xl items-center justify-center ${isReady ? 'bg-green-600' : 'bg-indigo-600'}`}
                >
                  <Text className="text-white font-bold">
                    {isInitializing ? 'Initialisation...' : isReady ? 'Sensei Actif' : 'Démarrer Sensei'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleDelete}
                  className="w-14 h-14 bg-red-500/20 rounded-2xl items-center justify-center border border-red-500/30"
                >
                  <Ionicons name="trash-outline" size={24} color="#f87171" />
                </TouchableOpacity>
              </View>

              {isReady && (
                <TouchableOpacity 
                  onPress={handleGoToChat}
                  className="bg-white py-4 rounded-2xl flex-row items-center justify-center"
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#000" className="mr-2" />
                  <Text className="text-black font-bold ml-2">Discuter avec Sensei</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-10">
          <Text className="text-white font-semibold mb-4">Fonctionnalités Incluses</Text>
          <View className="gap-4">
            <FeatureItem icon="chatbubble-ellipses-outline" title="Chat de Pratique" desc="Discutez librement en japonais." />
            <FeatureItem icon="checkmark-circle-outline" title="Correction en temps réel" desc="Sensei corrige vos fautes de grammaire." />
            <FeatureItem icon="shield-checkmark-outline" title="Confidentialité Totale" desc="Vos messages ne sortent jamais du S24." />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default AISettingsScreen;

function FeatureItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <View className="flex-row items-start">
      <View className="bg-indigo-500/20 p-2 rounded-xl mr-4">
        <Ionicons name={icon} size={20} color="#818cf8" />
      </View>
      <View className="flex-1">
        <Text className="text-white font-medium">{title}</Text>
        <Text className="text-gray-500 text-xs mt-1">{desc}</Text>
      </View>
    </View>
  );
}
