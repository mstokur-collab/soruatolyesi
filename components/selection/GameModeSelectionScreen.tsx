import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGame } from '../../contexts/AppContext';

const GameModeTitleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.82m5.84-2.56a16.5 16.5 0 0 0-1.62-7.024l-2.16 1.96m-4.24-7.38a16.5 16.5 0 0 0-7.024 1.62l1.96 2.16" />
      <path d="M2.25 12a10.5 10.5 0 0 1 10.5-10.5c.376 0 .744.025 1.11.072l-1.528 1.351a4.5 4.5 0 0 0-6.364 6.364l1.351-1.528A10.5 10.5 0 0 1 2.25 12Z" />
      <path d="m15.59 14.37 5.337 5.337a1.5 1.5 0 0 1-2.121 2.122l-5.338-5.337m5.84-2.56a4.5 4.5 0 0 0-6.363-6.363l-1.351 1.528a4.5 4.5 0 0 0 6.363 6.363l1.351-1.528Z" />
    </svg>
);
const QuizIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);
const FillInIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
);
const MatchingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
);
const KapismaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.375 12.375 0 0110.5 21.75c-2.596 0-4.92-1.004-6.683-2.662z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.023 15.75a12.006 12.006 0 001.28 4.48" />
    </svg>
);

const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6">
      {children}
    </div>
);

const GameModeSelectionScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userType, isDevUser } = useAuth();
    const { getQuestionsForCriteria, settings, updateSetting } = useGame();
    const { difficulty: _prevDifficulty, ...settingsWithoutDifficulty } = settings;

    const getCount = (criteria: Partial<import('../../types').GameSettings>) => getQuestionsForCriteria(criteria).length;

    return (
        <RouteWrapper>
            <div className="selection-container">
                <button onClick={() => navigate(-1)} className="back-button-yellow">← Geri</button>
                <h2 className="selection-title">
                    <GameModeTitleIcon />
                    <span>Oyun Türünü Seçin</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(['quiz', 'fill-in', 'matching', 'kapisma'] as const).map(mode => {
                        const count = getCount({ ...settingsWithoutDifficulty, gameMode: mode === 'kapisma' ? 'quiz' : mode });
                        const details = {
                            quiz: { name: 'Çoktan Seçmeli', desc: 'Verilen soruya karşı sunulan seçeneklerden doğru olanı bulun.', icon: <QuizIcon />, nextScreen: '/zorluk-sec' },
                            'fill-in': { name: 'Boşluk Doldurma', desc: 'Cümledeki boşluğa en uygun ifadeyi seçenekler arasından seçin.', icon: <FillInIcon />, nextScreen: '/zorluk-sec' },
                            matching: { name: 'Eşleştirme', desc: 'İlgili kavramları ve açıklamalarını doğru şekilde bir araya getirin.', icon: <MatchingIcon />, nextScreen: '/zorluk-sec' },
                            kapisma: { name: 'Kapışma', desc: 'İki takım aynı anda yarışır, hızlı ve doğru olan kazanır.', icon: <KapismaIcon />, nextScreen: '/kapisma-kurulum' },
                        }[mode];
                        
                        const handleClick = () => {
                            updateSetting('gameMode', mode);
                            navigate(details.nextScreen);
                        };

                        return (
                            <button 
                                key={mode} 
                                onClick={handleClick} 
                                disabled={count === 0 && userType === 'authenticated' && !isDevUser}
                                className={`selection-card ${(count === 0 && isDevUser) ? 'opacity-50' : ''}`}
                            >
                                <span className="selection-card__count">{count > 0 || userType === 'guest' ? count : 'Yok'}</span>
                                <div className="selection-card__icon">{details.icon}</div>
                                <h3 className="selection-card__title">{details.name}</h3>
                                <p className="selection-card__description">{details.desc}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </RouteWrapper>
    );
};

export default GameModeSelectionScreen;
