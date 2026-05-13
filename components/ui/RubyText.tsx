import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface RubyTextProps {
  html: string;
  baseColor: string;
  rubyColor: string;
  baseSize?: number;
  rubySize?: number;
  onWordPress?: (word: string, reading?: string) => void;
}

/**
 * Analyse une chaîne contenant des balises <ruby> et ignore les autres balises.
 */
function parseRuby(html: string) {
  const segments: { text: string; ruby?: string }[] = [];
  // Cette regex capture :
  // 1 & 2 : Le bloc Ruby et son texte rt
  // 3 : N'importe quelle balise HTML qu'on veut ignorer (ex: <p>, </div>)
  // 4 : Le texte brut
  const rubyRegex = /<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>|(<[^>]+>)|([^<]+)/g;
  
  let match;
  while ((match = rubyRegex.exec(html)) !== null) {
    if (match[1] && match[2]) {
      // Bloc Ruby
      segments.push({ text: match[1], ruby: match[2] });
    } else if (match[4]) {
      // Texte normal
      segments.push({ text: match[4] });
    }
    // Si c'est match[3] (une balise inconnue), on l'ignore simplement
  }
  return segments;
}

export function RubyText({ html, baseColor, rubyColor, baseSize = 24, rubySize = 11, onWordPress }: RubyTextProps) {
  const segments = parseRuby(html);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {segments.map((seg, i) => {
        if (seg.ruby) {
          return (
            <Pressable 
              key={i} 
              onPress={() => onWordPress?.(seg.text, seg.ruby)}
              style={{ alignItems: 'center', marginBottom: 5, marginRight: 2 }}
            >
              {/* Le furigana est maintenant caché par défaut pour l'immersion */}
              <View style={{ height: rubySize + 2, justifyContent: 'center' }}>
                <Text 
                  style={{ 
                    fontSize: rubySize, 
                    color: rubyColor, 
                    opacity: 0 // Caché par défaut
                  }}
                >
                  {seg.ruby}
                </Text>
              </View>
              <Text 
                style={{ 
                  fontSize: baseSize, 
                  color: baseColor, 
                  lineHeight: baseSize + 6,
                  fontWeight: '500'
                }}
              >
                {seg.text}
              </Text>
            </Pressable>
          );
        }

        // Texte normal
        return seg.text.split('').map((char, j) => (
          <Pressable key={`${i}-${j}`} onPress={() => onWordPress?.(char)}>
            <Text 
              style={{ 
                fontSize: baseSize, 
                color: baseColor, 
                lineHeight: baseSize + 6,
                marginBottom: 5
              }}
            >
              {char}
            </Text>
          </Pressable>
        ));
      })}
    </View>
  );
}
