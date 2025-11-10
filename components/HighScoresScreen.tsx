import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/AppContext';

const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6">
      {children}
    </div>
);

const HighScoresScreen: React.FC = () => {
    const navigate = useNavigate();
    const { highScores } = useData();

    return (
        <RouteWrapper>
            <div className="selection-container w-full max-w-2xl">
                <button onClick={() => navigate(-1)} className="back-button-yellow">← Geri</button>
                <h2 className="selection-title">
                    <span className="text-yellow-400 text-4xl">🏆</span>
                    <span>Yüksek Skorlar</span>
                </h2>
                <div className="mt-6 w-full max-h-[60vh] overflow-y-auto pr-2">
                    {highScores.length > 0 ? (
                        <ul className="space-y-3 text-left">
                            {highScores.map((score, index) => (
                                <li key={index} className="flex items-center justify-between p-4 bg-slate-800/60 rounded-xl border border-slate-700 text-lg animate-slideIn" style={{ animationDelay: `${index * 50}ms`}}>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-bold text-2xl w-8 text-center ${index < 3 ? 'text-yellow-400' : 'text-slate-400'}`}>{index + 1}.</span>
                                        <span className="font-semibold text-slate-200">{score.name}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="font-bold text-2xl text-yellow-300">{score.score} Puan</span>
                                        <span className="text-xs text-slate-400">{new Date(score.date).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-400 text-center py-10">Henüz kaydedilmiş yüksek skor yok.</p>
                    )}
                </div>
            </div>
        </RouteWrapper>
    );
};

export default HighScoresScreen;
