import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuizEngine } from '../hooks/useQuizEngine';

export default function QuizScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const deckType = (params.type as 'kanji' | 'hiragana' | 'katakana') || 'kanji';
	const jlpt = params.jlpt ? parseInt(params.jlpt as string) : undefined;

	const {
		isLoading, isFinished, isSaving, currentCard,
		choices, currentIndex, totalCards, score, handleAnswer
	} = useQuizEngine(deckType, 20, jlpt);

	const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

	if (isFinished) {
		return (
			<View className="flex-1 bg-slate-950 items-center justify-center p-6">
				<Text className="text-8xl mb-8">🎉</Text>
				<Text className="text-4xl font-black text-white mb-2 text-center">Session Terminée</Text>
				<Text className="text-xl text-slate-400 mb-12 font-bold tracking-widest">Score : {score} / {totalCards}</Text>

				{isSaving ? (
					<Text className="text-indigo-400 font-bold animate-pulse">Sauvegarde des progrès dans SQLite...</Text>
				) : (
					<Pressable
						onPress={() => router.replace('/')}
						className="bg-indigo-600 px-10 py-5 rounded-[2rem] active:opacity-80 active:scale-95 transition-all"
					>
						<Text className="text-white font-black text-xl tracking-widest">TERMINER</Text>
					</Pressable>
				)}
			</View>
		);
	}

	const onChoiceSelect = (choice: string) => {
		if (selectedChoice !== null) return;
		setSelectedChoice(choice);
		const isCorrect = choice === currentCard?.answer;
		setTimeout(() => {
			setSelectedChoice(null);
			handleAnswer(isCorrect);
		}, 1200);
	};

	const isShortPrompt = !currentCard?.prompt || currentCard.prompt.length <= 5;

	return (
		<View className="flex-1 bg-slate-950 px-6">
			{/* Compteur ultra-discret */}
			<View className="flex-row justify-end pt-4 mb-2">
				<Text className="text-slate-600 font-black text-[10px] tracking-widest uppercase">
					{currentIndex + 1} / {totalCards}
				</Text>
			</View>

			<View className="flex-1 justify-center pb-12">
				{/* Zone de Question - Style Renshuu compact */}
				<View className="bg-slate-900 rounded-[2.5rem] p-8 mb-6 items-center border border-slate-800 shadow-2xl min-h-[180px] justify-center relative overflow-hidden">
					<View className="absolute inset-0 bg-indigo-500/5" />
					<Text className={`font-black text-white text-center ${isShortPrompt ? 'text-6xl' : 'text-3xl'}`}>
						{currentCard?.prompt}
					</Text>
				</View>

				{/* Grille de Réponses (QCM) - Groupée avec la carte */}
				<View className="flex-col gap-3">
					{choices.map((choice, idx) => {
						let bgClass = "bg-slate-900";
						let borderClass = "border-slate-800";
						let textClass = "text-white";

						if (selectedChoice) {
							if (choice === currentCard?.answer) {
								bgClass = "bg-emerald-600";
								borderClass = "border-emerald-500";
								textClass = "text-white font-black";
							} else if (choice === selectedChoice) {
								bgClass = "bg-red-600";
								borderClass = "border-red-500";
								textClass = "text-white font-black";
							} else {
								bgClass = "bg-slate-900/40";
								borderClass = "border-slate-900";
								textClass = "text-slate-500";
							}
						}

						return (
							<Pressable
								key={idx}
								onPress={() => onChoiceSelect(choice)}
								className={`py-5 px-6 rounded-3xl border-2 items-center justify-center active:scale-[0.98] transition-all shadow-sm ${bgClass} ${borderClass}`}
							>
								<Text className={`text-lg text-center ${textClass}`}>
									{choice}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>
		</View>
	);
}
