import React, { useMemo } from 'react';
import type { QuizQuestion } from '../../types';
import { useFitText } from '../quiz_helpers/useFitText';

interface AnswerState {
    selected: any;
    isCorrect: boolean;
}

interface QuizViewProps {
    question: QuizQuestion;
    options: string[];
    isAnswered: boolean;
    answerState?: AnswerState;
    disabledOptions: string[];
    quizMode: 'klasik' | 'zamana-karsi' | 'hayatta-kalma';
    onSelectAnswer: (option: string) => void;
    onImageClick: (imageUrl: string) => void;
    isParagraphQuestion: boolean;
    isOptionCorrect: (option: string) => boolean;
}

export const QuizView: React.FC<QuizViewProps> = ({
    question,
    options,
    isAnswered,
    answerState,
    disabledOptions,
    quizMode,
    onSelectAnswer,
    onImageClick,
    isParagraphQuestion,
    isOptionCorrect
}) => {
    const { paragraph, questionText } = useMemo(() => {
        // Only split the text if it's a paragraph question.
        if (isParagraphQuestion) {
            const parts = question.question.split('\n\n');
            // Check if separator exists, otherwise treat as a single block.
            if (parts.length > 1) {
                return {
                    paragraph: parts.slice(0, -1).join('\n\n'),
                    questionText: parts.slice(-1)[0]
                };
            }
        }
        // For non-paragraph questions or paragraph questions without a separator,
        // return the whole text as the questionText.
        return { paragraph: null, questionText: question.question };
    }, [question.question, isParagraphQuestion]);

    // useFitText should only apply to the simple, centered text case.
    const shouldFitText = !isParagraphQuestion && !question.userUploadedImage;
    const questionTextRef = useFitText(shouldFitText ? questionText : '', isAnswered);

    const getOptionClass = (option: string): string => {
        if (disabledOptions.includes(option)) {
            return 'hidden-by-joker';
        }
    
        if (!isAnswered || !answerState) {
            return ''; // Default state, no color.
        }
    
        const isThisTheCorrectAnswer = isOptionCorrect(option);
        
        if (answerState.isCorrect) {
            return isThisTheCorrectAnswer ? 'correct' : 'opacity-50';
        } else {
            if (isThisTheCorrectAnswer) {
                return 'correct';
            }
            if (option === answerState.selected) {
                return 'incorrect';
            }
            return 'opacity-50';
        }
    };
    
    const getOptionStyle = (option: string): React.CSSProperties => {
        if (!isAnswered || !answerState) {
            return {};
        }
        
        const isThisTheCorrectAnswer = isOptionCorrect(option);
        
        // Force inline styles for iOS Safari compatibility
        if (isThisTheCorrectAnswer) {
            return {
                backgroundColor: '#f59e0b',
                borderColor: '#fbbf24',
                color: '#422006',
                fontWeight: 'bold',
                transform: 'scale(1.02)'
            };
        }
        
        if (option === answerState.selected && !answerState.isCorrect) {
            return {
                backgroundColor: '#991b1b',
                borderColor: '#ef4444'
            };
        }
        
        return {};
    };

    return (
        <>
            {/* --- Main Content Area: Image and/or Text --- */}
            
            {/* Image (if it exists) */}
            {question.userUploadedImage && (
                <div className="flex-shrink-0 flex items-center justify-center p-2 bg-black/20 rounded-lg max-h-56 mb-4">
                    <img
                        src={`data:image/png;base64,${question.userUploadedImage}`}
                        alt="Soru görseli (büyütmek için tıklayın)"
                        className="max-w-full max-h-full object-contain rounded-lg cursor-pointer transition-transform hover:scale-105"
                        onClick={() => onImageClick(question.userUploadedImage!)}
                    />
                </div>
            )}
            
            {/* Text Block */}
            {isParagraphQuestion && paragraph ? (
                // Paragraph View
                <div className="question-text-container paragraph-mode">
                    <p className="paragraph-text">{paragraph}</p>
                    <p className="question-text-for-paragraph">{questionText}</p>
                </div>
            ) : (
                // Standard Text View
                <div className="question-text-container">
                    <div ref={shouldFitText ? questionTextRef : null} className="question-text">{questionText}</div>
                </div>
            )}
            
            {/* --- Answer Options --- */}
            <div className="answer-options">
                {options.map((option, index) => (
                    <button
                        key={option}
                        onClick={() => onSelectAnswer(option)}
                        disabled={(isAnswered && quizMode !== 'zamana-karsi') || disabledOptions.includes(option)}
                        className={`option ${getOptionClass(option)}`}
                        style={getOptionStyle(option)}
                    >
                        <span className="font-bold mr-2">{`${String.fromCharCode(65 + index)})`}</span>
                        <span>{option}</span>
                    </button>
                ))}
            </div>

            {/* --- Explanation --- */}
            {isAnswered && question.explanation && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg animate-fadeIn">
                    <h4 className="flex items-center gap-2 font-bold text-lg text-green-200 mb-2">
                        <span>💡</span>
                        <span>Doğru Cevabın Açıklaması</span>
                    </h4>
                    <p className="text-slate-200">{question.explanation}</p>
                </div>
            )}
        </>
    );
};
