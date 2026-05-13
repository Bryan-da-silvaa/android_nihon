import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { getNewRadicals, Radical } from '../services/db/queries';
import { calculateSM2, syncReviews, QuizItem } from '../services/srs/engine';
import { getDb } from '../services/db/client';

const { width } = Dimensions.get('window');

type Step = 'LOADING' | 'INTRO' | 'QUIZ' | 'SUMMARY';

export default function LearnRadicalsScreen() {
	const router = useRouter();
	const [step, setStep] = useState<Step>('LOADING');
	const [radicals, setRadicals] = useState<Radical[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
	const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
	const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

	// Animation pour les transitions
	const fadeAnim = useState(new Animated.Value(1))[0];

	useEffect(() => {
		async function load() {
			const data = await getNewRadicals(5);
			if (data.length === 0) {
				router.back();
				return;
			}
			setRadicals(data);
			setStep('INTRO');
		}
		load();
	}, []);

	const parseMeaning = (meaning: string) => {
		if (!meaning) return '?';
		try {
			if (meaning.startsWith('[') && meaning.endsWith(']')) {
				const parsed = JSON.parse(meaning);
				return Array.isArray(parsed) ? parsed[0] : meaning;
			}
			return meaning.split(',')[0].replace(/["']/g, '');
		} catch (e) {
			return meaning.split(',')[0];
		}
	};

	const startQuiz = () => {
		const items: QuizItem[] = radicals.map(rad => {
			const answer = parseMeaning(rad.meanings_fr || rad.meanings_en);
			// Générer des distracteurs simples parmi les autres radicaux appris
			const others = radicals.filter(r => r.id !== rad.id);
			const distractors = others.map(o => parseMeaning(o.meanings_fr || o.meanings_en)).slice(0, 3);
			
			return {
				id: `learn_${rad.id}`,
				dbId: rad.id, // On utilisera le kanji_id pour créer l'entrée
				sourceTable: 'user_kanji_stats',
				questionType: 'kanji_to_meaning',
				prompt: rad.literal,
				answer,
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
				finishLearning([...quizItems.slice(0, -1), { ...quizItems[currentIndex], isCorrect: correct, failCount: quizItems[currentIndex].failCount }]);
			}
		}, 1200);
	};

	const finishLearning = async (finalItems: QuizItem[]) => {
		setStep('LOADING');
		const db = await getDb();
		
		// 1. Créer les entrées initiales dans user_kanji_stats car elles n'existent pas
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

		// 2. Mettre à jour avec les résultats du quiz via le moteur SRS
		// On doit récupérer les nouveaux IDs auto-générés ou utiliser kanji_id pour matcher
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
				<Text className="text-indigo-200 font-black tracking-widest animate-pulse">PRÉPARATION...</Text>
			</View>
		);
	}

	if (step === 'INTRO') {
		const current = radicals[currentIndex];
		return (
			<View className="flex-1 bg-slate-950 p-6 justify-between">
				<View className="pt-10">
					<Text className="text-slate-500 font-black text-xs tracking-[0.3em] text-center mb-4 uppercase">DÉCOUVERTE</Text>
					<View className="flex-row justify-center gap-2">
						{radicals.map((_, i) => (
							<View key={i} className={`h-1 rounded-full ${i <= currentIndex ? 'bg-indigo-500 w-8' : 'bg-slate-800 w-4'}`} />
						))}
					</View>
				</View>

				<Animated.View style={{ opacity: fadeAnim }} className="items-center">
					<View className="w-40 h-40 bg-slate-900 rounded-[2.5rem] border-2 border-indigo-500/20 items-center justify-center mb-6 shadow-2xl">
						<Text className="text-7xl text-white font-bold">{current.literal}</Text>
					</View>
					<Text className="text-3xl font-black text-white mb-2 text-center uppercase tracking-widest">
						{parseMeaning(current.meanings_fr || current.meanings_en)}
					</Text>
					<Text className="text-slate-500 font-bold text-lg">Radical • {current.stroke_count} traits</Text>
				</Animated.View>

				<View className="mb-12">
					<Pressable 
						onPress={() => {
							if (currentIndex < radicals.length - 1) {
								setCurrentIndex(currentIndex + 1);
							} else {
								startQuiz();
							}
						}}
						className="bg-indigo-600 py-6 rounded-[2rem] items-center shadow-xl active:scale-95 transition-all"
					>
						<Text className="text-white font-black text-lg tracking-widest">
							{currentIndex < radicals.length - 1 ? 'SUIVANT' : 'COMMENCER LE QUIZ'}
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
					<Text className="text-white font-black text-center text-xl">Trouve la signification</Text>
				</View>

				<View className="items-center">
					<View className="w-36 h-36 bg-slate-900 rounded-[2rem] border border-slate-800 items-center justify-center mb-8">
						<Text className="text-7xl text-white font-bold">{current.prompt}</Text>
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

				<View className="h-20" />
			</View>
		);
	}

	if (step === 'SUMMARY') {
		return (
			<View className="flex-1 bg-slate-950 p-8 items-center justify-center">
				<View className="w-24 h-24 bg-emerald-500 rounded-full items-center justify-center mb-8 shadow-2xl">
					<Text className="text-5xl">🎉</Text>
				</View>
				<Text className="text-4xl font-black text-white text-center mb-4">Session Terminée !</Text>
				<Text className="text-slate-400 text-center text-lg mb-12 leading-relaxed">
					Tu as découvert <Text className="text-indigo-400 font-black">5 nouveaux radicaux</Text>. Ils apparaîtront bientôt dans tes révisions quotidiennes.
				</Text>
				
				<Pressable 
					onPress={() => router.replace('/')}
					className="w-full bg-indigo-600 py-6 rounded-[2rem] items-center shadow-xl active:scale-95 transition-all"
				>
					<Text className="text-white font-black text-lg tracking-widest">RETOUR AU DASHBOARD</Text>
				</Pressable>
			</View>
		);
	}

	return null;
}
