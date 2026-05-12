import { View, Text, ScrollView, Pressable } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { getDashboardStats, DashboardStats } from '../services/db/queries';

export default function HomeScreen() {
	const router = useRouter();
	const [stats, setStats] = useState<DashboardStats | null>(null);

	useFocusEffect(
		useCallback(() => {
			async function loadStats() {
				const data = await getDashboardStats();
				setStats(data);
			}
			loadStats();
		}, [])
	);

	const renderSchedule = (title: string, reviews: number, learned: number, total: number, color: string, type: 'kanji' | 'hiragana' | 'katakana', jlpt?: number) => {
		const progress = total > 0 ? (learned / total) * 100 : 0;
		const hasReviews = reviews > 0;

		return (
			<View className="bg-slate-900 rounded-[2.5rem] p-6 mb-4 border border-slate-800 shadow-sm">
				<View className="flex-row items-center justify-between mb-6">
					<View>
						<Text className="text-white text-2xl font-black mb-1">{title}</Text>
						<View className="flex-row items-center">
							<View className="w-24 h-1.5 bg-slate-800 rounded-full mr-3 overflow-hidden">
								<View className={`h-full ${hasReviews ? color : 'bg-slate-700'} rounded-full`} style={{ width: `${progress}%` }} />
							</View>
							<Text className="text-slate-500 text-[10px] font-black tracking-widest uppercase">
								{learned} / {total}
							</Text>
						</View>
					</View>
					<View className={`w-14 h-14 rounded-full items-center justify-center border-2 ${hasReviews ? 'border-indigo-500/30' : 'border-slate-800'}`}>
						<Text className={`font-black text-xs ${hasReviews ? 'text-indigo-400' : 'text-slate-600'}`}>
							{Math.round(progress)}%
						</Text>
					</View>
				</View>

				<View className="flex-row gap-3">
					<Pressable
						onPress={() => hasReviews && router.push({ pathname: '/quiz', params: { type, jlpt } })}
						className={`flex-[1.5] py-4 rounded-[1.5rem] items-center justify-center shadow-lg active:scale-95 transition-all ${hasReviews ? color : 'bg-slate-800 opacity-50'}`}
					>
						<Text className="text-white font-black tracking-widest text-[10px]">
							RÉVISER {hasReviews ? `(${reviews})` : ''}
						</Text>
					</Pressable>

					<Pressable
						onPress={() => {
							if (type === 'kanji') {
								router.push({ pathname: '/learn_kanji', params: { jlpt } });
							} else {
								// TODO: learn_kana
							}
						}}
						className="flex-1 py-4 rounded-[1.5rem] bg-slate-800 border border-slate-700 items-center justify-center active:scale-95 transition-all"
					>
						<Text className="text-slate-400 font-black tracking-widest text-[10px]">
							APPRENDRE
						</Text>
					</Pressable>
				</View>
			</View>
		);
	};

	return (
		<ScrollView className="flex-1 bg-slate-950 px-6 pt-4" showsVerticalScrollIndicator={false}>
			<View className="flex-row items-center justify-between mb-8">
				<View>
					<Text className="text-slate-500 font-black text-xs tracking-[0.2em] mb-1">DASHBOARD</Text>
					<Text className="text-3xl font-black text-white">Vos Programmes</Text>
				</View>
				<View className="w-12 h-12 bg-slate-900 rounded-2xl border border-slate-800 items-center justify-center">
					<Text className="text-xl">📊</Text>
				</View>
			</View>

			{/* Schedules Section */}
			{renderSchedule(
				"Kanjis JLPT N5",
				stats?.dueKanjis || 0,
				stats?.jlptN5.learned || 0,
				stats?.jlptN5.total || 0,
				"bg-indigo-600",
				"kanji",
				5
			)}

			{renderSchedule(
				"Hiragana",
				stats?.dueHiragana || 0,
				stats?.hiragana.learned || 0,
				stats?.hiragana.total || 71,
				"bg-emerald-600",
				"hiragana"
			)}

			{renderSchedule(
				"Katakana",
				stats?.dueKatakana || 0,
				stats?.katakana.learned || 0,
				stats?.katakana.total || 71,
				"bg-sky-600",
				"katakana"
			)}

			{/* Extra Actions */}
			<View className="flex-row gap-4 mt-4 mb-12">
				<Pressable className="flex-1 bg-slate-900 p-6 rounded-[2rem] border border-slate-800 items-center">
					<Text className="text-2xl mb-2">🏔️</Text>
					<Text className="text-white font-black text-xs tracking-widest uppercase">JLPT N4</Text>
				</Pressable>
				<Pressable className="flex-1 bg-slate-900 p-6 rounded-[2rem] border border-slate-800 items-center">
					<Text className="text-2xl mb-2">📚</Text>
					<Text className="text-white font-black text-xs tracking-widest uppercase">Dico</Text>
				</Pressable>
			</View>
		</ScrollView>
	);
}

