import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDb } from '../services/db/client';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function DeckEditorScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const params = useLocalSearchParams();
	const deckId = typeof params.id === 'string' ? parseInt(params.id) : 0;
	
	const [deckName, setDeckName] = useState('');
	const [cards, setCards] = useState<any[]>([]);
	const [isModalVisible, setIsModalVisible] = useState(false);
	
	const [front, setFront] = useState('');
	const [reading, setReading] = useState('');
	const [back, setBack] = useState('');

	const loadData = async () => {
		if (!deckId) return;
		const db = await getDb();
		const deck = await db.getFirstAsync('SELECT * FROM custom_decks WHERE id = ?', [deckId]) as any;
		if (deck) setDeckName(deck.name);

		const rows = await db.getAllAsync('SELECT * FROM custom_cards WHERE deck_id = ? ORDER BY id DESC', [deckId]);
		setCards(rows);
	};

	useEffect(() => {
		loadData();
	}, [deckId]);

	const updateName = async (name: string) => {
		setDeckName(name);
		const db = await getDb();
		await db.runAsync('UPDATE custom_decks SET name = ? WHERE id = ?', [name, deckId]);
	};

	const addCard = async () => {
		if (!front || !back || !deckId) return;
		const db = await getDb();
		await db.runAsync(
			'INSERT INTO custom_cards (deck_id, front, reading, back) VALUES (?, ?, ?, ?)', 
			[deckId, front, reading, back]
		);
		setFront('');
		setReading('');
		setBack('');
		setIsModalVisible(false);
		loadData();
	};

	const deleteCard = async (cardId: number) => {
		const db = await getDb();
		await db.runAsync('DELETE FROM custom_cards WHERE id = ?', [cardId]);
		loadData();
	};

	return (
		<KeyboardAvoidingView 
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			className="flex-1"
			style={{ backgroundColor: colors.hexBg }}
		>
			<View className="flex-1 p-6">
				{/* Header */}
				<View className="flex-row items-center mb-8 pt-10 gap-4">
					<Pressable 
						onPress={() => router.back()} 
						className="w-12 h-12 rounded-2xl items-center justify-center border active:scale-95"
						style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
					>
						<Ionicons name="chevron-back" size={24} color={colors.hexText} />
					</Pressable>
					<TextInput 
						className="flex-1 text-2xl font-black"
						style={{ color: colors.hexText }}
						value={deckName}
						onChangeText={updateName}
						placeholder="Nom du deck"
						placeholderTextColor={colors.hexSubtext}
					/>
				</View>

				{/* Card List */}
				<ScrollView className="flex-1 mb-4" showsVerticalScrollIndicator={false}>
					{cards.length === 0 ? (
						<View 
							className="items-center justify-center py-20 rounded-[3rem] border border-dashed"
							style={{ backgroundColor: colors.hexCard + '4d', borderColor: colors.hexBorder }}
						>
							<Ionicons name="layers-outline" size={48} color={colors.hexSubtext} />
							<Text className="font-bold mt-4" style={{ color: colors.hexSubtext }}>Deck vide</Text>
							<Text className="text-xs mt-1" style={{ color: colors.hexSubtext, opacity: 0.7 }}>Ajoutez vos premières cartes ci-dessous.</Text>
						</View>
					) : (
						cards.map(card => (
							<View 
								key={card.id} 
								className="p-6 rounded-[2rem] border mb-4 flex-row justify-between items-center shadow-sm"
								style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
							>
								<View className="flex-1 mr-4">
									<View className="flex-row items-baseline gap-2 mb-1">
										<Text className="font-black text-xl" style={{ color: colors.hexText }}>{card.front}</Text>
										{card.reading && (
											<Text className="font-bold text-xs" style={{ color: colors.hexAccent }}>({card.reading})</Text>
										)}
									</View>
									<Text className="font-medium text-sm" style={{ color: colors.hexSubtext }}>{card.back}</Text>
								</View>
								<Pressable 
									onPress={() => deleteCard(card.id)}
									className="w-10 h-10 rounded-xl items-center justify-center border"
									style={{ backgroundColor: '#ef44441a', borderColor: '#ef444433' }}
								>
									<Ionicons name="trash" size={18} color="#ef4444" />
								</Pressable>
							</View>
						))
					)}
				</ScrollView>

				{/* Action Button */}
				<Pressable 
					onPress={() => setIsModalVisible(true)}
					className="py-6 rounded-[2rem] items-center shadow-2xl active:scale-95"
					style={{ backgroundColor: colors.hexAccent }}
				>
					<Text className="text-white font-black text-lg tracking-widest uppercase">+ AJOUTER UNE CARTE</Text>
				</Pressable>

				{/* Modal Addition */}
				<Modal visible={isModalVisible} animationType="fade" transparent={true}>
					<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
						<View className="flex-1 bg-black/90 justify-center p-6">
							<KeyboardAvoidingView behavior="padding">
								<View 
									className="rounded-[3rem] p-8 border shadow-2xl"
									style={{ backgroundColor: colors.hexCard, borderColor: colors.hexAccent + '33' }}
								>
									<View className="flex-row justify-between items-center mb-8">
										<Text className="text-3xl font-black" style={{ color: colors.hexText }}>Nouvelle Carte</Text>
										<Pressable onPress={() => setIsModalVisible(false)} className="p-2">
											<Ionicons name="close" size={28} color={colors.hexSubtext} />
										</Pressable>
									</View>
									
									<View className="gap-6">
										<View>
											<Text className="font-black text-[10px] uppercase tracking-[0.2em] mb-2 ml-1" style={{ color: colors.hexSubtext }}>Recto (Kanji / Mot)</Text>
											<TextInput 
												className="p-5 rounded-[1.5rem] border text-lg font-bold"
												style={{ backgroundColor: colors.hexBg, color: colors.hexText, borderColor: colors.hexBorder }}
												value={front}
												onChangeText={setFront}
												placeholder="Ex: 猫"
												placeholderTextColor={colors.hexSubtext + '80'}
											/>
										</View>

										<View>
											<Text className="font-black text-[10px] uppercase tracking-[0.2em] mb-2 ml-1" style={{ color: colors.hexSubtext }}>Lecture (Hiragana)</Text>
											<TextInput 
												className="p-5 rounded-[1.5rem] border text-lg font-bold"
												style={{ backgroundColor: colors.hexBg, color: colors.hexText, borderColor: colors.hexBorder }}
												value={reading}
												onChangeText={setReading}
												placeholder="Ex: ねこ"
												placeholderTextColor={colors.hexSubtext + '80'}
											/>
										</View>

										<View>
											<Text className="font-black text-[10px] uppercase tracking-[0.2em] mb-2 ml-1" style={{ color: colors.hexSubtext }}>Verso (Traductions)</Text>
											<TextInput 
												className="p-5 rounded-[1.5rem] border text-lg font-bold"
												style={{ backgroundColor: colors.hexBg, color: colors.hexText, borderColor: colors.hexBorder }}
												value={back}
												onChangeText={setBack}
												placeholder="Ex: Chat"
												placeholderTextColor={colors.hexSubtext + '80'}
											/>
										</View>
									</View>

									<Pressable 
										onPress={addCard}
										className="py-6 rounded-[2rem] items-center shadow-xl mt-10 active:opacity-80 active:scale-95"
										style={{ backgroundColor: colors.hexAccent }}
									>
										<Text className="text-white font-black tracking-widest uppercase">ENREGISTRER LA CARTE</Text>
									</Pressable>
								</View>
							</KeyboardAvoidingView>
						</View>
					</TouchableWithoutFeedback>
				</Modal>
			</View>
		</KeyboardAvoidingView>
	);
}
