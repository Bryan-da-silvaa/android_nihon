import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Text } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Path, Text as SvgText, Circle } from 'react-native-svg';
import { getKanjiStrokes } from '../services/kanji_paths';
import { validateKanjiDrawing } from '../services/srs/stroke_validator';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = width * 0.75;

interface Props {
  targetKanji: string;
  expectedStrokes?: number;
  onComplete?: (strokeCount: number, score?: number) => void;
  colors: any;
  brushSkin?: string;
}

const BRUSH_STYLES: Record<string, { strokeWidth: number; opacity?: number; glowColor?: string; stroke?: string }> = {
  classic: { strokeWidth: 3 },
  sumie: { strokeWidth: 5, opacity: 0.7, stroke: '#4B5563' },
  gold: { strokeWidth: 4, stroke: '#FBBF24' },
  neon: { strokeWidth: 4, stroke: '#6366F1' },
};

export const KanjiCanvas: React.FC<Props> = ({ targetKanji, expectedStrokes, onComplete, colors, brushSkin = 'classic' }) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [strokeCount, setStrokeCount] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);

  const skinStyle = BRUSH_STYLES[brushSkin] || BRUSH_STYLES.classic;
  const strokes = getKanjiStrokes(targetKanji);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart((g) => {
      // Conversion des coordonnées écran vers coordonnées SVG (0-105)
      const svgX = (g.x / CANVAS_SIZE) * 105;
      const svgY = (g.y / CANVAS_SIZE) * 105 - 5;
      const newPath = `M ${svgX.toFixed(1)},${svgY.toFixed(1)}`;
      setCurrentPath(newPath);
    })
    .onUpdate((g) => {
      const svgX = (g.x / CANVAS_SIZE) * 105;
      const svgY = (g.y / CANVAS_SIZE) * 105 - 5;
      setCurrentPath((prev) => `${prev} L ${svgX.toFixed(1)},${svgY.toFixed(1)}`);
    })
    .onEnd(() => {
      setPaths((prev) => [...prev, currentPath]);
      setCurrentPath('');
      setStrokeCount((prev) => prev + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath('');
    setStrokeCount(0);
    // On ne reset pas lastScore tout de suite pour qu'il reste visible un petit moment
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderPath = (d: string, key?: string | number) => {
    const strokeColor = skinStyle.stroke || colors.hexAccent || "#8b5cf6";
    
    return (
      <Path
        key={key}
        d={d}
        stroke={strokeColor}
        strokeWidth={skinStyle.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={skinStyle.opacity || 1}
      />
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View 
        style={[styles.canvas, { backgroundColor: colors.hexBgSecondary, borderColor: colors.hexBorder }]}
      >
        {/* MODÈLE DE FOND "PAR DÉFAUT" (Style Internet/Imprimé) */}
        {!showGuide && (
          <Text style={[styles.guideKanji, { color: colors.hexText }]}>
            {targetKanji}
          </Text>
        )}

        {/* Badge de Score Discret */}
        {lastScore !== null && (
          <View className="absolute top-4 left-4 px-2 py-1 rounded-full bg-black/20 z-10">
            <Text className="text-white font-black text-xs">
              {lastScore}%
            </Text>
          </View>
        )}

        {/* Zone de dessin */}
        <GestureDetector gesture={panGesture}>
          <View style={StyleSheet.absoluteFill}>
            <Svg style={StyleSheet.absoluteFill} viewBox="0 -5 105 105">
              {/* AFFICHAGE DE L'ORDRE DES TRAITS (KANJIVG) */}
              {showGuide && strokes && strokes.map((stroke, index) => {
                // Extraction sécurisée du premier point du trait
                const coords = stroke.match(/M\s*([\d.]+)\s*[, ]\s*([\d.]+)/);
                if (!coords) return null;
                
                const startX = parseFloat(coords[1]);
                const startY = parseFloat(coords[2]);

                if (isNaN(startX) || isNaN(startY)) return null;

                return (
                  <React.Fragment key={`guide-${index}`}>
                    <Path
                      d={stroke}
                      stroke={colors.hexSubtext}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"
                      opacity={0.3}
                    />
                    {/* Petit point de départ raffiné */}
                    <Circle
                      cx={startX}
                      cy={startY}
                      r="1.8"
                      fill={colors.hexAccent}
                    />
                    <SvgText
                      x={startX + 2.5}
                      y={startY + 2.5}
                      fill={colors.hexAccent}
                      fontSize="4.5"
                      fontWeight="900"
                    >
                      {index + 1}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* TRAITS DE L'UTILISATEUR */}
              {paths.map((path, index) => renderPath(path, index))}
              {currentPath ? renderPath(currentPath, 'current') : null}
            </Svg>
          </View>
        </GestureDetector>

        {/* Bouton pour afficher l'aide (ordre) */}
        {strokes && (
          <Pressable 
            onPress={() => setShowGuide(!showGuide)}
            className="absolute top-4 right-4 p-2 rounded-full"
            style={{ backgroundColor: showGuide ? colors.hexAccent : colors.hexCard, borderWidth: 1, borderColor: colors.hexBorder }}
          >
            <Ionicons name="eye" size={20} color={showGuide ? "#fff" : colors.hexSubtext} />
          </Pressable>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable 
          onPress={clearCanvas}
          className="px-6 py-3 rounded-2xl active:opacity-60"
          style={{ backgroundColor: colors.hexBgSecondary }}
        >
          <Text style={{ color: colors.hexSubtext, fontWeight: 'bold' }}>Effacer</Text>
        </Pressable>

        <Pressable 
          onPress={() => {
            if (strokeCount > 0 && strokes) {
              const validation = validateKanjiDrawing(paths, strokes, 25);
              
              if (!validation.isValid) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                alert(`❌ Erreur : ${validation.errorMsg}\n\nRecommencez depuis le début.`);
                setLastScore(0);
                clearCanvas();
                return;
              }

              // Si tout est parfait
              setLastScore(validation.score || 100);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onComplete?.(strokeCount, validation.score);
              clearCanvas();
            }
          }}
          className="px-10 py-3 rounded-2xl active:scale-95"
          style={{ backgroundColor: strokeCount > 0 ? colors.hexAccent : colors.hexBgSecondary }}
        >
          <Text style={{ color: strokeCount > 0 ? "#fff" : colors.hexSubtext, fontWeight: 'bold' }}>
            Valider le tracé
          </Text>
        </Pressable>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideKanji: {
    fontSize: CANVAS_SIZE * 0.6,
    position: 'absolute',
    opacity: 0.05,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: CANVAS_SIZE,
    marginTop: 15,
  }
});
