import { useState, useCallback, useEffect } from 'react';
import { fetchDueCards, syncReviews, QuizItem } from '../services/srs/engine';

export function useQuizEngine(deckType: 'kanji' | 'hiragana' | 'katakana', limit: number = 20, jlpt?: number) {
  const [cards, setCards] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Options mélangées pour la question en cours
  const [choices, setChoices] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const due = await fetchDueCards(deckType, limit, jlpt);
        setCards(due);
        if (due.length === 0) {
          setIsFinished(true);
        }
      } catch (e) {
        console.error("Erreur lors du chargement des cartes", e);
      }
      setIsLoading(false);
    }
    load();
  }, [limit, jlpt]);

  const currentCard = cards[currentIndex] || null;

  // On mélange les choix à chaque changement de carte
  useEffect(() => {
    if (currentCard) {
      const allChoices = [currentCard.answer, ...currentCard.distractors];
      // Simple shuffle array
      for (let i = allChoices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
      }
      setChoices(allChoices);
    }
  }, [currentCard]);

  const handleAnswer = useCallback(async (isCorrect: boolean) => {
    const updatedCards = [...cards];
    updatedCards[currentIndex].isCorrect = isCorrect;
    setCards(updatedCards);

    if (isCorrect) setScore(s => s + 1);

    if (currentIndex + 1 >= updatedCards.length) {
      setIsSaving(true);
      await syncReviews(updatedCards);
      setIsSaving(false);
      setIsFinished(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, cards]);

  return {
    isLoading,
    isFinished,
    isSaving,
    currentCard,
    choices,
    currentIndex,
    totalCards: cards.length,
    score,
    handleAnswer
  };
}
