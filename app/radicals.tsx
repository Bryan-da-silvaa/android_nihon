import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { getRadicals, Radical } from '../services/db/queries';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function RadicalsScreen() {
	const router = useRouter();
	const { colors } = useTheme();
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
		1: true,
	});

	if (isLoading) {
		return (
			<View className={`flex-1 items-center justify-center`} style={{ backgroundColor: colors.hexBg }}>
				<Text className="font-bold tracking-widest animate-pulse" style={{ color: colors.hexAccent }}>Chargement...</Text>
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
		<ScrollView 
			className="flex-1" 
			style={{ backgroundColor: colors.hexBg }}
			contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10 }}
			showsVerticalScrollIndicator={false}
		>
			<View className="flex-row items-center mb-10">
				<Pressable 
					onPress={() => router.back()} 
					className="w-12 h-12 rounded-2xl border items-center justify-center mr-4 active:scale-90"
					style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
				>
					<Ionicons name="arrow-back" size={20} color={colors.hexAccent} />
				</Pressable>
				<View>
					<Text className="font-black text-[10px] tracking-[0.2em] mb-1 uppercase" style={{ color: colors.hexSubtext }}>Dictionnaire</Text>
					<Text className="text-3xl font-black" style={{ color: colors.hexText }}>Les Radicaux</Text>
				</View>
			</View>

			{/* Bouton Apprendre */}
			<Pressable 
				onPress={() => router.push('/learn_radicals')}
				className="rounded-[2rem] p-6 mb-10 flex-row items-center justify-between shadow-xl active:scale-95"
				style={{ backgroundColor: colors.hexAccent }}
			>
				<View className="flex-1">
					<Text className="text-white opacity-80 font-black text-[10px] tracking-widest uppercase mb-1">Nouveau</Text>
					<Text className="text-xl font-black text-white">Apprendre 5 Radicaux</Text>
				</View>
				<View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
					<Text className="text-xl">✨</Text>
				</View>
			</Pressable>

			{strokeCounts.map(count => {
				const isExpanded = expandedSections[count];
				return (
					<View key={count} className="mb-4">
						<Pressable 
							onPress={() => toggleSection(count)}
							className="flex-row items-center p-4 rounded-2xl border mb-2 active:opacity-70"
							style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
						>
							<View className="px-3 py-1 rounded-lg mr-4" style={{ backgroundColor: colors.hexAccent }}>
								<Text className="text-white font-black text-sm">{count}</Text>
							</View>
							<Text className="font-black text-xs tracking-widest uppercase flex-1" style={{ color: colors.hexText }}>Traits</Text>
							<Text className="text-xs font-black mr-2 uppercase" style={{ color: colors.hexSubtext }}>{grouped[count].length} RADICAUX</Text>
							<Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.hexAccent} />
						</Pressable>

						{isExpanded && (
							<View className="flex-row flex-wrap gap-4 p-2">
								{grouped[count].map(rad => (
									<Pressable 
										key={rad.id}
										className="w-[21%] aspect-square rounded-[1.5rem] border items-center justify-center p-2 shadow-sm active:opacity-70"
										style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
									>
										<Text className="text-2xl font-bold mb-1" style={{ color: colors.hexText }}>{rad.literal}</Text>
										<Text className="text-[7px] font-black text-center uppercase tracking-tighter" style={{ color: colors.hexSubtext }} numberOfLines={1}>
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
