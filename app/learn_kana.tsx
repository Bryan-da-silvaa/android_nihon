import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDb } from '../services/db/client';
import { syncReviews, QuizItem } from '../services/srs/engine';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

type Step = 'LOADING' | 'INTRO' | 'QUIZ' | 'SUMMARY';

export default function LearnKanaScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const params = useLocalSearchParams();
	const type = (params.type as 'hiragana' | 'katakana') || 'hiragana';

	const [step, setStep] = useState<Step>('LOADING');
	const [kanas, setKanas] = useState<any[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
	const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
	const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

	const playSound = (text: string) => {
		Speech.speak(text, { language: 'ja-JP', rate: 0.85 });
	};

	useEffect(() => {
		async function load() {
			const db = await getDb();
			const json = type === 'hiragana' 
				? require('../constants/hiragana.json') 
				: require('../constants/katakana.json');

			const stats = await db.getAllAsync(`SELECT kana FROM kana_stats WHERE attempts > 0`) as any[];
			const learnedSet = new Set(stats.map(s => s.kana));

			const toLearn = json.filter((k: any) => !learnedSet.has(k.kana)).slice(0, 5);

			if (toLearn.length === 0) {
				router.back();
				return;
			}
			setKanas(toLearn);
			setStep('INTRO');
		}
		load();
	}, [type]);

	const startQuiz = () => {
		const items: QuizItem[] = kanas.map(k => {
			const distractors = kanas
				.filter(other => other.kana !== k.kana)
				.map(other => other.romaji)
				.slice(0, 3);
			
			return {
				id: `learn_kana_${k.kana}`,
				dbId: 0,
				sourceTable: 'kana_stats',
				questionType: 'kana_to_romaji',
				prompt: k.kana,
				answer: k.romaji,
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

		if (quizItems[currentIndex]) {
			playSound(quizItems[currentIndex].prompt);
		}

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
					INSERT INTO kana_stats (user_id, kana, attempts, correct, last_seen, srs_next_review)
					VALUES (1, ?, 0, 0, ?, ?)
					ON CONFLICT(user_id, kana) DO UPDATE SET last_seen = ?
				`, [item.prompt, now, now, now]);
			}
		});

		const rows = await db.getAllAsync(`SELECT id, kana FROM kana_stats WHERE kana IN (${finalItems.map(i => `'${i.prompt}'`).join(',')})`) as any[];
		const itemsWithCorrectIds = finalItems.map(item => {
			const row = rows.find(r => r.kana === item.prompt);
			return { ...item, dbId: row.id };
		});

		await syncReviews(itemsWithCorrectIds);
		setStep('SUMMARY');
	};

	if (step === 'LOADING') {
		return (
			<View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.hexBg }}>
				<Text className="font-black tracking-widest animate-pulse uppercase" style={{ color: colors.hexAccent }}>Initialisation...</Text>
			</View>
		);
	}

	if (step === 'INTRO') {
		const current = kanas[currentIndex];
		return (
			<View className="flex-1 p-6 justify-between" style={{ backgroundColor: colors.hexBg }}>
				<View className="pt-10">
					<Text className="font-black text-xs tracking-[0.3em] text-center mb-4 uppercase" style={{ color: colors.hexSubtext }}>
						Apprentissage {type}
					</Text>
					<View className="flex-row justify-center gap-2">
						{kanas.map((_, i) => (
							<View 
								key={i} 
								className="h-1.5 rounded-full" 
								style={{ 
									width: i <= currentIndex ? 32 : 16, 
									backgroundColor: i <= currentIndex ? colors.hexAccent : colors.hexBgSecondary 
								}} 
							/>
						))}
					</View>
				</View>

				<View className="items-center">
					<View 
						className="w-40 h-40 rounded-[2.5rem] border-2 items-center justify-center mb-6 shadow-2xl relative"
						style={{ backgroundColor: colors.hexCard, borderColor: colors.hexAccent + '33' }}
					>
						<Text className="text-7xl font-bold" style={{ color: colors.hexText }}>{current.kana}</Text>
						<Pressable 
							onPress={() => playSound(current.kana)}
							className="absolute top-2 right-2 p-1 active:scale-75"
						>
							<Ionicons name="volume-medium" size={24} color={colors.hexAccent} />
						</Pressable>
					</View>
					<Text className="text-5xl font-black mb-2 text-center uppercase tracking-widest" style={{ color: colors.hexText }}>
						{current.romaji}
					</Text>
				</View>

				<View className="mb-12">
					<Pressable 
						onPress={() => currentIndex < kanas.length - 1 ? setCurrentIndex(currentIndex + 1) : startQuiz()}
						className="py-6 rounded-[2rem] items-center shadow-xl active:scale-95 transition-all"
						style={{ backgroundColor: colors.hexAccent }}
					>
						<Text className="text-white font-black text-lg tracking-widest uppercase">
							{currentIndex < kanas.length - 1 ? 'Suivant' : 'Commencer le test'}
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
					<Text className="font-black text-center text-xl" style={{ color: colors.hexText }}>Comment se lit ce caractère ?</Text>
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
					<Text className="text-5xl">🎉</Text>
				</View>
				<Text className="text-4xl font-black text-center mb-4" style={{ color: colors.hexText }}>Bravo !</Text>
				<Text className="text-center text-lg mb-12 leading-relaxed" style={{ color: colors.hexSubtext }}>
					Tu as appris <Text className="font-black" style={{ color: colors.hexAccent }}>5 nouveaux {type}s</Text>. Ils sont maintenant dans tes révisions quotidiennes !
				</Text>
				
				<Pressable 
					onPress={() => router.replace('/')}
					className="w-full py-6 rounded-[2rem] items-center shadow-xl active:scale-95 transition-all"
					style={{ backgroundColor: colors.hexAccent }}
				>
					<Text className="text-white font-black text-lg tracking-widest uppercase">Retour à l&apos;accueil</Text>
				</Pressable>
			</View>
		);
	}

	return null;
}
