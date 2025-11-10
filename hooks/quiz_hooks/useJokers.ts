import { useState, useCallback } from 'react';
import type { QuizQuestion } from '../../types';

interface UseJokersProps {
  optionsToShow: string[];
  currentQuestion: QuizQuestion;
  currentQuestionIndex: number;
  onSkip: () => void;
  onAddTime: () => void;
}

export const useJokers = ({
  optionsToShow,
  currentQuestion,
  currentQuestionIndex,
  onSkip,
  onAddTime,
}: UseJokersProps) => {
    const [jokers, setJokers] = useState({ fiftyFifty: true, addTime: true, skip: true });
    const [jokerEffects, setJokerEffects] = useState<Record<number, { disabledOptions: string[] }>>({});
    
    const disabledOptions = jokerEffects[currentQuestionIndex]?.disabledOptions || [];

    const useFiftyFiftyJoker = useCallback(() => {
        if (!jokers.fiftyFifty || currentQuestion?.type !== 'quiz') return;
        
        const incorrectOptions = optionsToShow.filter(opt => opt !== (currentQuestion as QuizQuestion).answer);
        const toDisable = incorrectOptions.sort(() => 0.5 - Math.random()).slice(0, 2);

        setJokerEffects(prev => ({ ...prev, [currentQuestionIndex]: { disabledOptions: toDisable } }));
        setJokers(prev => ({ ...prev, fiftyFifty: false }));
    }, [jokers.fiftyFifty, optionsToShow, currentQuestion, currentQuestionIndex]);

    const useAddTimeJoker = useCallback(() => {
        if (!jokers.addTime) return;
        onAddTime();
        setJokers(prev => ({ ...prev, addTime: false }));
    }, [jokers.addTime, onAddTime]);
    
    const useSkipJoker = useCallback(() => {
        if (!jokers.skip) return;
        onSkip();
        setJokers(prev => ({ ...prev, skip: false }));
    }, [jokers.skip, onSkip]);
    
    return {
        jokers,
        disabledOptions,
        useFiftyFiftyJoker,
        useAddTimeJoker,
        useSkipJoker,
    };
};
