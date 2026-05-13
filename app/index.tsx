import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { getDashboardStats, DashboardStats } from '../services/db/queries';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [reviewModal, setReviewModal] = useState<{
		visible: boolean;
		title: string;
		type: string;
		jlpt?: number;
		deckId?: number;
		hasDue: boolean;
	}>({ visible: false, title: '', type: '', hasDue: false });

	useFocusEffect(
		useCallback(() => {
			async function loadStats() {
				const data = await getDashboardStats();
				setStats(data);
			}
			loadStats();
		}, [])
	);

	const renderSchedule = (title: string, reviews: number, learned: number, total: number, defaultColor: string, type: 'kanji' | 'hiragana' | 'katakana' | 'custom', jlpt?: number, deckId?: number, newCount?: number) => {
		const progress = total > 0 ? (learned / total) * 100 : 0;
		const hasReviews = reviews > 0;
		const canLearn = type === 'custom' ? (newCount || 0) > 0 : true;

		// Use theme accent colors
		const accentBg = colors.accentBg;

		return (
			<View 
				className={`rounded-[2.5rem] p-6 mb-4 border shadow-sm`}
				style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
			>
				<View className="flex-row items-center justify-between mb-6">
					<View>
						<Text className={`text-2xl font-black mb-1`} style={{ color: colors.hexText }}>{title}</Text>
						<View className="flex-row items-center">
							<View className={`w-24 h-1.5 rounded-full mr-3 overflow-hidden`} style={{ backgroundColor: colors.hexBgSecondary }}>
								<View 
									className="h-full rounded-full" 
									style={{ 
										width: `${progress}%`, 
										backgroundColor: hasReviews ? colors.hexAccent : colors.hexSubtext + '40' 
									}} 
								/>
							</View>
							<Text className={`text-[10px] font-black tracking-widest uppercase`} style={{ color: colors.hexSubtext }}>
								{learned} / {total}
							</Text>
						</View>
					</View>
					<View 
						className={`w-14 h-14 rounded-full items-center justify-center border-2`}
						style={{ borderColor: hasReviews ? colors.hexAccent + '80' : colors.hexBorder }}
					>
						<Text className={`font-black text-xs`} style={{ color: hasReviews ? colors.hexAccent : colors.hexSubtext }}>
							{Math.round(progress)}%
						</Text>
					</View>
				</View>

				<View className="flex-row gap-3">
					<Pressable
						onPress={() => {
							if (learned > 0) {
								setReviewModal({
									visible: true,
									title,
									type,
									jlpt,
									deckId,
									hasDue: reviews > 0
								});
							}
						}}
						className="flex-[1.5] py-4 rounded-[1.5rem] items-center justify-center shadow-lg active:scale-95 transition-all"
						style={{ backgroundColor: learned > 0 ? colors.hexAccent : colors.hexBgSecondary, opacity: learned > 0 ? 1 : 0.5 }}
					>
						<Text className="text-white font-black tracking-widest text-[10px]">
							RÉVISER {hasReviews ? `(${reviews})` : ''}
						</Text>
					</Pressable>

					<Pressable
						onPress={() => {
							if (type === 'kanji') {
								router.push({ pathname: '/learn_kanji', params: { jlpt } });
							} else if (type === 'custom') {
								router.push({ pathname: '/learn_custom', params: { deckId: deckId?.toString() } });
							} else {
								router.push({ pathname: '/learn_kana', params: { type } });
							}
						}}
						className="flex-1 py-4 rounded-[1.5rem] border items-center justify-center active:scale-95 transition-all"
						style={{ 
							backgroundColor: colors.hexBgSecondary, 
							borderColor: colors.hexBorder,
							opacity: (!canLearn && type === 'custom') ? 0.3 : 1
						}}
						disabled={!canLearn && type === 'custom'}
					>
						<Text className={`font-black tracking-widest text-[10px]`} style={{ color: colors.hexSubtext }}>
							{type === 'custom' ? `APPRENDRE ${newCount ? `(${newCount})` : ''}` : 'APPRENDRE'}
						</Text>
					</Pressable>
				</View>
			</View>
		);
	};

	return (
		<View className="flex-1" style={{ backgroundColor: colors.hexBg }}>
			<ScrollView 
				className="flex-1 px-6" 
				contentContainerStyle={{ paddingTop: 20 }}
				showsVerticalScrollIndicator={false}
			>
				<View className="flex-row items-center justify-between mb-8">
					<View>
						<Text className={`font-black text-xs tracking-[0.2em] mb-1 uppercase`} style={{ color: colors.hexSubtext }}>Dashboard</Text>
						<Text className={`text-3xl font-black`} style={{ color: colors.hexText }}>Vos Programmes</Text>
					</View>
					<View 
						className={`w-12 h-12 rounded-2xl border items-center justify-center`}
						style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
					>
						<Text className="text-xl">📊</Text>
					</View>
				</View>

				{/* Daily Goal Progress */}
				{stats && (
					<View 
						className={`rounded-[2.5rem] p-6 mb-8 border shadow-2xl relative overflow-hidden`}
						style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
					>
						<View className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full`} style={{ backgroundColor: colors.hexAccent, opacity: 0.05 }} />
						<View className="flex-row justify-between items-end mb-4">
							<View>
								<Text className={`font-black text-[10px] tracking-[0.2em] mb-1`} style={{ color: colors.hexSubtext }}>OBJECTIF QUOTIDIEN</Text>
								<View className="flex-row items-baseline gap-1">
									<Text className={`text-3xl font-black`} style={{ color: colors.hexText }}>{stats.dailyProgress}</Text>
									<Text className={`font-bold text-lg`} style={{ color: colors.hexSubtext }}>/ {stats.dailyGoal}</Text>
								</View>
							</View>
							<View 
								className={`px-3 py-1.5 rounded-full border`}
								style={{ backgroundColor: colors.hexAccent + '1a', borderColor: colors.hexAccent + '33' }}
							>
								<Text className={`font-black text-[10px] tracking-widest`} style={{ color: colors.hexAccent }}>
									{Math.round((stats.dailyProgress / stats.dailyGoal) * 100)}%
								</Text>
							</View>
						</View>
						<View className={`w-full h-3 rounded-full overflow-hidden`} style={{ backgroundColor: colors.hexBgSecondary }}>
							<View 
								className="h-full rounded-full" 
								style={{ 
									width: `${Math.min(100, stats.dailyGoal > 0 ? (stats.dailyProgress / stats.dailyGoal) * 100 : 0)}%`,
									backgroundColor: colors.hexAccent 
								}} 
							/>
						</View>
					</View>
				)}

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

				{/* Custom Decks */}
				{stats?.customDecks.map(deck => (
					<View key={deck.id}>
						{renderSchedule(
							deck.name,
							deck.due,
							deck.learned,
							deck.total,
							"bg-violet-600",
							"custom",
							undefined,
							deck.id,
							deck.newCount
						)}
					</View>
				))}

				<View className="h-20" />
			</ScrollView>

			{/* Review Choice Modal */}
			<Modal
				visible={reviewModal.visible}
				transparent
				animationType="fade"
				onRequestClose={() => setReviewModal({ ...reviewModal, visible: false })}
			>
				<View className="flex-1 bg-black/80 items-center justify-center p-6">
					<View 
						className={`w-full rounded-[3rem] p-8 border shadow-2xl`}
						style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
					>
						<View className="flex-row items-center justify-between mb-8">
							<Text className={`text-2xl font-black`} style={{ color: colors.hexText }}>{reviewModal.title}</Text>
							<Pressable onPress={() => setReviewModal({ ...reviewModal, visible: false })} className="p-2">
								<Ionicons name="close" size={24} color={colors.hexSubtext} />
							</Pressable>
						</View>

						<Text className={`font-bold mb-8 leading-relaxed`} style={{ color: colors.hexSubtext }}>
							Quelle type de révision souhaites-tu lancer ?
						</Text>

						<View className="gap-4">
							<Pressable
								onPress={() => {
									setReviewModal({ ...reviewModal, visible: false });
									router.push({ 
										pathname: '/quiz', 
										params: { 
											type: reviewModal.type, 
											jlpt: reviewModal.jlpt, 
											deckId: reviewModal.deckId?.toString() 
										} 
									});
								}}
								className="py-6 rounded-[2rem] flex-row items-center justify-center gap-3 shadow-lg"
								style={{ 
									backgroundColor: reviewModal.hasDue ? colors.hexAccent : colors.hexBgSecondary, 
									opacity: reviewModal.hasDue ? 1 : 0.5 
								}}
								disabled={!reviewModal.hasDue}
							>
								<Ionicons name="calendar-outline" size={20} color="white" />
								<Text className="text-white font-black tracking-widest text-xs uppercase">
									Révision SRS (Prévue)
								</Text>
							</Pressable>

							<Pressable
								onPress={() => {
									setReviewModal({ ...reviewModal, visible: false });
									router.push({ 
										pathname: '/quiz', 
										params: { 
											type: reviewModal.type, 
											jlpt: reviewModal.jlpt, 
											deckId: reviewModal.deckId?.toString(),
											mode: 'cram' 
										} 
									});
								}}
								className="py-6 rounded-[2rem] border flex-row items-center justify-center gap-3 active:opacity-80"
								style={{ backgroundColor: colors.hexBg, borderColor: colors.hexBorder }}
							>
								<Ionicons name="flash-outline" size={20} color={colors.hexAccent} />
								<Text className={`font-black tracking-widest text-xs uppercase`} style={{ color: colors.hexText }}>
									Révision Libre (Cram)
								</Text>
							</Pressable>
						</View>

						<Text className={`text-[10px] text-center mt-8 font-bold uppercase tracking-widest`} style={{ color: colors.hexSubtext }}>
							La révision libre n'impacte pas ton planning SRS
						</Text>
					</View>
				</View>
			</Modal>
		</View>
	);
}
