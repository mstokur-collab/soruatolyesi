import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGame } from '../../contexts/AppContext';

const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6">
      {children}
    </div>
);

const KazanımSelectionScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userType, isDevUser } = useAuth();
    const { kazanimlar, getQuestionsForCriteria, settings, updateSetting } = useGame();
    
    const getCount = (criteria: Partial<import('../../types').GameSettings>) => getQuestionsForCriteria(criteria).length;

    return (
        <RouteWrapper>
            <div className="selection-container">
                <button onClick={() => navigate('/ogrenme-alani-sec')} className="back-button-yellow">← Geri</button>
                <h2 className="selection-title">Kazanım Seçin</h2>
                <div className="flex flex-col gap-3 w-full max-w-3xl max-h-[70vh] overflow-y-auto pr-2">
                    {kazanimlar.map(k => {
                        const count = getCount({
                            grade: settings.grade,
                            topic: settings.topic,
                            kazanimId: k.id,
                        });
                        return (
                            <button key={k.id} onClick={() => { updateSetting('kazanimId', k.id); navigate('/oyun-turu-sec'); }} disabled={count === 0 && userType === 'authenticated' && !isDevUser} className={`kazanim-button ${(count === 0 && isDevUser) ? 'opacity-50' : ''}`}>
                                <span className="kazanim-button__text">
                                    <span className="kazanim-button__id">{k.id}</span>
                                    <span> - {k.text}</span>
                                </span>
                                <span className="kazanim-button__count">{count > 0 || userType === 'guest' ? `${count} Soru` : 'Yok'}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </RouteWrapper>
    );
};

export default KazanımSelectionScreen;
