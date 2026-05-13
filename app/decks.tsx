import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getDb } from '../services/db/client';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function DecksScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const [decks, setDecks] = useState<any[]>([]);

	const loadDecks = async () => {
		const db = await getDb();
		const rows = await db.getAllAsync(`
			SELECT d.*, 
			(SELECT COUNT(*) FROM custom_cards WHERE deck_id = d.id) as card_count,
			(SELECT COUNT(*) FROM custom_cards WHERE deck_id = d.id AND next_review <= CURRENT_TIMESTAMP AND repetition > 0) as due_count,
			(SELECT COUNT(*) FROM custom_cards WHERE deck_id = d.id AND repetition = 0) as new_count
			FROM custom_decks d 
			ORDER BY d.created_at DESC
		`);
		setDecks(rows);
	};

	useFocusEffect(
		useCallback(() => {
			loadDecks();
		}, [])
	);

	const createDeck = async () => {
		const db = await getDb();
		await db.runAsync('INSERT INTO custom_decks (name) VALUES (?)', ['Nouveau Deck']);
		loadDecks();
	};

	const toggleVisibility = async (deckId: number, currentVisible: boolean) => {
		const db = await getDb();
		await db.runAsync('UPDATE custom_decks SET is_visible = ? WHERE id = ?', [currentVisible ? 0 : 1, deckId]);
		loadDecks();
	};

	const deleteDeck = (id: number, name: string) => {
		Alert.alert(
			"Supprimer le deck",
			`Êtes-vous sûr de vouloir supprimer "${name}" ? Toutes les cartes seront perdues.`,
			[
				{ text: "Annuler", style: "cancel" },
				{ 
					text: "Supprimer", 
					style: "destructive",
					onPress: async () => {
						const db = await getDb();
						await db.runAsync('DELETE FROM custom_decks WHERE id = ?', [id]);
						loadDecks();
					}
				}
			]
		);
	};

	return (
		<View className="flex-1" style={{ backgroundColor: colors.hexBg }}>
			<ScrollView 
				className="flex-1" 
				contentContainerStyle={{ padding: 24, paddingTop: 20 }}
				showsVerticalScrollIndicator={false}
			>
				<View className="flex-row justify-between items-center mb-8">
					<View>
						<Text className="font-black text-xs tracking-[0.2em] mb-1 uppercase" style={{ color: colors.hexSubtext }}>Bibliothèque</Text>
						<Text className="text-3xl font-black" style={{ color: colors.hexText }}>Mes Decks</Text>
					</View>
					<Pressable 
						onPress={createDeck}
						className="w-12 h-12 rounded-2xl items-center justify-center shadow-lg active:scale-95"
						style={{ backgroundColor: colors.hexAccent }}
					>
						<Ionicons name="add" size={28} color="white" />
					</Pressable>
				</View>

				{decks.length === 0 ? (
					<View className="items-center justify-center py-20">
						<View 
							className="w-20 h-20 rounded-full items-center justify-center mb-4 border"
							style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
						>
							<Ionicons name="layers-outline" size={40} color={colors.hexSubtext} />
						</View>
						<Text className="text-center font-bold" style={{ color: colors.hexSubtext }}>Aucun deck pour le moment.</Text>
						<Text className="text-center text-xs mt-2" style={{ color: colors.hexSubtext, opacity: 0.7 }}>Appuyez sur le + pour créer votre premier deck !</Text>
					</View>
				) : (
					decks.map((deck) => (
						<View 
							key={deck.id} 
							className="rounded-[2.5rem] border mb-4 overflow-hidden"
							style={{ backgroundColor: colors.hexCard, borderColor: colors.hexBorder }}
						>
							<View className="p-6 flex-row justify-between items-center">
								<Pressable 
									onPress={() => router.push({ pathname: '/deck_editor', params: { id: deck.id } })}
									className="flex-1"
								>
									<Text className="text-xl font-black mb-1" style={{ color: colors.hexText }}>{deck.name}</Text>
									<View className="flex-row items-center gap-3">
										<Text className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.hexSubtext }}>{deck.card_count} cartes</Text>
										{deck.due_count > 0 && (
											<View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.hexAccent + '1a' }}>
												<Text className="text-[10px] font-black" style={{ color: colors.hexAccent }}>{deck.due_count} À RÉVISER</Text>
											</View>
										)}
									</View>
								</Pressable>
								<View className="flex-row items-center gap-2">
									<Pressable 
										onPress={() => toggleVisibility(deck.id, deck.is_visible === 1)}
										className="w-10 h-10 rounded-xl items-center justify-center border"
										style={{ 
											backgroundColor: deck.is_visible ? colors.hexAccent + '1a' : colors.hexBgSecondary, 
											borderColor: deck.is_visible ? colors.hexAccent + '33' : colors.hexBorder 
										}}
									>
										<Ionicons name={deck.is_visible ? "eye" : "eye-off"} size={18} color={deck.is_visible ? colors.hexAccent : colors.hexSubtext} />
									</Pressable>
									<Pressable 
										onPress={() => deleteDeck(deck.id, deck.name)}
										className="w-10 h-10 rounded-xl items-center justify-center border"
										style={{ backgroundColor: '#ef44441a', borderColor: '#ef444433' }}
									>
										<Ionicons name="trash-outline" size={18} color="#ef4444" />
									</Pressable>
								</View>
							</View>
							
							<View className="flex-row border-t" style={{ borderTopColor: colors.hexBorder }}>
								{deck.new_count > 0 && (
									<Pressable 
										onPress={() => router.push({ pathname: '/learn_custom', params: { deckId: deck.id } })}
										className="flex-1 py-4 items-center justify-center border-r bg-emerald-600/10"
										style={{ borderRightColor: colors.hexBorder }}
									>
										<Text className="font-black text-[10px] tracking-widest text-emerald-400">
											APPRENDRE ({deck.new_count})
										</Text>
									</Pressable>
								)}

								<Pressable 
									onPress={() => router.push({ pathname: '/quiz', params: { type: 'custom', deckId: deck.id } })}
									className={`flex-1 py-4 items-center justify-center`}
									style={{ backgroundColor: deck.due_count > 0 ? colors.hexAccent + '1a' : 'transparent' }}
								>
									<Text className={`font-black text-[10px] tracking-widest`} style={{ color: deck.due_count > 0 ? colors.hexAccent : colors.hexSubtext }}>
										{deck.due_count > 0 ? `RÉVISER (${deck.due_count})` : 'À JOUR'}
									</Text>
								</Pressable>
							</View>
						</View>
					))
				)}
				<View className="h-20" />
			</ScrollView>
		</View>
	);
}
