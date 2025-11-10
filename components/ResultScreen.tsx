import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/AppContext';
import { Button } from './UI';
import type { Question, QuizQuestion, FillInQuestion, MatchingQuestion } from '../types';

const ReviewQuestionCard: React.FC<{
    question: Question;
    answerState: { selected: any; isCorrect: boolean } | undefined;
    index: number;
}> = ({ question, answerState, index }) => {

    const renderDetails = () => {
        const isCorrect = answerState?.isCorrect ?? false;
        const selected = answerState?.selected;
        const correctAnswer = (question as any).answer;

        switch (question.type) {
            case 'quiz':
                const q = question as QuizQuestion;
                return (
                    <div className="space-y-1 mt-2 text-sm">
                        {q.options.map((opt) => {
                            let classes = 'text-slate-300';
                            const isThisCorrect = opt === correctAnswer;
                            const wasThisSelected = opt === selected;

                            if (isThisCorrect) {
                                // The correct answer is always green.
                                classes = 'text-green-400 font-semibold';
                            } else if (wasThisSelected && !isCorrect) {
                                // If this option is NOT the correct one, but the user selected it, make it red.
                                classes = 'text-red-400 line-through';
                            }
                            // Otherwise, it's an unselected incorrect option, so it stays slate.
                            
                            return <p key={opt} className={classes}>{opt}</p>;
                        })}
                    </div>
                );
            // Diğer soru tipleri için benzer render'lar eklenebilir
            default:
                return (
                     <div className="space-y-1 mt-2 text-sm">
                        <p className="text-slate-300">Seçiminiz: <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>{selected?.toString() || 'Boş'}</span></p>
                        {!isCorrect && <p className="text-slate-300">Doğru Cevap: <span className="text-green-400">{correctAnswer}</span></p>}
                    </div>
                )
        }
    };

    return (
        <div className="bg-slate-800/70 p-4 rounded-lg border border-slate-700 animate-fadeIn w-full">
            <div className="flex justify-between items-start">
                <p className="font-semibold text-slate-200 flex-grow pr-4">
                    <span className="mr-2">{index + 1}.</span>
                    {(question as any).question || (question as any).sentence || "Eşleştirme Sorusu"}
                </p>
                <span className={`font-bold text-lg ${answerState?.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {answerState?.isCorrect ? '✓ DOĞRU' : '✗ YANLIŞ'}
                </span>
            </div>
            {renderDetails()}
            {(question as QuizQuestion).explanation && (
                 <p className="text-xs text-slate-400 pt-2 border-t border-slate-600 mt-2">
                    <span className="font-bold">Açıklama:</span> {(question as QuizQuestion).explanation}
                </p>
            )}
        </div>
    );
};


const ResultScreen: React.FC = () => {
    const navigate = useNavigate();
    const { score, finalGroupScores, lastGameQuestions, lastGameAnswers, settings, updateSetting } = useGame();
    const [showReview, setShowReview] = useState(false);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

    const stats = useMemo(() => {
        if (!lastGameQuestions) return { total: 0, correct: 0, incorrect: 0, successRate: 0 };
        
        const total = lastGameQuestions.length;
        const correct = Object.values(lastGameAnswers || {}).filter((a: any) => a.isCorrect).length;
        const incorrect = total - correct;
        const successRate = total > 0 ? (correct / total) * 100 : 0;
        
        return { total, correct, incorrect, successRate };
    }, [lastGameQuestions, lastGameAnswers]);

    const handlePlayAgain = () => {
        navigate('/oyun');
    };

    const renderSummaryView = () => (
        <>
            <header className="flex flex-col items-center text-center mt-12 mb-8 animate-fadeIn">
                <p className="text-2xl text-slate-300">Harika İş!</p>
                <h1 className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 my-2" style={{ textShadow: '0 0 20px rgba(252, 211, 77, 0.3)'}}>{score}</h1>
                <p className="text-3xl font-bold text-slate-100">Puan</p>
            </header>

            <div className="grid grid-cols-3 gap-4 text-center bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-8 animate-slideIn">
                <div>
                    <p className="text-4xl font-bold text-teal-400">{stats.total}</p>
                    <p className="text-sm text-slate-400">Toplam Soru</p>
                </div>
                <div>
                    <p className="text-4xl font-bold text-green-400">{stats.correct}</p>
                    <p className="text-sm text-slate-400">Doğru</p>
                </div>
                <div>
                    <p className="text-4xl font-bold text-red-400">{stats.incorrect}</p>
                    <p className="text-sm text-slate-400">Yanlış</p>
                </div>
            </div>
            
            <div className="flex flex-col gap-4 animate-slideIn" style={{ animationDelay: '100ms' }}>
                <Button onClick={() => { setShowReview(true); setCurrentReviewIndex(0); }} variant="primary" className="w-full">Cevapları Gözden Geçir</Button>
                <div className="flex gap-4">
                    <Button onClick={() => navigate('/ana-sayfa')} variant="secondary" className="w-full">Ana Menü</Button>
                    <Button onClick={handlePlayAgain} variant="success" className="w-full">Tekrar Oyna</Button>
                </div>
            </div>
        </>
    );

    const renderReviewView = () => {
        if (!lastGameQuestions) return null;
        
        return (
            <div className="w-full flex flex-col items-center gap-4 mt-8 animate-fadeIn">
                <div className="flex justify-between items-center w-full mb-2">
                    <h2 className="text-2xl font-bold">Cevapları İncele</h2>
                    <Button onClick={() => setShowReview(false)} className="!py-1 !px-4 !text-base">Özete Dön</Button>
                </div>
                
                <div className="flex flex-wrap justify-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                    {lastGameQuestions.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentReviewIndex(index)}
                            className={`w-8 h-8 rounded-full font-bold text-sm transition-all flex items-center justify-center
                                ${ (lastGameAnswers || {})[index]?.isCorrect ? 'bg-green-500/80' : 'bg-red-500/80' }
                                ${ index === currentReviewIndex ? 'ring-2 ring-yellow-400 scale-110' : 'hover:scale-110' }
                            `}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>

                <div className="w-full my-4">
                   <ReviewQuestionCard 
                        key={currentReviewIndex}
                        question={lastGameQuestions[currentReviewIndex]} 
                        answerState={(lastGameAnswers || {})[currentReviewIndex]}
                        index={currentReviewIndex}
                    />
                </div>

                <div className="flex justify-between items-center w-full">
                    <Button onClick={() => setCurrentReviewIndex(p => p - 1)} disabled={currentReviewIndex === 0}>← Önceki</Button>
                    <span className="font-semibold">{currentReviewIndex + 1} / {lastGameQuestions.length}</span>
                    <Button onClick={() => setCurrentReviewIndex(p => p + 1)} disabled={currentReviewIndex === lastGameQuestions.length - 1}>Sonraki →</Button>
                </div>
            </div>
        );
    };

    if (!lastGameQuestions) {
        return (
            <div className="w-full h-full flex flex-col justify-center items-center text-center p-4">
                <h2 className="text-2xl font-bold mb-4">Sonuç verisi bulunamadı.</h2>
                <Button onClick={() => navigate('/ana-sayfa')} variant="primary">Ana Menü'ye Dön</Button>
            </div>
        );
    }
    
    if(finalGroupScores) {
        const winner = finalGroupScores.grup1 > finalGroupScores.grup2 ? 'Grup 1' : (finalGroupScores.grup2 > finalGroupScores.grup1 ? 'Grup 2' : null);
        const isTie = winner === null;
        return (
             <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 mb-4">
                    {isTie ? "Berabere!" : `${winner} Kazandı!`}
                </h1>
                <div className="flex items-center gap-8 my-8">
                    <div className="text-center">
                        <p className="text-2xl text-slate-300">Grup 1</p>
                        <p className="text-6xl font-bold text-teal-400">{finalGroupScores.grup1}</p>
                    </div>
                     <div className="text-center">
                        <p className="text-2xl text-slate-300">Grup 2</p>
                        <p className="text-6xl font-bold text-rose-400">{finalGroupScores.grup2}</p>
                    </div>
                </div>
                 <div className="flex gap-4">
                    <Button onClick={() => navigate('/ana-sayfa')}>Ana Menü</Button>
                    <Button onClick={() => navigate('/kapisma-kurulum')} variant="primary">Yeni Kapışma</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col items-center p-4 sm:p-6">
            <div className="w-full max-w-3xl mx-auto flex flex-col">
                {showReview ? renderReviewView() : renderSummaryView()}
            </div>
        </div>
    );
};

export default ResultScreen;