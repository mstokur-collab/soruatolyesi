import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { QuizQuestion } from '../types';
import { Modal } from './UI';
import { useKapismaAudio, AnimatedScore, kapismaSharedStyles } from './kapisma_helpers/KapismaUI';
import { KapismaVSScreen } from './kapisma_helpers/KapismaVSScreen';
import { KapismaQuestionScreen } from './kapisma_helpers/KapismaQuestionScreen';
import { useGame, useData } from '../contexts/AppContext';

const KapismaGame: React.FC = () => {
    const { gameQuestions, settings, handleGameEnd: onGameEnd } = useGame();
    const { handleQuestionAnswered } = useData(); // Record individual answers for stats
    const questions = gameQuestions as QuizQuestion[];
    const navigate = useNavigate();

    const [screen, setScreen] = useState<'intro' | 'vs' | 'question'>('intro');
    const [scores, setScores] = useState({ a: 0, b: 0 });
    const [questionIndex, setQuestionIndex] = useState(0);
    const [playerA, setPlayerA] = useState<number | null>(null);
    const [playerB, setPlayerB] = useState<number | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<{ team: 'a' | 'b'; option: string } | null>(null);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isMatching, setIsMatching] = useState(false);

    const audio = useKapismaAudio();

    const [animation, setAnimation] = useState({
        active: false,
        startPos: { x: 0, y: 0 },
        targetPos: { x: 0, y: 0 },
    });
    const scoreARef = useRef<HTMLDivElement>(null);
    const scoreBRef = useRef<HTMLDivElement>(null);
    
    const teamACount = settings.teamACount || 1;
    const teamBCount = settings.teamBCount || 1;
    const currentQuestion = questions[questionIndex];

    const matchPlayers = useCallback(() => {
        const nextPlayerA = Math.floor(Math.random() * teamACount) + 1;
        const nextPlayerB = Math.floor(Math.random() * teamBCount) + 1;
        setPlayerA(nextPlayerA);
        setPlayerB(nextPlayerB);
    }, [teamACount, teamBCount]);
    
    const startRoundAnimation = () => {
        setIsMatching(true);
        setPlayerA(null);
        setPlayerB(null);
        setScreen('vs');
        
        setTimeout(() => {
            matchPlayers();
            setIsMatching(false);
        }, 3000);
    };

    const handleStartMatch = () => {
        startRoundAnimation();
    };

    const handleGoToQuestion = () => {
        setSelectedAnswer(null);
        setScreen('question');
    };

    const handleAnswer = (team: 'a' | 'b', option: string, event: React.MouseEvent<HTMLButtonElement>) => {
        if (selectedAnswer) return;

        setSelectedAnswer({ team, option });

        const isCorrect = option === currentQuestion.answer;
        isCorrect ? audio.playCorrect() : audio.playIncorrect();

        const winningTeam = isCorrect ? team : (team === 'a' ? 'b' : 'a');
        
        const targetRef = winningTeam === 'a' ? scoreARef : scoreBRef;
        const targetRect = targetRef.current?.getBoundingClientRect();

        if (targetRect) {
            audio.playScore();
            setAnimation({
                active: true,
                startPos: { x: event.clientX, y: event.clientY },
                targetPos: { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 },
            });
        }
    };
    
    const onAnimationEndFunc = () => {
        const team = selectedAnswer!.team;
        const isCorrect = selectedAnswer!.option === currentQuestion.answer;
        const winningTeam = isCorrect ? team : (team === 'a' ? 'b' : 'a');
        
        // Record the answer for the AI coach statistics
        handleQuestionAnswered(currentQuestion, isCorrect);

        const newScores = {
            a: scores.a + (winningTeam === 'a' ? 100 : 0),
            b: scores.b + (winningTeam === 'b' ? 100 : 0),
        };
        setScores(newScores);
        setAnimation(prev => ({ ...prev, active: false }));

        setTimeout(() => {
            if (questionIndex < questions.length - 1) {
                setQuestionIndex(prev => prev + 1);
                startRoundAnimation();
            } else {
                onGameEnd(0, undefined, { grup1: newScores.a, grup2: newScores.b });
                navigate('/sonuc');
            }
        }, 500);
    };
    
    const handleMainMenu = () => {
        setShowEndConfirm(true);
    }
    
    const confirmEndGame = () => {
        // FIX: Changed newScores.b to scores.b as newScores is not in scope here.
        onGameEnd(0, undefined, { grup1: scores.a, grup2: scores.b });
        navigate('/sonuc');
    }
    
    const toggleFullScreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    if (!currentQuestion) {
        return <div className="w-full h-full flex justify-center items-center">Sorular yüklenemedi.</div>;
    }

    return (
        <div className="w-full h-full font-sans">
            <style>{kapismaSharedStyles}</style>
            
            {screen === 'intro' && <KapismaVSScreen isIntro={true} playerA={null} playerB={null} onStartMatch={handleStartMatch} onGoToQuestion={() => {}} audio={audio} />}
            {screen === 'vs' && <KapismaVSScreen 
                isIntro={false}
                isMatching={isMatching}
                playerA={playerA}
                playerB={playerB}
                teamACount={teamACount}
                teamBCount={teamBCount}
                onStartMatch={() => {}} 
                onGoToQuestion={handleGoToQuestion}
                audio={audio}
            />}
            {screen === 'question' && <KapismaQuestionScreen 
                question={currentQuestion}
                scores={scores}
                playerA={playerA}
                playerB={playerB}
                questionIndex={questionIndex}
                totalQuestions={questions.length}
                onAnswer={handleAnswer}
                selectedAnswer={selectedAnswer}
                onMainMenu={handleMainMenu}
                onSettingsClick={() => setShowSettings(true)}
                onToggleFullscreen={toggleFullScreen}
                scoreRefA={scoreARef}
                scoreRefB={scoreBRef}
                audio={audio}
            />}

            <AnimatedScore 
                isAnimating={animation.active}
                startPos={animation.startPos}
                targetPos={animation.targetPos}
                onAnimationEnd={onAnimationEndFunc}
                text="+100"
            />
            <Modal
                isOpen={showEndConfirm}
                title="Oyundan Çık"
                message="Kapışmadan çıkmak ve mevcut skorlarla oyunu bitirmek istediğinizden emin misiniz?"
                onConfirm={confirmEndGame}
                onCancel={() => setShowEndConfirm(false)}
            />
            {showSettings && (
                 <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 animate-fadeIn">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center w-full max-w-md relative">
                        <button onClick={() => { audio.playClick(); setShowSettings(false); }} className="absolute top-4 right-4 text-2xl text-slate-400 hover:text-white">&times;</button>
                        <h3 className="text-3xl font-bold mb-6">Ayarlar</h3>
                        <div className="space-y-4 text-left">
                            <label className="flex justify-between items-center text-xl p-3 bg-slate-800 rounded-lg">
                                <span>🎶 Müzik</span>
                                 <div className="relative inline-block w-12 h-6 bg-slate-700 rounded-full cursor-pointer">
                                    <input type="checkbox" className="absolute opacity-0 w-0 h-0 peer"/>
                                    <span className="absolute top-0 left-0 w-full h-full rounded-full transition-colors peer-checked:bg-purple-600"></span>
                                    <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-6"></span>
                                </div>
                            </label>
                             <label className="flex justify-between items-center text-xl p-3 bg-slate-800 rounded-lg">
                                <span>🔊 Ses Efektleri</span>
                                 <div className="relative inline-block w-12 h-6 bg-slate-700 rounded-full cursor-pointer">
                                    <input type="checkbox" className="absolute opacity-0 w-0 h-0 peer" defaultChecked/>
                                    <span className="absolute top-0 left-0 w-full h-full rounded-full transition-colors peer-checked:bg-purple-600"></span>
                                    <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-6"></span>
                                </div>
                            </label>
                        </div>
                        <button onClick={() => { audio.playClick(); setShowSettings(false); }} className="mt-8 px-10 py-3 text-xl font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg shadow-lg transition-transform hover:scale-105">
                            Kapat
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KapismaGame;