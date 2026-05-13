import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

import { initializeSchema } from '../services/db/schema';
import { seedDatabaseIfNeeded } from '../services/db/seeder';
import { CustomNavbar } from '../components/CustomNavbar';
import { MenuModal } from '../components/MenuModal';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

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
		</View>
	);
}

export default function RootLayout() {
	const [isDbReady, setIsDbReady] = useState(false);

	useEffect(() => {
		async function setupDatabase() {
			try {
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
			<AppContent />
		</ThemeProvider>
	);
}
