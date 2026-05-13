import React, { createContext, useContext, useState, useEffect } from 'react';
import { createAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

interface AudioContextType {
  isPlaying: boolean;
  currentArticle: { title: string; audioUrl: string } | null;
  playArticle: (title: string, audioUrl: string) => void;
  togglePlayback: () => void;
  stopPlayback: () => void;
  progress: number;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentArticle, setCurrentArticle] = useState<{ title: string; audioUrl: string } | null>(null);
  const [player, setPlayer] = useState(() => createAudioPlayer(null));
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (currentArticle?.audioUrl) {
      console.log(`🎵 Initialisation lecteur pour: ${currentArticle.title}`);
      
      // Désactiver l'ancien si nécessaire
      try {
        if (player && (player as any).setActiveForLockScreen) {
          (player as any).setActiveForLockScreen(false);
        }
      } catch (e) {}

      const newPlayer = createAudioPlayer(currentArticle.audioUrl);
      
      // Configuration immédiate
      newPlayer.loop = true;
      try {
        if ((newPlayer as any).setActiveForLockScreen) {
          (newPlayer as any).setActiveForLockScreen(true, {
            title: currentArticle.title,
            artist: 'Nihon News',
            albumTitle: 'Immersion Podcast'
          });
        }
      } catch (e) {
        console.warn("Could not set audio lockscreen controls:", e);
      }

      setPlayer(newPlayer);
      newPlayer.play();

      return () => {
        newPlayer.pause();
        try {
          if ((newPlayer as any).setActiveForLockScreen) {
            (newPlayer as any).setActiveForLockScreen(false);
          }
        } catch (e) {}
      };
    }
  }, [currentArticle]);

  // Observer les erreurs
  useEffect(() => {
    if (status.error) {
      console.error("❌ Erreur Lecteur Audio:", status.error);
    }
  }, [status.error]);

  const playArticle = (title: string, audioUrl: string) => {
    if (currentArticle?.audioUrl === audioUrl) {
      player.play();
    } else {
      setCurrentArticle({ title, audioUrl });
    }
  };

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const stopPlayback = () => {
    player.pause();
    setCurrentArticle(null);
  };

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  return (
    <AudioContext.Provider value={{ 
      isPlaying: status.playing, 
      currentArticle, 
      playArticle, 
      togglePlayback, 
      stopPlayback,
      progress
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
}
