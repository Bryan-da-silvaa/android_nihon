import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface VoiceButtonProps {
  onResult: (recognizedText: string) => void;
}

export function VoiceButton({ onResult }: VoiceButtonProps) {
  const { colors } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [partialResult, setPartialResult] = useState('');

  // Events from expo-speech-recognition
  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("error", (event) => {
    console.warn('Voice Error:', event.error, event.message);
    setIsListening(false);
    setPartialResult('');
  });
  
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) {
      setPartialResult(transcript);
      if (event.isFinal) {
        onResult(transcript);
        ExpoSpeechRecognitionModule.stop();
      }
    }
  });

  const startListening = async () => {
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        console.warn("Permission micro refusée");
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPartialResult('');
      
      ExpoSpeechRecognitionModule.start({
        lang: 'ja-JP', // Force la reconnaissance en Japonais
        interimResults: true,
        continuous: false,
        requiresOnDeviceRecognition: false, // On utilise le réseau par défaut (plus précis)
        iosTaskHint: "dictation",
      });
    } catch (e) {
      console.error("Erreur démarrage voix:", e);
    }
  };

  const stopListening = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      ExpoSpeechRecognitionModule.stop();
    } catch (e) {
      console.error("Erreur arrêt voix:", e);
    }
  };

  return (
    <View className="items-center justify-center my-4 w-full relative">
      {/* Affichage du texte en cours de dictée au-dessus du bouton */}
      {isListening && (
        <Text 
          className="font-black text-center absolute -top-10 px-4 w-full" 
          style={{ color: colors.hexAccent, fontSize: 16 }}
          numberOfLines={1}
        >
          {partialResult || "J'écoute..."}
        </Text>
      )}

      <Pressable
        onPressIn={startListening}
        onPressOut={stopListening}
        className={`w-20 h-20 rounded-full items-center justify-center border-4 shadow-xl active:scale-95`}
        style={{ 
          backgroundColor: isListening ? colors.hexAccent : colors.hexCard,
          borderColor: isListening ? colors.hexAccent : colors.hexBorder,
        }}
      >
        <Ionicons name="mic" size={40} color={isListening ? '#ffffff' : colors.hexAccent} />
      </Pressable>
    </View>
  );
}
