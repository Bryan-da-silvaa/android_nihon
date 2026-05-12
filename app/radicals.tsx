import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { getRadicals, Radical } from '../services/db/queries';

export default function RadicalsScreen() {
	const router = useRouter();
	const [radicals, setRadicals] = useState<Radical[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function load() {
			const data = await getRadicals();
			setRadicals(data);
			setIsLoading(false);
		}
		load();
	}, []);

	// Groupement par nombre de traits
	const grouped = radicals.reduce((acc, rad) => {
		const key = rad.stroke_count;
		if (!acc[key]) acc[key] = [];
		acc[key].push(rad);
		return acc;
	}, {} as Record<number, Radical[]>);

	const strokeCounts = Object.keys(grouped).map(Number).sort((a, b) => a - b);

	const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({
		1: true, // On laisse le premier ouvert par défaut
	});

	if (isLoading) {
		return (
			<View className="flex-1 bg-slate-950 items-center justify-center">
				<Text className="text-indigo-200 font-bold tracking-widest animate-pulse">Chargement...</Text>
			</View>
		);
	}

	const toggleSection = (count: number) => {
		setExpandedSections(prev => ({
			...prev,
			[count]: !prev[count]
		}));
	};

	const parseMeaning = (meaning: string) => {
		if (!meaning) return '?';
		try {
			if (meaning.startsWith('[') && meaning.endsWith(']')) {
				const parsed = JSON.parse(meaning);
				return Array.isArray(parsed) ? parsed.join(', ') : meaning;
			}
			return meaning;
		} catch (e) {
			return meaning;
		}
	};

	return (
		<ScrollView className="flex-1 bg-slate-950 px-6 pt-4" showsVerticalScrollIndicator={false}>
			<View className="flex-row items-center mb-10">
				<Pressable 
					onPress={() => router.back()} 
					className="w-12 h-12 bg-slate-900 rounded-2xl border border-slate-800 items-center justify-center mr-4 active:scale-90 transition-all"
				>
					<Text className="text-white text-xl">←</Text>
				</Pressable>
				<View>
					<Text className="text-slate-500 font-black text-[10px] tracking-[0.2em] mb-1 uppercase">Dictionnaire</Text>
					<Text className="text-3xl font-black text-white">Les Radicaux</Text>
				</View>
			</View>

			{/* Bouton Apprendre */}
			<Pressable 
				onPress={() => router.push('/learn_radicals')}
				className="bg-indigo-600 rounded-[2rem] p-6 mb-10 flex-row items-center justify-between shadow-xl active:scale-95 transition-all"
			>
				<View className="flex-1">
					<Text className="text-indigo-200 font-black text-[10px] tracking-widest uppercase mb-1">Nouveau</Text>
					<Text className="text-xl font-black text-white">Apprendre 5 Radicaux</Text>
				</View>
				<View className="w-12 h-12 bg-white/10 rounded-2xl items-center justify-center">
					<Text className="text-xl">✨</Text>
				</View>
			</Pressable>

			{strokeCounts.map(count => {
				const isExpanded = expandedSections[count];
				return (
					<View key={count} className="mb-4">
						<Pressable 
							onPress={() => toggleSection(count)}
							className="flex-row items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-900 mb-2 active:bg-slate-900 transition-all"
						>
							<View className="bg-indigo-600 px-3 py-1 rounded-lg mr-4">
								<Text className="text-white font-black text-sm">{count}</Text>
							</View>
							<Text className="text-slate-300 font-black text-xs tracking-widest uppercase flex-1">Traits</Text>
							<Text className="text-slate-600 text-xs font-black mr-2">{grouped[count].length} RADICAUX</Text>
							<Text className="text-indigo-500 font-black text-lg">{isExpanded ? '−' : '+'}</Text>
						</Pressable>

						{isExpanded && (
							<View className="flex-row flex-wrap gap-4 p-2">
								{grouped[count].map(rad => (
									<Pressable 
										key={rad.id}
										className="w-[21%] aspect-square bg-slate-900 rounded-[1.5rem] border border-slate-800 items-center justify-center p-2 shadow-sm active:scale-95 active:bg-slate-800 transition-all"
									>
										<Text className="text-2xl text-white font-bold mb-1">{rad.literal}</Text>
										<Text className="text-[7px] text-slate-500 font-black text-center uppercase tracking-tighter" numberOfLines={1}>
											{parseMeaning(rad.meanings_fr || rad.meanings_en)}
										</Text>
									</Pressable>
								))}
							</View>
						)}
					</View>
				);
			})}
			
			<View className="h-20" />
		</ScrollView>
	);
}
