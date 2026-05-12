import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

import { initializeSchema } from '../services/db/schema';
import { seedDatabaseIfNeeded } from '../services/db/seeder';
import { CustomNavbar } from '../components/CustomNavbar';
import { MenuModal } from '../components/MenuModal';

export default function RootLayout() {
	const [isDbReady, setIsDbReady] = useState(false);
	const [isMenuVisible, setIsMenuVisible] = useState(false);

	useEffect(() => {
		async function setupDatabase() {
			try {
				await initializeSchema();
				await seedDatabaseIfNeeded();
				setIsDbReady(true);
			} catch (error) {
				console.error("Critical error during database initialization:", error);
			}
		}

		setupDatabase();
	}, []);

	if (!isDbReady) {
		return (
			<View className="flex-1 items-center justify-center bg-slate-950">
				<Text className="text-indigo-500 font-bold tracking-widest animate-pulse">
					Chargement de la base de données...
				</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-slate-950">
			<StatusBar style="light" />
			<CustomNavbar
				onMenuPress={() => setIsMenuVisible(true)}
			/>

			<MenuModal
				visible={isMenuVisible}
				onClose={() => setIsMenuVisible(false)}
			/>

			<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }}>
				<Stack.Screen name="index" />
				<Stack.Screen name="radicals" />
				<Stack.Screen name="learn_radicals" />
				<Stack.Screen name="learn_kanji" />
				<Stack.Screen name="quiz" />
				<Stack.Screen name="profile" />
			</Stack>
		</View>
	);
}
