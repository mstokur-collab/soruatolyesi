import React, { useEffect } from 'react';
import { useKapismaAudio } from './KapismaUI';
import { useShufflingNumber } from './useShufflingNumber';

export const KapismaVSScreen = ({
  isIntro,
  isMatching,
  playerA,
  playerB,
  teamACount,
  teamBCount,
  onStartMatch,
  onGoToQuestion,
  audio
}: {
  isIntro: boolean;
  isMatching?: boolean;
  playerA: number | null;
  playerB: number | null;
  teamACount?: number;
  teamBCount?: number;
  onStartMatch: () => void;
  onGoToQuestion: () => void;
  audio: ReturnType<typeof useKapismaAudio>;
}) => {
    const displayPlayerA = useShufflingNumber(isMatching || false, teamACount || 1, playerA);
    const displayPlayerB = useShufflingNumber(isMatching || false, teamBCount || 1, playerB);

    useEffect(() => {
        if(isMatching) {
            audio.startShuffle();
        } else {
            audio.stopShuffle();
        }
        return () => audio.stopShuffle();
    }, [isMatching, audio]);

    const handleStartClick = () => {
        audio.playClick();
        onStartMatch();
    };

    const handleGoToQuestionClick = () => {
        audio.playClick();
        onGoToQuestion();
    }

    return (
        <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6 kapisma-bg">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
            <div className="relative z-10 flex flex-col items-center animate-fadeIn">
                <h2 className="text-4xl font-bold text-white tracking-widest">
                    <span className="text-violet-400">⚡</span> EŞLEŞTİRME HAZIR! <span className="text-violet-400">⚡</span>
                </h2>
                <p className="text-xl text-slate-300 mt-2">Kapışmaya hazır ol!</p>
                
                <div className="flex items-center justify-center my-12 w-full max-w-2xl">
                    <div className="flex flex-col items-center">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 bg-teal-600 rounded-full flex items-center justify-center text-6xl font-extrabold shadow-2xl border-4 border-teal-400">
                            {isIntro ? '?' : displayPlayerA}
                        </div>
                        <p className="mt-4 text-2xl font-semibold">Takım A</p>
                    </div>
                    <div className="text-8xl sm:text-9xl font-black text-violet-400 mx-8 sm:mx-16" style={{textShadow: '0 5px 20px rgba(0,0,0,0.5)'}}>VS</div>
                    <div className="flex flex-col items-center">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 bg-rose-600 rounded-full flex items-center justify-center text-6xl font-extrabold shadow-2xl border-4 border-rose-400">
                            {isIntro ? '?' : displayPlayerB}
                        </div>
                        <p className="mt-4 text-2xl font-semibold">Takım B</p>
                    </div>
                </div>

                {isIntro ? (
                    <button onClick={handleStartClick} className="px-10 py-4 text-xl font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-full shadow-lg transition-transform hover:scale-105">
                        ⚔️ EŞLEŞTİRMEYE BAŞLA!
                    </button>
                ) : isMatching ? (
                    <div className="px-10 py-4 text-xl font-bold text-white bg-gradient-to-r from-gray-600 to-slate-600 rounded-full shadow-lg animate-pulse">
                        Eşleştiriliyor...
                    </div>
                ) : (
                    <button onClick={handleGoToQuestionClick} className="px-10 py-4 text-xl font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-full shadow-lg transition-transform hover:scale-105">
                        → SORUYA GEÇ!
                    </button>
                )}
            </div>
        </div>
    );
};
