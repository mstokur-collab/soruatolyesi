import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGame } from '../../contexts/AppContext';

const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6">
      {children}
    </div>
);

const GradeSelectionScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userType, isDevUser } = useAuth();
    const { updateSetting, getQuestionsForCriteria, selectedSubjectId } = useGame();

    const getCount = (criteria: Partial<import('../../types').GameSettings>) => getQuestionsForCriteria(criteria).length;

    return (
        <RouteWrapper>
            <div className="grade-selection-container">
                <button onClick={() => navigate('/ders-sec')} className="back-button-yellow">← Geri</button>
                <h2 className="grade-selection-title">Sınıfını Seç</h2>
                <div className="grade-buttons-wrapper">
                    {[5, 6, 7, 8, 9, 10, 11, 12].map((grade, index) => {
                        const count = getCount({ grade });
                        const colorClass = `color-${(index % 4) + 1}`;
                        const nextPath = selectedSubjectId === 'paragraph' ? '/zorluk-sec' : '/ogrenme-alani-sec';
                        return (
                            <button 
                                key={grade} 
                                onClick={() => { updateSetting('grade', grade); navigate(nextPath); }}
                                disabled={count === 0 && userType === 'authenticated' && !isDevUser}
                                className={`grade-button ${colorClass} ${(count === 0 && isDevUser) ? 'opacity-50' : ''}`}
                            >
                                <span className='grade-button__text'>{grade}.</span>
                                <span className='grade-button__subtext'>Sınıf</span>
                                <span className="grade-button__count">{count > 0 || userType === 'guest' ? `${count} Soru` : 'Yok'}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </RouteWrapper>
    );
};

export default GradeSelectionScreen;
