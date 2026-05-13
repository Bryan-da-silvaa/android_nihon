import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDb } from '../services/db/client';
import { syncReviews, QuizItem } from '../services/srs/engine';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

type Step = 'LOADING' | 'INTRO' | 'QUIZ' | 'SUMMARY';

export default function LearnKanjiScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const params = useLocalSearchParams();
	const jlpt = params.jlpt ? parseInt(params.jlpt as string) : 5;

	const [step, setStep] = useState<Step>('LOADING');
	const [kanjis, setKanjis] = useState<any[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
	const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
	const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

	const playSound = (text: string) => {
		Speech.speak(text, { language: 'ja-JP', rate: 0.85 });
	};

	const parseJsonArray = (input: string) => {
		if (!input) return '-';
		try {
			if (input.startsWith('[') && input.endsWith(']')) {
				const parsed = JSON.parse(input);
				return Array.isArray(parsed) ? parsed.join(', ') : input;
			}
			return input;
		} catch (e) {
			return input;
		}
	};

	useEffect(() => {
		async function load() {
			const db = await getDb();
			const data = await db.getAllAsync(`
				SELECT kd.* FROM kanji_data kd
				LEFT JOIN user_kanji_stats uks ON kd.id = uks.kanji_id
				WHERE kd.jlpt = ? AND (uks.id IS NULL)
				ORDER BY kd.frequency ASC, kd.id ASC
				LIMIT 5
			`, [jlpt]) as any[];

			if (data.length === 0) {
				router.back();
				return;
			}
			setKanjis(data);
			setStep('INTRO');
		}
		load();
	}, [jlpt]);

	const startQuiz = () => {
		const items: QuizItem[] = kanjis.map(k => {
			const meaning = parseJsonArray(k.meanings_fr || k.meanings_en);
			const distractors = kanjis
				.filter(other => other.id !== k.id)
				.map(other => parseJsonArray(other.meanings_fr || other.meanings_en))
				.slice(0, 3);
			
			return {
				id: `learn_k_${k.id}`,
				dbId: k.id,
				sourceTable: 'user_kanji_stats',
				questionType: 'kanji_to_meaning',
				prompt: k.literal,
				answer: meaning,
				distractors: distractors.sort(() => Math.random() - 0.5),
				repetition: 0,
				intervalDays: 0,
				easeFactor: 2.5,
				failCount: 0
			};
		});
		setQuizItems(items.sort(() => Math.random() - 0.5));
		setCurrentIndex(0);
		setStep('QUIZ');
	};

	const handleAnswer = (choice: string) => {
		if (selectedAnswer) return;
		setSelectedAnswer(choice);
		const correct = choice === quizItems[currentIndex].answer;
		setIsCorrect(correct);

		setTimeout(() => {
			const nextIndex = currentIndex + 1;
			if (nextIndex < quizItems.length) {
				setQuizItems(prev => {
					const updated = [...prev];
					updated[currentIndex].isCorrect = correct;
					return updated;
				});
				setCurrentIndex(nextIndex);
				setSelectedAnswer(null);
				setIsCorrect(null);
			} else {
				finishLearning([...quizItems.slice(0, -1), { ...quizItems[currentIndex], isCorrect: correct }]);
			}
		}, 1200);
	};

	const finishLearning = async (finalItems: QuizItem[]) => {
		setStep('LOADING');
		const db = await getDb();
		
		await db.withTransactionAsync(async () => {
			const now = new Date().toISOString();
			for (const item of finalItems) {
				await db.runAsync(`
					INSERT INTO user_kanji_stats (user_id, kanji_id, level, next_review, repetition, interval_days, ease_factor)
					VALUES (1, ?, 1, ?, 0, 0, 2.5)
				`, [item.dbId, now]);
			}
		});

		const rows = await db.getAllAsync(`SELECT id, kanji_id FROM user_kanji_stats WHERE kanji_id IN (${finalItems.map(i => i.dbId).join(',')})`) as any[];
		const itemsWithCorrectIds = finalItems.map(item => {
			const row = rows.find(r => r.kanji_id === item.dbId);
			return { ...item, dbId: row.id };
		});

		await syncReviews(itemsWithCorrectIds);
		setStep('SUMMARY');
	};

	const [traceRepetitions, setTraceRepetitions] = useState(0);
	const [REQUIRED_TRACES, setRequiredTraces] = useState(10);
	const [brushSkin, setBrushSkin] = useState('classic');

	useEffect(() => {
		async function fetchSettings() {
			const { getUserProfile } = require('../services/db/queries');
			const profile = await getUserProfile();
			if (profile?.kanji_trace_count) {
				setRequiredTraces(profile.kanji_trace_count);
			}
			if (profile?.brush_skin) {
				setBrushSkin(profile.brush_skin);
			}
		}
		fetchSettings();
	}, []);

	const [sessionScores, setSessionScores] = useState<number[]>([]);

	const avgScore = sessionScores.length > 0 
		? Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length) 
		: 0;

	const onTraceComplete = (strokes: number, score?: number) => {
		if (score !== undefined) {
			setSessionScores(prev => [...prev, score]);
		}
		const newCount = traceRepetitions + 1;
		setTraceRepetitions(newCount);
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		
		if (newCount === REQUIRED_TRACES) {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		}
	};

	const goToNext = () => {
		setTraceRepetitions(0);
		setSessionScores([]);
		if (currentIndex < kanjis.length - 1) {
			setCurrentIndex(currentIndex + 1);
		} else {
			startQuiz();
		}
	};

	if (step === 'LOADING') {
		return (
			<View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.hexBg }}>
				<Text className="font-black tracking-widest animate-pulse uppercase" style={{ color: colors.hexAccent }}>Initialisation...</Text>
			</View>
		);
	}

	if (step === 'INTRO') {
		const current = kanjis[currentIndex];
		const { KanjiCanvas } = require('../components/KanjiCanvas');

		return (
			<View className="flex-1 p-6 justify-between" style={{ backgroundColor: colors.hexBg }}>
				<View className="pt-10">
					<Text className="font-black text-xs tracking-[0.3em] text-center mb-2 uppercase" style={{ color: colors.hexSubtext }}>Apprentissage N{jlpt}</Text>
					<View className="flex-row justify-center gap-2 mb-4">
						{kanjis.map((_, i) => (
							<View 
								key={i} 
								className="h-1.5 rounded-full" 
								style={{ 
									width: i === currentIndex ? 32 : 12, 
									backgroundColor: i <= currentIndex ? colors.hexAccent : colors.hexBgSecondary 
								}} 
							/>
						))}
					</View>
				</View>

				<View className="items-center flex-1 justify-center">
					{/* Box de traduction avec réduction auto de la police */}
					<View className="h-20 w-full items-center justify-center mb-4 px-4">
						<Text 
							className="font-black text-center uppercase tracking-tight" 
							style={{ color: colors.hexText, fontSize: 24 }}
							numberOfLines={2}
							adjustsFontSizeToFit
						>
							{parseJsonArray(current.meanings_fr || current.meanings_en)}
						</Text>
						<Text style={{ color: colors.hexAccent, fontWeight: '900', fontSize: 12, marginTop: 4 }} className="uppercase tracking-[0.2em]">
							Tracé {traceRepetitions} / {REQUIRED_TRACES} 
							{traceRepetitions >= REQUIRED_TRACES && sessionScores.length > 0 && ` • Précision : ${avgScore}%`}
						</Text>
					</View>

					<KanjiCanvas 
						targetKanji={current.literal} 
						colors={colors}
						onComplete={onTraceComplete}
						brushSkin={brushSkin}
					/>
				</View>

				{/* Zone basse : Tags + Bouton */}
				<View className="mb-8 px-6 gap-4">
					<View className="flex-row gap-2 flex-wrap justify-center">
						<View className="px-3 py-1.5 rounded-xl border" style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}>
							<Text className="font-bold text-[10px]" style={{ color: colors.hexAccent }}>On: {parseJsonArray(current.readings_on)}</Text>
						</View>
						<View className="px-3 py-1.5 rounded-xl border" style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}>
							<Text className="font-bold text-[10px]" style={{ color: '#10b981' }}>Kun: {parseJsonArray(current.readings_kun)}</Text>
						</View>
					</View>

					<Pressable 
						onPress={goToNext}
						disabled={traceRepetitions < REQUIRED_TRACES}
						className="py-5 rounded-[2rem] items-center shadow-xl active:scale-95 transition-all"
						style={{ 
							backgroundColor: traceRepetitions >= REQUIRED_TRACES ? colors.hexAccent : colors.hexBgSecondary,
							opacity: traceRepetitions >= REQUIRED_TRACES ? 1 : 0.5 
						}}
					>
						<Text style={{ color: traceRepetitions >= REQUIRED_TRACES ? '#fff' : colors.hexSubtext }} className="font-black text-lg tracking-widest uppercase">
							{currentIndex < kanjis.length - 1 ? 'Suivant' : 'Commencer le test'}
						</Text>
					</Pressable>
				</View>
			</View>
		);
	}

	if (step === 'QUIZ') {
		const current = quizItems[currentIndex];
		const choices = [current.answer, ...current.distractors].sort();

		return (
			<View className="flex-1 p-6 justify-between" style={{ backgroundColor: colors.hexBg }}>
				<View className="pt-10">
					<Text className="font-black text-xs tracking-[0.3em] text-center mb-2 uppercase" style={{ color: colors.hexSubtext }}>Vérification</Text>
					<Text className="font-black text-center text-xl" style={{ color: colors.hexText }}>Quel est le sens de ce kanji ?</Text>
				</View>

				<View className="items-center">
					<View 
						className="w-36 h-36 rounded-[2rem] border items-center justify-center mb-8"
						style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
					>
						<Text className="text-7xl font-bold" style={{ color: colors.hexText }}>{current.prompt}</Text>
					</View>

					<View className="w-full gap-3">
						{choices.map((choice, i) => {
							const isThisSelected = selectedAnswer === choice;
							const isThisCorrect = choice === current.answer;
							
							let bgColor = colors.hexCard;
							let borderColor = colors.hexBorder;
							let textColor = colors.hexText;

							if (selectedAnswer) {
								if (isThisCorrect) {
									bgColor = '#059669'; // Emerald-600
									borderColor = '#10b981';
									textColor = '#ffffff';
								} else if (isThisSelected) {
									bgColor = '#dc2626'; // Red-600
									borderColor = '#f87171';
									textColor = '#ffffff';
								}
							}

							return (
								<Pressable
									key={i}
									onPress={() => handleAnswer(choice)}
									className="py-5 px-6 rounded-2xl border active:scale-98 transition-all"
									style={{ backgroundColor: bgColor, borderColor: borderColor }}
								>
									<Text className="font-black text-center uppercase tracking-widest" style={{ color: textColor }}>{choice}</Text>
								</Pressable>
							);
						})}
					</View>
				</View>
				<View className="h-10" />
			</View>
		);
	}

	if (step === 'SUMMARY') {
		return (
			<View className="flex-1 p-8 items-center justify-center" style={{ backgroundColor: colors.hexBg }}>
				<View 
					className="w-24 h-24 rounded-full items-center justify-center mb-8 shadow-2xl"
					style={{ backgroundColor: colors.hexAccent }}
				>
					<Text className="text-5xl">🎯</Text>
				</View>
				<Text className="text-4xl font-black text-center mb-4" style={{ color: colors.hexText }}>Nouveaux Kanjis !</Text>
				<Text className="text-center text-lg mb-12 leading-relaxed" style={{ color: colors.hexSubtext }}>
					Félicitations ! Tu as appris <Text className="font-black" style={{ color: colors.hexAccent }}>5 kanjis</Text> du niveau JLPT N{jlpt}.
				</Text>
				
				<Pressable 
					onPress={() => router.replace('/')}
					className="w-full py-6 rounded-[2rem] items-center shadow-xl active:scale-95 transition-all"
					style={{ backgroundColor: colors.hexAccent }}
				>
					<Text className="text-white font-black text-lg tracking-widest uppercase">Continuer</Text>
				</Pressable>
			</View>
		);
	}

	return null;
}
