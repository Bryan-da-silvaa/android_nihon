import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuizEngine } from '../hooks/useQuizEngine';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { KanjiCanvas } from '../components/KanjiCanvas';
import { VoiceButton } from '../components/VoiceButton';

export default function QuizScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const params = useLocalSearchParams();
	const deckType = (params.type as 'kanji' | 'hiragana' | 'katakana' | 'custom') || 'kanji';
	const jlpt = params.jlpt ? parseInt(params.jlpt as string) : undefined;
	const deckId = params.deckId ? parseInt(params.deckId as string) : undefined;

	const isLearning = params.learning === 'true';
	const isCram = params.mode === 'cram';
	const {
		isLoading, isFinished, isSaving, currentCard,
		choices, currentIndex, totalCards, score, handleAnswer
	} = useQuizEngine(deckType, 20, jlpt, deckId, isLearning, isCram);

	useEffect(() => {
		if (isFinished && !isCram) {
			const { scheduleSRSReviewNotification, updateAppBadge, scheduleTomorrowStreakReminder } = require('../services/notifications');
			const { refreshWidgetData } = require('../services/widget');
			const { updateUserStreak } = require('../services/db/queries');
			
			updateAppBadge();
			scheduleSRSReviewNotification();
			refreshWidgetData();

			// Mettre à jour le streak et programmer le rappel de demain
			const updateStreakData = async () => {
				try {
					await updateUserStreak();
					await scheduleTomorrowStreakReminder();
				} catch (e) {
					console.warn("Erreur lors de la mise à jour du streak:", e);
				}
			};
			updateStreakData();
		}
	}, [isFinished, isCram]);

	const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
	const [isDrawingMode, setIsDrawingMode] = useState(false);
	const [traceRepetitions, setTraceRepetitions] = useState(0);
	const REQUIRED_TRACES = 10; // On pourra lier cela aux settings plus tard

	const isTracePhase = isLearning && traceRepetitions < REQUIRED_TRACES && deckType === 'kanji';

	useEffect(() => {
		if (isFinished) {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		}
	}, [isFinished]);

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.hexBg }}>
				<Text className="font-bold animate-pulse uppercase tracking-[0.3em]" style={{ color: colors.hexAccent }}>Chargement...</Text>
			</View>
		);
	}

	if (isFinished) {
		return (
			<View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.hexBg }}>
				<View 
					className="w-24 h-24 rounded-full items-center justify-center mb-6" 
					style={{ backgroundColor: colors.hexBgSecondary, borderWidth: 2, borderColor: colors.hexBorder }}
				>
					<Text className="text-5xl">💮</Text>
				</View>
				<Text className="text-3xl font-black mb-2 text-center" style={{ color: colors.hexText }}>お疲れ様 !</Text>
				<Text className="text-sm uppercase tracking-[0.3em] font-bold mb-12" style={{ color: colors.hexAccent }}>Session Terminée</Text>

				{isSaving ? (
					<View className="items-center">
						<Text className="font-bold animate-pulse mb-4" style={{ color: colors.hexAccent }}>Mise à jour du moteur SRS...</Text>
						<View className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
							<View className="h-full bg-emerald-500 w-1/2 animate-pulse" />
						</View>
					</View>
				) : (
					<Pressable
						onPress={() => router.replace('/')}
						className="px-10 py-5 rounded-[2rem] active:opacity-80 active:scale-95 transition-all shadow-xl"
						style={{ backgroundColor: colors.hexAccent }}
					>
						<Text className="text-white font-black text-xl tracking-widest uppercase">Continuer</Text>
					</Pressable>
				)}
			</View>
		);
	}

	const onChoiceSelect = (choice: string) => {
		if (selectedChoice !== null) return;
		setSelectedChoice(choice);
		const isCorrect = choice === currentCard?.answer;

		// Feedback Haptique "Mastery"
		if (isCorrect) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		} else {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		}

		if (currentCard) {
			const baseText = (currentCard.questionType === 'meaning_to_kanji' || currentCard.questionType === 'romaji_to_kana') 
				? currentCard.answer 
				: currentCard.prompt;
			const textToSpeak = currentCard.reading || baseText;
			Speech.speak(textToSpeak, { language: 'ja-JP', rate: 0.9 });
		}

		// Automate SRS Grade for MCQ: Correct -> Good (3), Wrong -> Again (1)
		const grade = isCorrect ? 3 : 1;

		setTimeout(() => {
			setSelectedChoice(null);
			handleAnswer(isCorrect, grade);
			setIsDrawingMode(false);
			setTraceRepetitions(0); // Reset pour le prochain Kanji
		}, 600);
	};

	const onTraceComplete = () => {
		const newCount = traceRepetitions + 1;
		setTraceRepetitions(newCount);
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		
		if (newCount === REQUIRED_TRACES) {
			// Petite pause avant de passer au quiz
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		}
	};

	const replayAudio = () => {
		if (currentCard) {
			const baseText = (currentCard.questionType === 'meaning_to_kanji' || currentCard.questionType === 'romaji_to_kana') 
				? currentCard.answer 
				: currentCard.prompt;
			const textToSpeak = currentCard.reading || baseText;
			Speech.speak(textToSpeak, { language: 'ja-JP', rate: 0.9 });
		}
	};

	const isShortPrompt = !currentCard?.prompt || currentCard.prompt.length <= 5;
	const canDraw = currentCard?.questionType === 'kanji_to_meaning' || currentCard?.questionType === 'kanji_to_reading' || (currentCard?.prompt && currentCard.prompt.length === 1);

	return (
		<View className="flex-1" style={{ backgroundColor: colors.hexBg }}>
			{/* Header with Progress Bar */}
			<View className="pt-14 px-6 mb-2">
				<View className="flex-row justify-between items-center mb-4">
					<Pressable onPress={() => router.back()} className="p-2 -ml-2">
						<Ionicons name="close-circle" size={32} color={colors.hexSubtext} />
					</Pressable>
					<View className="flex-row items-center gap-4">
						{canDraw && (
							<Pressable 
								onPress={() => {
									setIsDrawingMode(!isDrawingMode);
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								}}
								className="p-2 rounded-full border"
								style={{ 
									backgroundColor: isDrawingMode ? colors.hexAccent : 'transparent',
									borderColor: isDrawingMode ? colors.hexAccent : colors.hexBorder 
								}}
							>
								<Ionicons name="brush" size={20} color={isDrawingMode ? "#fff" : colors.hexSubtext} />
							</Pressable>
						)}
						<View className="items-end">
							<Text className="font-black text-[10px] tracking-widest uppercase" style={{ color: colors.hexSubtext }}>
								Progression
							</Text>
							<Text className="font-black text-lg" style={{ color: colors.hexText }}>
								{currentIndex + 1} <Text className="text-sm opacity-40">/ {totalCards}</Text>
							</Text>
						</View>
					</View>
				</View>
				<View className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.hexBgSecondary }}>
					<View 
						className="h-full transition-all duration-300" 
						style={{ 
							width: `${totalCards > 0 ? (currentIndex / totalCards) * 100 : 0}%`,
							backgroundColor: colors.hexAccent 
						}} 
					/>
				</View>
			</View>

			<View className="flex-1 px-6 justify-center pb-12">
				{(isDrawingMode || isTracePhase) && currentCard ? (
					<View className="flex-1 justify-center items-center mb-6">
						<View className="mb-4 items-center">
							<Text style={{ color: colors.hexAccent, fontWeight: '900', fontSize: 12 }} className="uppercase tracking-[0.2em]">
								{isTracePhase ? `Répétition ${traceRepetitions + 1} / ${REQUIRED_TRACES}` : "Entraînement Libre"}
							</Text>
							<Text style={{ color: colors.hexSubtext, textAlign: 'center' }} className="text-sm">
								{isTracePhase ? "Trace le caractère pour le mémoriser" : "Entraîne-toi à tracer le caractère !"}
							</Text>
						</View>
						
						<KanjiCanvas 
							targetKanji={currentCard.kanjiLiteral || currentCard.prompt} 
							colors={colors}
							onComplete={onTraceComplete}
						/>
					</View>
				) : (
					<>
						{/* Prompt Card Area - Centré avec le bas */}
						<View className="w-full justify-center mb-8 mt-4">
							<View 
								className="rounded-[3rem] p-6 items-center border shadow-lg min-h-[160px] justify-center relative overflow-hidden"
								style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
							>
								<View className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: colors.hexAccent, opacity: 0.1 }} />
								
								{/* Bouton Audio - Repositionné pour respecter les coins arrondis */}
								<Pressable onPress={replayAudio} className="absolute top-6 right-6 p-2 rounded-xl active:scale-90 z-10" style={{ backgroundColor: colors.hexBgSecondary }}>
									<Ionicons name="volume-medium" size={24} color={colors.hexAccent} />
								</Pressable>
								
								<Text className="font-black text-center mb-2 mt-4" style={{ color: colors.hexSubtext, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' }}>
									{currentCard?.questionType.replace(/_/g, ' ')}
								</Text>
								
								{/* Texte du prompt avec padding pour éviter le bouton audio */}
								<View className="w-full px-6 items-center justify-center">
									<Text 
										className="font-black text-center" 
										style={{ color: colors.hexText, fontSize: isShortPrompt ? 56 : 24 }}
										numberOfLines={3}
										adjustsFontSizeToFit
									>
										{currentCard?.prompt}
									</Text>
								</View>
							</View>
						</View>
					</>
				)}

				{/* Voice Recognition Area */}
				{!isTracePhase && currentCard && (
					<View className="items-center mb-2">
						<VoiceButton onResult={(text) => {
							if (selectedChoice !== null || !currentCard) return;
							
							const input = text.trim();
							const possibleMatches = [
								currentCard.answer,
								currentCard.prompt,
								...(currentCard.reading ? currentCard.reading.split('、') : []),
								currentCard.kanjiLiteral
							].filter(Boolean);

							const isMatch = possibleMatches.some(match => match && (input === match || input.includes(match)));

							if (isMatch) {
								onChoiceSelect(currentCard.answer);
							} else {
								// Feedback léger si le mot n'est pas reconnu
								Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
							}
						}} />
					</View>
				)}

				{/* Choices Area - Hidden during trace phase */}
				{!isTracePhase && (
					<View className="flex-col gap-3">
						{choices.map((choice, idx) => {
							let bgColor = colors.hexCard;
							let borderColor = colors.hexBorder;
							let textColor = colors.hexText;

							if (selectedChoice) {
								if (choice === currentCard?.answer) {
									bgColor = "#10b981";
									borderColor = "#059669";
									textColor = "#ffffff";
								} else if (choice === selectedChoice) {
									bgColor = "#ef4444";
									borderColor = "#dc2626";
									textColor = "#ffffff";
								} else {
									bgColor = colors.hexBgSecondary;
									textColor = colors.hexSubtext;
								}
							}

							return (
								<Pressable
									key={idx}
									onPress={() => onChoiceSelect(choice)}
									className="py-4 px-6 rounded-[1.6rem] border-2 items-center justify-center active:scale-[0.98] transition-all shadow-sm"
									style={{ backgroundColor: bgColor, borderColor: borderColor }}
								>
									<Text 
										className="text-base text-center font-bold" 
										style={{ color: textColor }}
										numberOfLines={2}
									>
										{choice}
									</Text>
								</Pressable>
							);
						})}
					</View>
				)}
			</View>
		</View>
	);
}
