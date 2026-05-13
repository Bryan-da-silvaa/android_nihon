import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, ActivityIndicator } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import DigitalInk from '../modules/expo-digital-ink';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = width * 0.8;

interface StrokePoint {
  x: number;
  y: number;
  t: number;
}

interface Stroke {
  points: StrokePoint[];
}

interface Props {
  onRecognized: (candidates: string[]) => void;
}

export function DigitalInkCanvas({ onRecognized }: Props) {
  const { colors } = useTheme();
  const [isModelReady, setIsModelReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(true);
  
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  
  // Historique des traits formaté pour Google ML Kit
  const inkStrokes = useRef<Stroke[]>([]);
  const currentStroke = useRef<StrokePoint[]>([]);
  const recognitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Initialisation et téléchargement du modèle ML Kit
    const initModel = async () => {
      try {
        await DigitalInk.downloadModel();
        setIsModelReady(true);
      } catch (error) {
        console.error("Erreur de téléchargement ML Kit:", error);
      } finally {
        setIsDownloading(false);
      }
    };
    initModel();
  }, []);

  const triggerRecognition = async () => {
    if (!isModelReady || inkStrokes.current.length === 0) return;
    try {
      const results = await DigitalInk.recognize(inkStrokes.current);
      if (results && results.length > 0) {
        onRecognized(results);
      }
    } catch (e) {
      console.error("Reconnaissance échouée:", e);
    }
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart((g) => {
      if (recognitionTimeout.current) clearTimeout(recognitionTimeout.current);

      // Coordonnées visuelles (SVG)
      const svgX = (g.x / CANVAS_SIZE) * 105;
      const svgY = (g.y / CANVAS_SIZE) * 105;
      setCurrentPath(`M ${svgX.toFixed(1)},${svgY.toFixed(1)}`);

      // Coordonnées pour l'IA (absolues)
      currentStroke.current = [{ x: g.x, y: g.y, t: Date.now() }];
    })
    .onUpdate((g) => {
      const svgX = (g.x / CANVAS_SIZE) * 105;
      const svgY = (g.y / CANVAS_SIZE) * 105;
      setCurrentPath((prev) => `${prev} L ${svgX.toFixed(1)},${svgY.toFixed(1)}`);
      
      currentStroke.current.push({ x: g.x, y: g.y, t: Date.now() });
    })
    .onEnd(() => {
      setPaths((prev) => [...prev, currentPath]);
      setCurrentPath('');
      
      inkStrokes.current.push({ points: [...currentStroke.current] });
      currentStroke.current = [];

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // On déclenche la reconnaissance si l'utilisateur arrête de dessiner pendant 600ms
      recognitionTimeout.current = setTimeout(() => {
        triggerRecognition();
      }, 600);
    });

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath('');
    inkStrokes.current = [];
    if (recognitionTimeout.current) clearTimeout(recognitionTimeout.current);
    onRecognized([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (isDownloading) {
    return (
      <View style={[styles.canvas, { backgroundColor: colors.hexCard, borderColor: colors.hexBorder, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.hexAccent} />
        <Text style={{ color: colors.hexSubtext, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }}>
          Téléchargement de l'Intelligence Artificielle (Japonais)...
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
      <View style={[styles.canvas, { backgroundColor: colors.hexCard, borderColor: colors.hexBorder }]}>
        <GestureDetector gesture={panGesture}>
          <View style={StyleSheet.absoluteFill}>
            <Svg style={StyleSheet.absoluteFill} viewBox="0 0 105 105">
              {/* Grille de fond optionnelle */}
              <Path d="M 52.5,0 L 52.5,105 M 0,52.5 L 105,52.5" stroke={colors.hexBorder} strokeWidth="0.5" strokeDasharray="2,2" />

              {paths.map((path, index) => (
                <Path
                  key={index}
                  d={path}
                  stroke={colors.hexText}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              {currentPath ? (
                <Path
                  d={currentPath}
                  stroke={colors.hexText}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : null}
            </Svg>
          </View>
        </GestureDetector>
      </View>
      
      {paths.length > 0 && (
        <Text 
          onPress={clearCanvas}
          style={{ color: colors.hexAccent, textAlign: 'center', marginTop: 10, fontWeight: 'bold' }}
        >
          Effacer
        </Text>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
  }
});
