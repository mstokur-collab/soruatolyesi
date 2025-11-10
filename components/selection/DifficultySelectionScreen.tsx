import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGame } from '../../contexts/AppContext';
import { Difficulty } from '../../types';

const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6">
      {children}
    </div>
);

const DifficultySelectionScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userType, isDevUser } = useAuth();
    const { getQuestionsForCriteria, settings, updateSetting } = useGame();

    const getCount = (criteria: Partial<import('../../types').GameSettings>) => getQuestionsForCriteria(criteria).length;

    return (
        <RouteWrapper>
            <div className="selection-container">
                <button onClick={() => navigate(-1)} className="back-button-yellow">← Geri</button>
                <h2 className="selection-title">Zorluk Seviyesini Seçin</h2>
                <div className="flex flex-col gap-4 w-full max-w-lg">
                    {(['kolay', 'orta', 'zor'] as Difficulty[]).map(level => {
                    const count = getCount({ ...settings, difficulty: level });
                    const handleDifficultySelect = (level: Difficulty) => {
                        updateSetting('difficulty', level);
                        navigate('/oyun');
                    };
                    return (
                        <button key={level} onClick={() => handleDifficultySelect(level)} disabled={count === 0 && userType === 'authenticated' && !isDevUser} className={`list-button ${(count === 0 && isDevUser) ? 'opacity-50' : ''}`}>
                            <span className="list-button__text capitalize">{level}</span>
                            <span className="list-button__count">{count > 0 || userType === 'guest' ? `${count} Soru` : 'Yok'}</span>
                        </button>
                    );
                    })}
                </div>
            </div>
        </RouteWrapper>
    );
};

export default DifficultySelectionScreen;
