import { useState, useCallback, useEffect } from 'react';
import { fetchDueCards, syncReviews, QuizItem, SRSGrade } from '../services/srs/engine';
import { getUserProfile } from '../services/db/queries';

export function useQuizEngine(deckType: 'kanji' | 'hiragana' | 'katakana' | 'custom', limit: number = 20, jlpt?: number, deckId?: number, isLearning?: boolean, isCram?: boolean) {
  const [cards, setCards] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [strategy, setStrategy] = useState<'intensive' | 'balanced' | 'relaxed'>('balanced');

  // Options mélangées pour la question en cours
  const [choices, setChoices] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        // Fetch user strategy first
        const profile = await getUserProfile();
        const userStrategy = profile?.learning_strategy || 'balanced';
        setStrategy(userStrategy);

        const due = await fetchDueCards(deckType, limit, jlpt, deckId, isLearning, isCram);
        
        // Inject strategy into items
        const cardsWithStrategy = due.map(c => ({ ...c, strategy: userStrategy }));
        
        setCards(cardsWithStrategy);
        if (due.length === 0) {
          setIsFinished(true);
        }
      } catch (e) {
        console.error("Erreur lors du chargement des cartes", e);
        setIsFinished(true);
      }
      setIsLoading(false);
    }
    load();
  }, [limit, jlpt, deckId, isLearning, isCram]);

  const currentCard = cards[currentIndex] || null;

  useEffect(() => {
    if (currentCard) {
      const allChoices = [currentCard.answer, ...currentCard.distractors];
      for (let i = allChoices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
      }
      setChoices(allChoices);
    }
  }, [currentCard]);

  const handleAnswer = useCallback(async (isCorrect: boolean, grade?: SRSGrade) => {
    const updatedCards = [...cards];
    updatedCards[currentIndex].isCorrect = isCorrect;
    if (grade) {
      updatedCards[currentIndex].grade = grade;
    }
    setCards(updatedCards);

    if (isCorrect) setScore(s => s + 1);

    if (currentIndex + 1 >= updatedCards.length) {
      setIsSaving(true);
      await syncReviews(updatedCards, isCram);
      setIsSaving(false);
      setIsFinished(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, cards, isCram]);

  return {
    isLoading,
    isFinished,
    isSaving,
    currentCard,
    choices,
    currentIndex,
    totalCards: cards.length,
    score,
    handleAnswer,
    strategy
  };
}
