import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { Question, QuizQuestion, FillInQuestion, MatchingQuestion } from '../types';
import { Modal } from './UI';
import { MatchingView } from './quiz_helpers/MatchingView';
import { isOptionMatchingAnswer } from './quiz_helpers/answerUtils';
import { useGame, useData } from '../contexts/AppContext';

// New Hooks
import { useGameTimer } from '../hooks/quiz_hooks/useGameTimer';
import { useJokers } from '../hooks/quiz_hooks/useJokers';
import { useSpeech } from '../hooks/quiz_hooks/useSpeech';
import { useGameAudio } from '../hooks/quiz_hooks/useGameAudio';

// New View Components
import { QuizView } from './quiz_views/QuizView';
import { FillInView } from './quiz_views/FillInView';

interface AnswerState {
  selected: any;
  isCorrect: boolean;
  displayedOptions?: string[];
}

interface GameScreenProps {
  groupNames?: { grup1: string, grup2: string };
}

const GameScreen: React.FC<GameScreenProps> = ({ groupNames }) => {
    const { 
        gameQuestions: questions, 
        settings, 
        handleGameEnd: onGameEnd, 
        selectedSubjectId: subjectId 
    } = useGame();
    const { handleQuestionAnswered } = useData();
    const navigate = useNavigate();
    const { quizMode = 'klasik' } = settings;
    
    // Core Game State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
    const [score, setScore] = useState(0);
    const [groupScores, setGroupScores] = useState({ grup1: 0, grup2: 0 });
    const [streak, setStreak] = useState(0);
    const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
    
    // UI State
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
    const [isTimerActive, setIsTimerActive] = useState(false);

    // FIX: Use a ref to hold a synchronous, up-to-date copy of answers to prevent race conditions on game end.
    const answersRef = useRef<Record<number, AnswerState>>({});

    const isGroupMode = settings.competitionMode === 'grup';
    const totalQuestions = useMemo(() => shuffledQuestions.length, [shuffledQuestions]);
    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    const currentAnswerState = answers[currentQuestionIndex];
    const isAnswered = !!currentAnswerState;

    useEffect(() => {
        const sortedQuestions = quizMode !== 'klasik'
            ? [...questions].sort(() => Math.random() - 0.5)
            : questions;
        setShuffledQuestions(sortedQuestions);
        setCurrentQuestionIndex(0);
        setAnswers({});
        answersRef.current = {}; // Reset ref as well
        setScore(0);
        setStreak(0);
        setGroupScores({grup1: 0, grup2: 0});
    }, [questions, quizMode]);

    const activeGroup = useMemo(() => {
        if (!isGroupMode) return 'grup1';
        return Object.keys(answers).length % 2 === 0 ? 'grup1' : 'grup2';
    }, [isGroupMode, answers]);

    const { grup1: grup1Name = 'Grup 1', grup2: grup2Name = 'Grup 2' } = groupNames || {};

    const { playSound } = useGameAudio();

    const finishGame = useCallback(() => {
        window.speechSynthesis.cancel();
    
        let finalScore = 0;
        if (quizMode === 'zamana-karsi') {
            // FIX: Corrected a TypeScript error where the type of 'a' in the filter function was inferred as 'unknown'.
            finalScore = Object.values(answersRef.current).filter((a: any) => a?.isCorrect).length * 10;
        } else if (quizMode === 'hayatta-kalma') {
            finalScore = streak;
        } else if (isGroupMode) {
            finalScore = Math.max(groupScores.grup1, groupScores.grup2);
        } else {
            finalScore = score;
        }
        
        // FIX: Pass the synchronous ref `answersRef.current` to ensure the final, complete answer list is used.
        // Also pass `shuffledQuestions` to provide a stable snapshot of the questions that were played.
        onGameEnd(finalScore, answersRef.current, isGroupMode ? groupScores : undefined, shuffledQuestions);
        navigate('/sonuc');
    }, [quizMode, streak, score, groupScores, isGroupMode, onGameEnd, navigate, shuffledQuestions]);

    const goToNextQuestion = useCallback(() => {
        setIsTimerActive(false);
        
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            finishGame();
        }
    }, [currentQuestionIndex, totalQuestions, finishGame]);

    const optionsToShow = useMemo(() => {
        if (currentAnswerState?.displayedOptions) return currentAnswerState.displayedOptions;
        if (!currentQuestion) return [];
        if (currentQuestion.type === 'quiz') {
            const q = currentQuestion as QuizQuestion;
            return [...q.options].sort();
        }
        if (currentQuestion.type === 'fill-in') {
            const q = currentQuestion as FillInQuestion;
            return [q.answer, ...q.distractors].sort(() => Math.random() - 0.5);
        }
        return [];
    }, [currentQuestion, currentAnswerState]);

    const handleAnswer = useCallback((isCorrect: boolean, selected: any) => {
        // Prevent re-answering in most modes
        if (answers[currentQuestionIndex] && quizMode !== 'zamana-karsi') {
            return;
        }
        
        setIsTimerActive(false);
        playSound(isCorrect ? 'correct' : 'incorrect');
        
        // Create the new answer state object FIRST
        const newAnswerState: AnswerState = { selected, isCorrect, displayedOptions: optionsToShow };

        // FIX: Use flushSync to ensure state update is applied immediately before any async operations
        // This prevents visual feedback issues on iOS Safari where batched updates may not render immediately
        flushSync(() => {
            setAnswers(prev => ({ ...prev, [currentQuestionIndex]: newAnswerState }));
        });
        answersRef.current = { ...answersRef.current, [currentQuestionIndex]: newAnswerState };
        
        // FIX: Force Safari to reflow/repaint by triggering a style recalculation
        // This ensures CSS classes are immediately applied on iOS Safari
        setTimeout(() => {
            const options = document.querySelectorAll('.option');
            options.forEach(option => {
                // Force reflow by reading offsetHeight
                void (option as HTMLElement).offsetHeight;
            });
        }, 0);
        
        // Note: Answer recording for AI coach statistics is now deferred until game end
        // This improves performance and prevents visual feedback issues on iOS devices
        
        if (quizMode === 'hayatta-kalma') {
            if (isCorrect) {
                setStreak(prev => prev + 1);
            }
        } else if (quizMode !== 'zamana-karsi') { // 'klasik'
            if (isCorrect) {
                const points = 10 + Math.floor(timeLeftRef.current / 2);
                if (isGroupMode) {
                    setGroupScores(prev => ({ ...prev, [activeGroup]: prev[activeGroup] + points }));
                } else {
                    setScore(prev => prev + points);
                }
            }
        }

        if (quizMode === 'hayatta-kalma') {
            setTimeout(isCorrect ? goToNextQuestion : finishGame, 1500);
        } else if (quizMode !== 'zamana-karsi') {
            setTimeout(goToNextQuestion, 2000);
        }
        
    }, [
        currentQuestionIndex,
        currentQuestion,
        quizMode,
        playSound,
        handleQuestionAnswered,
        goToNextQuestion,
        finishGame,
        isGroupMode,
        activeGroup,
        optionsToShow,
        answers, // depends on answers to prevent re-answering
        // timeLeftRef is intentionally omitted as it's a ref
    ]);


    const handleTimeOut = useCallback(() => {
        if (quizMode === 'zamana-karsi') {
            finishGame();
        } else {
            handleAnswer(false, { timedOut: true });
        }
    }, [quizMode, finishGame, handleAnswer]);
    
    const { formattedTime, addTime, timeLeftRef, masterTimeLeft } = useGameTimer({
        quizMode,
        isTimerActive,
        onTimeOut: handleTimeOut,
        playSound: () => playSound('tick'),
        currentQuestion,
        subjectId,
        streak,
        currentQuestionIndex,
    });
    
    const { isSpeechEnabled, toggleSpeech, speak } = useSpeech(() => {
        if (!isAnswered) setIsTimerActive(true);
    });

    useEffect(() => {
        const startSequence = () => {
            if (isSpeechEnabled) {
                speak(currentQuestion, optionsToShow, (currentQuestion as any).question);
            } else if (!isAnswered) {
                setIsTimerActive(true);
            }
        };
        const timerId = setTimeout(startSequence, 500);
        return () => clearTimeout(timerId);
    }, [currentQuestionIndex, isSpeechEnabled, isAnswered, speak, currentQuestion, optionsToShow]);

    const handleSkip = () => {
        // Skipping always counts as an incorrect answer for stats.
        handleAnswer(false, { skipped: true });
    };
    
    const {
        jokers,
        disabledOptions,
        useFiftyFiftyJoker,
        useAddTimeJoker,
        useSkipJoker,
    } = useJokers({
        optionsToShow,
        currentQuestion: currentQuestion as QuizQuestion,
        currentQuestionIndex,
        onSkip: handleSkip,
        onAddTime: addTime,
    });
    
    const isParagraphQuestion = useMemo(() => 
        subjectId === 'paragraph' && currentQuestion?.type === 'quiz' && (currentQuestion as QuizQuestion).question.includes('\n\n'),
    [currentQuestion, subjectId]);

    const renderQuestionContent = () => {
        if (!currentQuestion) return null;

        const onSelectAnswer = (option: string) => {
            if (isAnswered && quizMode !== 'zamana-karsi') return;

            let isCorrect = false;

            if (currentQuestion?.type === 'quiz') {
                isCorrect = isOptionMatchingAnswer(option, currentQuestion as QuizQuestion, optionsToShow);
            } else {
                const answerValue = (currentQuestion as any).answer;
                if (typeof answerValue === 'string') {
                    isCorrect = option.trim().toLocaleLowerCase('tr-TR') === answerValue.trim().toLocaleLowerCase('tr-TR');
                } else {
                    isCorrect = option === answerValue;
                }
            }

            handleAnswer(isCorrect, option);
        };

        switch (currentQuestion.type) {
            case 'quiz':
                return <QuizView 
                    question={currentQuestion as QuizQuestion}
                    options={optionsToShow}
                    isAnswered={isAnswered}
                    answerState={currentAnswerState}
                    disabledOptions={disabledOptions}
                    quizMode={quizMode}
                    onSelectAnswer={onSelectAnswer}
                    onImageClick={setLightboxImageUrl}
                    isParagraphQuestion={isParagraphQuestion}
                    isOptionCorrect={(opt) => isOptionMatchingAnswer(opt, currentQuestion as QuizQuestion, optionsToShow)}
                />;
            case 'fill-in':
                return <FillInView 
                    question={currentQuestion as FillInQuestion}
                    options={optionsToShow}
                    isAnswered={isAnswered}
                    answerState={currentAnswerState}
                    quizMode={quizMode}
                    onSelectAnswer={onSelectAnswer}
                />;
            case 'matching':
                return <MatchingView 
                    key={currentQuestion.id} 
                    question={currentQuestion as MatchingQuestion} 
                    onAnswer={(isCorrect, selected) => handleAnswer(isCorrect, selected)} 
                    answerState={currentAnswerState} 
                    playSound={playSound} 
                />;
            default:
                return <div className="p-4 text-center text-lg text-amber-300">Bilinmeyen soru tipi.</div>;
        }
    };

    const prevDisabled = currentQuestionIndex === 0 || quizMode === 'hayatta-kalma' || (isAnswered && quizMode !== 'zamana-karsi');
    const nextDisabled = useMemo(() => {
        if (quizMode === 'zamana-karsi') {
             return currentQuestionIndex >= totalQuestions - 1;
        }
        if (currentQuestionIndex >= totalQuestions - 1) return !isAnswered;
        if (quizMode === 'hayatta-kalma') return !isAnswered || !currentAnswerState?.isCorrect;
        if (quizMode === 'klasik') return !isAnswered;
        return false;
    }, [currentQuestionIndex, totalQuestions, quizMode, isAnswered, currentAnswerState]);

    const jokerDisabled = isAnswered && quizMode !== 'zamana-karsi';

    return (
        <div className="quiz-container">
            <div className="top-nav">
                <button className="nav-btn" onClick={() => setCurrentQuestionIndex(p => p - 1)} disabled={prevDisabled}>Önceki</button>
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${((currentQuestionIndex + 1) / (totalQuestions || 1)) * 100}%` }}></div>
                </div>
                <button className="nav-btn" onClick={goToNextQuestion} disabled={nextDisabled}>Sonraki</button>
            </div>

            <div className="hud">
                 <div className="timer">{formattedTime}</div>
                <div className="jokers">
                    {currentQuestion?.type === 'quiz' && (
                         <button className="joker-btn" onClick={useFiftyFiftyJoker} disabled={!jokers.fiftyFifty || jokerDisabled}>50:50</button>
                    )}
                    <button className="joker-btn" onClick={useSkipJoker} disabled={!jokers.skip || (quizMode === 'hayatta-kalma' && isAnswered)}>Atla</button>
                    <button className="joker-btn" onClick={useAddTimeJoker} disabled={!jokers.addTime || jokerDisabled}>+15sn</button>
                    <button 
                        onClick={toggleSpeech}
                        className={`joker-btn text-lg ${isSpeechEnabled ? 'bg-green-500/60 border-green-400' : ''}`}
                        aria-label={isSpeechEnabled ? "Sesli okumayı kapat" : "Sesli okumayı aç"}
                        title={isSpeechEnabled ? "Sesli okumayı kapat" : "Sesli okumayı aç"}
                    >
                        🔊
                    </button>
                </div>
                {quizMode === 'hayatta-kalma' ? (
                     <div className="score">Seri: <span>{streak}</span></div>
                ) : isGroupMode ? (
                    <div className="group-scores">
                        <span>{grup1Name}: {groupScores.grup1}</span> | <span>{grup2Name}: {groupScores.grup2}</span>
                    </div>
                ) : (
                    <div className="score">Skor: <span>{quizMode === 'zamana-karsi' ? 
                    // FIX: Corrected a TypeScript error where the type of 'a' in the filter function was inferred as 'unknown'.
                    (Object.values(answers).filter((a: any) => a?.isCorrect).length * 10) : score}</span></div>
                )}
            </div>
            
            <div key={currentQuestionIndex} className="question-card animate-question-transition">
                {renderQuestionContent()}
                <div className="footer">
                   <button className="finish-btn" onClick={() => setShowEndConfirm(true)}>🏁 Yarışmayı Bitir</button>
                </div>
            </div>
            
            {lightboxImageUrl && (
                <div 
                    className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4 cursor-pointer animate-fadeIn" 
                    onClick={() => setLightboxImageUrl(null)}
                >
                    <img 
                        src={`data:image/png;base64,${lightboxImageUrl}`} 
                        alt="Soru görseli - büyütülmüş" 
                        className="max-w-full max-h-full object-contain cursor-default rounded-lg shadow-2xl" 
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}

            <Modal 
                isOpen={showEndConfirm}
                title="Yarışmayı Bitir"
                message="Yarışmayı bitirmek istediğinizden emin misiniz?"
                onConfirm={finishGame}
                onCancel={() => setShowEndConfirm(false)}
            />
        </div>
    );
};

export default GameScreen;
