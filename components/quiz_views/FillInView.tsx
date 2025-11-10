import React from 'react';
import type { FillInQuestion } from '../../types';
import { useFitText } from '../quiz_helpers/useFitText';

interface AnswerState {
    selected: any;
    isCorrect: boolean;
}

interface FillInViewProps {
    question: FillInQuestion;
    options: string[];
    isAnswered: boolean;
    answerState?: AnswerState;
    quizMode: 'klasik' | 'zamana-karsi' | 'hayatta-kalma';
    onSelectAnswer: (option: string) => void;
}

export const FillInView: React.FC<FillInViewProps> = ({ question, options, isAnswered, answerState, quizMode, onSelectAnswer }) => {
    
    // We pass an empty string because the text inside is complex and fitText can't handle it well.
    // The container will still provide the fitting context.
    const questionTextRef = useFitText('');

    const getOptionClass = (option: string) => {
        if (!isAnswered) return '';
        if (option === question.answer) return 'correct';
        if (answerState && option === answerState.selected) return 'incorrect';
        return 'opacity-50';
    };

    return (
        <>
            <div className="question-text-container">
                <div ref={questionTextRef} className="question-text">
                    <div className="leading-relaxed text-center flex flex-wrap items-center justify-center">
                        <span>{question.sentence.split('___')[0]}</span>
                        <span
                            className={`inline-block font-bold mx-2 px-3 py-1 rounded-lg transition-colors duration-500 ${isAnswered ? (answerState?.isCorrect ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-300') : 'bg-slate-700/80 text-slate-300'}`}
                            style={{ minWidth: '150px' }}
                        >
                            {isAnswered
                                ? (typeof answerState?.selected === 'string'
                                    ? answerState.selected
                                    : 'Süre Doldu')
                                : '...'}
                        </span>
                        <span>{question.sentence.split('___')[1]}</span>
                    </div>
                </div>
            </div>
            <div className="answer-options grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {options.map((option) => (
                    <button
                        key={option}
                        onClick={() => onSelectAnswer(option)}
                        disabled={isAnswered && quizMode !== 'zamana-karsi'}
                        className={`option justify-center ${getOptionClass(option)}`}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </>
    );
};
