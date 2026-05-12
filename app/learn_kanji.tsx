import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDb } from '../services/db/client';
import { calculateSM2, syncReviews, QuizItem } from '../services/srs/engine';

const { width } = Dimensions.get('window');

type Step = 'LOADING' | 'INTRO' | 'QUIZ' | 'SUMMARY';

export default function LearnKanjiScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const jlpt = params.jlpt ? parseInt(params.jlpt as string) : 5;

	const [step, setStep] = useState<Step>('LOADING');
	const [kanjis, setKanjis] = useState<any[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
	const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
	const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

	const fadeAnim = useState(new Animated.Value(1))[0];

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
				easeFactor: 2.5
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
			const stmt = await db.prepareAsync(`
				INSERT INTO user_kanji_stats (user_id, kanji_id, level, next_review, repetition, interval_days, ease_factor)
				VALUES (1, ?, 1, ?, 0, 0, 2.5)
			`);
			const now = new Date().toISOString();
			for (const item of finalItems) {
				await stmt.executeAsync([item.dbId, now]);
			}
			await stmt.finalizeAsync();
		});

		const rows = await db.getAllAsync(`SELECT id, kanji_id FROM user_kanji_stats WHERE kanji_id IN (${finalItems.map(i => i.dbId).join(',')})`) as any[];
		const itemsWithCorrectIds = finalItems.map(item => {
			const row = rows.find(r => r.kanji_id === item.dbId);
			return { ...item, dbId: row.id };
		});

		await syncReviews(itemsWithCorrectIds);
		setStep('SUMMARY');
	};

	if (step === 'LOADING') {
		return (
			<View className="flex-1 bg-slate-950 items-center justify-center">
				<Text className="text-indigo-200 font-black tracking-widest animate-pulse uppercase">Initialisation...</Text>
			</View>
		);
	}

	if (step === 'INTRO') {
		const current = kanjis[currentIndex];
		return (
			<View className="flex-1 bg-slate-950 p-6 justify-between">
				<View className="pt-10">
					<Text className="text-slate-500 font-black text-xs tracking-[0.3em] text-center mb-4 uppercase">APPRENTISSAGE N{jlpt}</Text>
					<View className="flex-row justify-center gap-2">
						{kanjis.map((_, i) => (
							<View key={i} className={`h-1.5 rounded-full ${i <= currentIndex ? 'bg-indigo-500 w-8' : 'bg-slate-800 w-4'}`} />
						))}
					</View>
				</View>

				<View className="items-center">
					<View className="w-56 h-56 bg-slate-900 rounded-[3.5rem] border-2 border-indigo-500/20 items-center justify-center mb-8 shadow-2xl">
						<Text className="text-9xl text-white font-bold">{current.literal}</Text>
					</View>
					<Text className="text-3xl font-black text-white mb-2 text-center uppercase tracking-tight">
						{parseJsonArray(current.meanings_fr || current.meanings_en)}
					</Text>
					<View className="flex-row gap-4 mt-2 px-4 flex-wrap justify-center">
						<View className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
							<Text className="text-indigo-400 font-bold text-xs">On: {parseJsonArray(current.readings_on)}</Text>
						</View>
						<View className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
							<Text className="text-emerald-400 font-bold text-xs">Kun: {parseJsonArray(current.readings_kun)}</Text>
						</View>
					</View>
				</View>

				<View className="mb-12">
					<Pressable 
						onPress={() => currentIndex < kanjis.length - 1 ? setCurrentIndex(currentIndex + 1) : startQuiz()}
						className="bg-indigo-600 py-6 rounded-[2rem] items-center shadow-xl active:scale-95 transition-all"
					>
						<Text className="text-white font-black text-lg tracking-widest">
							{currentIndex < kanjis.length - 1 ? 'SUIVANT' : 'COMMENCER LE TEST'}
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
			<View className="flex-1 bg-slate-950 p-6 justify-between">
				<View className="pt-10">
					<Text className="text-slate-500 font-black text-xs tracking-[0.3em] text-center mb-2 uppercase">VÉRIFICATION</Text>
					<Text className="text-white font-black text-center text-xl">Quel est le sens de ce kanji ?</Text>
				</View>

				<View className="items-center">
					<View className="w-44 h-44 bg-slate-900 rounded-[2.5rem] border border-slate-800 items-center justify-center mb-10">
						<Text className="text-8xl text-white font-bold">{current.prompt}</Text>
					</View>

					<View className="w-full gap-3">
						{choices.map((choice, i) => {
							const isThisSelected = selectedAnswer === choice;
							const isThisCorrect = choice === current.answer;
							
							let bgColor = 'bg-slate-900';
							let borderColor = 'border-slate-800';
							if (selectedAnswer) {
								if (isThisCorrect) {
									bgColor = 'bg-emerald-600';
									borderColor = 'border-emerald-500';
								} else if (isThisSelected) {
									bgColor = 'bg-red-600';
									borderColor = 'border-red-500';
								}
							}

							return (
								<Pressable
									key={i}
									onPress={() => handleAnswer(choice)}
									className={`py-5 px-6 rounded-2xl border ${borderColor} ${bgColor} active:scale-98 transition-all`}
								>
									<Text className="text-white font-black text-center uppercase tracking-widest">{choice}</Text>
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
			<View className="flex-1 bg-slate-950 p-8 items-center justify-center">
				<View className="w-24 h-24 bg-indigo-500 rounded-full items-center justify-center mb-8 shadow-2xl">
					<Text className="text-5xl">🎯</Text>
				</View>
				<Text className="text-4xl font-black text-white text-center mb-4">Nouveaux Kanjis !</Text>
				<Text className="text-slate-400 text-center text-lg mb-12 leading-relaxed">
					Félicitations ! Tu as appris <Text className="text-indigo-400 font-black">5 kanjis</Text> du niveau JLPT N{jlpt}.
				</Text>
				
				<Pressable 
					onPress={() => router.replace('/')}
					className="w-full bg-indigo-600 py-6 rounded-[2rem] items-center shadow-xl active:scale-95 transition-all"
				>
					<Text className="text-white font-black text-lg tracking-widest">CONTINUER</Text>
				</Pressable>
			</View>
		);
	}

	return null;
}
