import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGame } from '../../contexts/AppContext';

const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6">
      {children}
    </div>
);

const TopicSelectionScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userType, isDevUser } = useAuth();
    const { ogrenmeAlanlari, getQuestionsForCriteria, settings, updateSetting } = useGame();

    const getCount = (criteria: Partial<import('../../types').GameSettings>) => getQuestionsForCriteria(criteria).length;

    return (
        <RouteWrapper>
            <div className="selection-container">
                <button onClick={() => navigate('/sinif-sec')} className="back-button-yellow">← Geri</button>
                <h2 className="selection-title">Öğrenme Alanı Seçin</h2>
                <div className="flex flex-col gap-3 w-full max-w-2xl max-h-[60vh] overflow-y-auto pr-2">
                    {ogrenmeAlanlari.map(oa => {
                        const count = getCount({ grade: settings.grade, topic: oa.name });
                        return (
                            <button key={oa.name} onClick={() => { updateSetting('topic', oa.name); navigate('/kazanim-sec'); }} disabled={count === 0 && userType === 'authenticated' && !isDevUser} className={`list-button ${(count === 0 && isDevUser) ? 'opacity-50' : ''}`}>
                                <span className="list-button__text">{oa.name}</span>
                                <span className="list-button__count">{count > 0 || userType === 'guest' ? `${count} Soru` : 'Yok'}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </RouteWrapper>
    );
};

export default TopicSelectionScreen;
