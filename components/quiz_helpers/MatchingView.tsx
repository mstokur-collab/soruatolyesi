import React, { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react';
import type { MatchingQuestion } from '../../types';

interface AnswerState {
  selected: any;
  isCorrect: boolean;
  displayedOptions?: string[];
}

export const MatchingView: React.FC<{
  question: MatchingQuestion;
  onAnswer: (isCorrect: boolean, selected: Record<string, string>) => void;
  answerState?: AnswerState;
  playSound: (type: 'correct' | 'incorrect' | 'tick') => void;
}> = ({ question, onAnswer, answerState, playSound }) => {
    const [leftItems, setLeftItems] = useState<string[]>([]);
    const [rightItems, setRightItems] = useState<string[]>([]);
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const [matches, setMatches] = useState<Record<string, string>>({});
    const [incorrectShake, setIncorrectShake] = useState<string | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const isAnswered = !!answerState;

    const correctPairsMap = useMemo(() => new Map(question.pairs.map(p => [p.term, p.definition])), [question.pairs]);
    const definitionToTermMap = useMemo(() => new Map(question.pairs.map(p => [p.definition, p.term])), [question.pairs]);

    const pairColors = useMemo(() => {
        const colors = [
            { border: 'border-sky-400', bg: 'bg-sky-500/80' },
            { border: 'border-emerald-400', bg: 'bg-emerald-500/80' },
            { border: 'border-amber-400', bg: 'bg-amber-500/80' },
            { border: 'border-rose-400', bg: 'bg-rose-500/80' },
            { border: 'border-violet-400', bg: 'bg-violet-500/80' },
        ];
        const map = new Map<string, typeof colors[0]>();
        question.pairs.forEach((pair, index) => map.set(pair.term, colors[index % colors.length]));
        return map;
    }, [question.pairs]);

    useEffect(() => {
        setLeftItems(question.pairs.map(p => p.term).sort(() => Math.random() - 0.5));
        setRightItems(question.pairs.map(p => p.definition).sort(() => Math.random() - 0.5));
        setMatches(answerState ? answerState.selected : {});
        setSelectedLeft(null);
    }, [question, answerState]);

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        const spans = containerRef.current.querySelectorAll<HTMLSpanElement>('button > span');
        spans.forEach(span => {
            const button = span.parentElement;
            if(!button) return;

            const maxFontSize = 16;
            const minFontSize = 8;
            let currentSize = maxFontSize;
            
            span.style.fontSize = `${currentSize}px`;
            span.style.whiteSpace = 'nowrap';
            const checkOverflow = () => span.scrollWidth > button.clientWidth || span.scrollHeight > button.clientHeight;

            if (checkOverflow()) {
                span.style.whiteSpace = 'normal';
            }

            while (checkOverflow() && currentSize > minFontSize) {
                currentSize -= 0.5;
                span.style.fontSize = `${currentSize}px`;
            }
        });
    }, [leftItems, rightItems, question, containerRef]);

    useEffect(() => {
        if (!isAnswered && Object.keys(matches).length === question.pairs.length) {
            const isAllCorrect = question.pairs.every(p => matches[p.term] === p.definition);
            onAnswer(isAllCorrect, matches);
        }
    }, [matches, question.pairs, onAnswer, isAnswered]);

    const handleLeftClick = (term: string) => {
        if (isAnswered || matches[term]) return;
        setSelectedLeft(term === selectedLeft ? null : term);
    };

    const handleRightClick = (definition: string) => {
        if (isAnswered || !selectedLeft || Object.values(matches).includes(definition)) return;

        if (correctPairsMap.get(selectedLeft) === definition) {
            setMatches(prev => ({ ...prev, [selectedLeft]: definition }));
            playSound('correct');
        } else {
            playSound('incorrect');
            setIncorrectShake(definition);
            setTimeout(() => setIncorrectShake(null), 500);
        }
        setSelectedLeft(null);
    };

    const getItemClass = (item: string, side: 'left' | 'right') => {
        const isSelected = selectedLeft === item;
        const termForMatchCheck = side === 'left' ? item : definitionToTermMap.get(item);
        const isMatched = !!termForMatchCheck && !!matches[termForMatchCheck];
        
        const shakeClass = incorrectShake === item ? 'animate-shake' : '';
        const baseClass = 'w-full h-full transition-all duration-300 rounded-lg flex items-center justify-center text-center backdrop-blur-sm border-2';

        if (isAnswered) {
            const term = side === 'left' ? item : definitionToTermMap.get(item)!;
            const userMatch = answerState.selected[term];
            const correctMatch = correctPairsMap.get(term);
            
            if (userMatch === correctMatch) return `${baseClass} bg-green-500/50 border-green-400`;
            return `${baseClass} bg-red-500/50 border-red-400 opacity-70`;
        }
        
        if (isMatched) {
            const term = side === 'left' ? item : definitionToTermMap.get(item)!;
            const color = pairColors.get(term);
            return `${baseClass} ${color?.bg} ${color?.border}`;
        }

        if (isSelected) {
            return `${baseClass} bg-green-400/90 border-green-300 scale-105 ring-2 ring-green-200`;
        }
        
        return `${baseClass} bg-black/20 hover:bg-black/40 border-slate-600 ${shakeClass}`;
    };

    return (
        <>
            <div className="question-text-container">
                 <div className="question-text">{question.question || "Aşağıdaki ifadeleri doğru şekilde eşleştirin."}</div>
            </div>
            <div 
                ref={containerRef} 
                className="flex-grow w-full flex p-2 gap-2"
            >
                <div className="flex-1 grid gap-2" style={{ gridTemplateRows: `repeat(${question.pairs.length}, 1fr)`}}>
                    {leftItems.map(term => (
                        <button key={term} onClick={() => handleLeftClick(term)} disabled={isAnswered} className={getItemClass(term, 'left')}>
                            <span className="p-1">{term}</span>
                        </button>
                    ))}
                </div>
                <div className="flex-1 grid gap-2" style={{ gridTemplateRows: `repeat(${question.pairs.length}, 1fr)`}}>
                    {rightItems.map(definition => (
                        <button key={definition} onClick={() => handleRightClick(definition)} disabled={isAnswered || !selectedLeft || Object.values(matches).includes(definition)} className={getItemClass(definition, 'right')}>
                            <span className="p-1">{definition}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            <style>{`
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-6px); }
                    75% { transform: translateX(6px); }
                }
            `}</style>
        </>
    );
};


