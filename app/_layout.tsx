import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { ReanimatedLogLevel, configureReanimatedLogger } from 'react-native-reanimated';
import '../global.css';

// Désactiver le mode strict de Reanimated pour éviter les warnings de lecture pendant le rendu
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreLogs(['[Reanimated] Reading from `value` during component render']);

import { initializeSchema } from '../services/db/schema';
import { seedDatabaseIfNeeded } from '../services/db/seeder';
import { CustomNavbar } from '../components/CustomNavbar';
import { MenuModal } from '../components/MenuModal';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AudioProvider } from '../context/AudioContext';
import { MiniAudioPlayer } from '../components/MiniAudioPlayer';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function AppContent() {
	const { theme, colors } = useTheme();
	const [isMenuVisible, setIsMenuVisible] = useState(false);

	return (
		<View className="flex-1" style={{ backgroundColor: colors.hexBg }}>
			<StatusBar style={colors.isLight ? "dark" : "light"} />
			
			<CustomNavbar
				onMenuPress={() => setIsMenuVisible(true)}
			/>

			<MenuModal
				visible={isMenuVisible}
				onClose={() => setIsMenuVisible(false)}
			/>

			<Stack 
				screenOptions={{ 
					headerShown: false, 
					contentStyle: { backgroundColor: colors.hexBg } 
				}} 
			>
				<Stack.Screen name="index" />
				<Stack.Screen name="radicals" />
				<Stack.Screen name="learn_radicals" />
				<Stack.Screen name="learn_kanji" />
				<Stack.Screen name="learn_kana" />
				<Stack.Screen name="decks" />
				<Stack.Screen name="deck_editor" />
				<Stack.Screen name="learn_custom" />
				<Stack.Screen name="quiz" />
				<Stack.Screen name="profile" />
				<Stack.Screen name="reading" />
				<Stack.Screen name="search" />
			</Stack>

			<MiniAudioPlayer />
		</View>
	);
}

export default function RootLayout() {
	const [isDbReady, setIsDbReady] = useState(false);

	useEffect(() => {
		async function setupDatabase() {
			try {
				// Configuration audio pour le background
				try {
					const { setAudioModeAsync } = require('expo-audio');
					await setAudioModeAsync({
						playsInSilentMode: true,
						interruptionMode: 'doNotMix',
						interruptionModeAndroid: 'doNotMix',
						staysActiveInBackground: true
					});
				} catch (ae) {
					console.warn("Audio category setup failed:", ae);
				}

				await initializeSchema();
				await seedDatabaseIfNeeded();
				
				// Initialiser les notifications
				try {
					const { requestNotificationPermissions, updateAppBadge } = require('../services/notifications');
					await requestNotificationPermissions();
					await updateAppBadge();
				} catch (nError) {
					console.warn("Notification initialization failed:", nError);
				}

				// Initialiser le widget Android
				try {
					const { refreshWidgetData } = require('../services/widget');
					await refreshWidgetData();
				} catch (wError) {
					console.warn("Widget initialization failed:", wError);
				}

				// Mode Immersif Android (Masquer la barre de navigation)
				if (Platform.OS === 'android') {
					try {
						const NavigationBar = require('expo-navigation-bar');
						await NavigationBar.setVisibilityAsync("hidden");
						await NavigationBar.setBehaviorAsync("overlay-swipe");
					} catch (navError) {
						console.warn("Pour le mode immersif, installez expo-navigation-bar : npm i expo-navigation-bar");
					}
				}

				setIsDbReady(true);
				await SplashScreen.hideAsync();
			} catch (error) {
				console.error("Critical error during database initialization:", error);
			}
		}
		setupDatabase();
	}, []);

	if (!isDbReady) {
		return (
			<View className="flex-1 items-center justify-center bg-slate-950">
				<StatusBar style="light" />
				<Text className="text-indigo-500 font-bold tracking-widest animate-pulse">
					Chargement de la base de données...
				</Text>
			</View>
		);
	}

	return (
		<ThemeProvider>
			<AudioProvider>
				<AppContent />
			</AudioProvider>
		</ThemeProvider>
	);
}
