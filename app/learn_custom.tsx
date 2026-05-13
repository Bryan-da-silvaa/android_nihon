import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDb } from '../services/db/client';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

export default function LearnCustomScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const deckId = typeof params.deckId === 'string' ? parseInt(params.deckId) : 0;
	
	const [cards, setCards] = useState<any[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);

	const loadNewCards = async () => {
		const db = await getDb();
		const rows = await db.getAllAsync(
			'SELECT * FROM custom_cards WHERE deck_id = ? AND repetition = 0 LIMIT 5', 
			[deckId]
		);
		setCards(rows);
	};

	useEffect(() => {
		loadNewCards();
	}, [deckId]);

	const nextCard = () => {
		if (currentIndex < cards.length - 1) {
			setCurrentIndex(currentIndex + 1);
		} else {
			// Redirection vers le quiz en mode apprentissage (donc sur ces cartes précises)
			router.push({ 
				pathname: '/quiz', 
				params: { type: 'custom', deckId, learning: 'true' } 
			});
		}
	};

	if (cards.length === 0) return (
		<View className="flex-1 bg-slate-950 items-center justify-center p-6">
			<Text className="text-white font-bold">Aucune nouvelle carte à apprendre !</Text>
			<Pressable onPress={() => router.back()} className="mt-4 bg-indigo-600 px-6 py-3 rounded-xl">
				<Text className="text-white font-bold">RETOUR</Text>
			</Pressable>
		</View>
	);

	const current = cards[currentIndex];

	return (
		<View className="flex-1 bg-slate-950 px-6 pt-12">
			<View className="flex-row items-center justify-between mb-8">
				<Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-900 rounded-xl border border-slate-800">
					<Ionicons name="close" size={20} color="white" />
				</Pressable>
				<Text className="text-slate-500 font-black text-xs tracking-widest">DÉCOUVERTE</Text>
				<View className="w-10" />
			</View>

			{/* Progress */}
			<View className="flex-row items-center gap-2 mb-10">
				{cards.map((_, i) => (
					<View key={i} className={`flex-1 h-1.5 rounded-full ${i <= currentIndex ? 'bg-indigo-500' : 'bg-slate-800'}`} />
				))}
			</View>

			<View className="flex-1 items-center justify-center pb-20">
				<View className="bg-slate-900 w-full rounded-[3.5rem] p-10 items-center border border-slate-800 shadow-2xl relative overflow-hidden">
					<View className="absolute inset-0 bg-indigo-500/5" />
					
					<Pressable 
						onPress={() => Speech.speak(current.reading || current.front, { language: 'ja-JP' })}
						className="absolute top-8 right-8 p-2 active:scale-90 transition-transform"
					>
						<Ionicons name="volume-high" size={32} color="#6366f1" />
					</Pressable>

					<View className="items-center">
						<Text className="text-8xl text-white font-black mb-4">{current.front}</Text>
						{current.reading && (
							<Text className="text-2xl text-indigo-400 font-bold mb-6 tracking-widest">{current.reading}</Text>
						)}
						<View className="w-16 h-1 bg-slate-800 rounded-full my-6" />
						<Text className="text-3xl text-slate-300 font-medium text-center">{current.back}</Text>
					</View>
				</View>
			</View>

			<Pressable 
				onPress={nextCard}
				className="bg-indigo-600 py-6 rounded-[2.5rem] items-center mb-16 shadow-xl active:scale-95"
			>
				<Text className="text-white font-black text-lg tracking-widest uppercase">
					{currentIndex === cards.length - 1 ? 'COMMENCER LE TEST' : 'CARTE SUIVANTE'}
				</Text>
			</Pressable>
		</View>
	);
}
