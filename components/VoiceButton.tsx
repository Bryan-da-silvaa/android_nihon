import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface VoiceButtonProps {
  onResult: (transcripts: string[]) => void;
}

export function VoiceButton({ onResult }: VoiceButtonProps) {
  const { colors } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [partialResult, setPartialResult] = useState('');
  const [volume, setVolume] = useState(0);

  // Events from expo-speech-recognition
  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    setVolume(0);
  });
  useSpeechRecognitionEvent("error", (event) => {
    console.warn('Voice Error:', event.error, event.message);
    setIsListening(false);
    setPartialResult('');
    setVolume(0);
  });
  
  useSpeechRecognitionEvent("volumechange", (event) => {
    // Le volume arrive souvent entre -20 et 0 ou 0 et 100 selon l'OS
    // On le normalise pour l'animation (0 à 1)
    const normalized = Math.min(Math.max((event.value + 40) / 40, 0), 1);
    setVolume(normalized);
  });

  useSpeechRecognitionEvent("result", (event) => {
    // On récupère toutes les alternatives possibles pour augmenter les chances de match
    const results = event.results[0] as any;
    const allTranscripts: string[] = results && typeof results.map === 'function' 
      ? results.map((alt: any) => alt.transcript)
      : (results?.transcript ? [results.transcript] : []);
    
    if (allTranscripts.length > 0) {
      setPartialResult(allTranscripts[0]);
      if (event.isFinal) {
        onResult(allTranscripts);
        ExpoSpeechRecognitionModule.stop();
      }
    }
  });

  const hasPermission = React.useRef(false);

  // Pré-vérification de la permission au montage pour supprimer le délai au premier clic
  React.useEffect(() => {
    async function preCheck() {
      try {
        const { granted } = await ExpoSpeechRecognitionModule.getPermissionsAsync();
        if (granted) hasPermission.current = true;
      } catch (e) {
        console.log("Pre-check permission failed (normal on first boot)");
      }
    }
    preCheck();
  }, []);

  const startListening = async () => {
    try {
      // On ne demande la permission que si on ne l'a pas déjà
      if (!hasPermission.current) {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission.granted) {
          console.warn("Permission micro refusée");
          return;
        }
        hasPermission.current = true;
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
        className={`w-20 h-20 rounded-full items-center justify-center border-4 shadow-xl active:scale-95 z-20`}
        style={{ 
          backgroundColor: isListening ? colors.hexAccent : colors.hexCard,
          borderColor: isListening ? colors.hexAccent : colors.hexBorder,
        }}
      >
        {/* Halo de volume dynamique */}
        {isListening && (
          <View 
            className="absolute rounded-full"
            style={{
              width: 80 + (volume * 40),
              height: 80 + (volume * 40),
              backgroundColor: colors.hexAccent,
              opacity: 0.3,
              zIndex: -1
            }}
          />
        )}
        <Ionicons name="mic" size={40} color={isListening ? '#ffffff' : colors.hexAccent} />
      </Pressable>
    </View>
  );
}
