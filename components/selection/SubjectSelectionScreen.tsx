import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGame } from '../../contexts/AppContext';

const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6">
      {children}
    </div>
);

const SubjectSelectionScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userType, isDevUser } = useAuth();
    const { allSubjects, getSubjectCount, handleSubjectSelect, postSubjectSelectRedirect, setPostSubjectSelectRedirect } = useGame();

    return (
        <RouteWrapper>
            <div className="grade-selection-container">
                <button onClick={() => navigate('/ana-sayfa')} className="back-button-yellow">← Ana Sayfa</button>
                <h2 className="grade-selection-title">Dersini Seç</h2>
                <div className="grade-buttons-wrapper subject-selection-grid">
                    {Object.keys(allSubjects).map((id, index) => {
                    const subject = allSubjects[id];
                    const count = getSubjectCount(id);
                    const colorClass = `color-${(index % 6) + 1}`;
                    const destination = '/sinif-sec';
                    return (
                        <button 
                            key={id} 
                            onClick={() => {
                                handleSubjectSelect(id);
                                if (postSubjectSelectRedirect) {
                                    navigate(postSubjectSelectRedirect);
                                    setPostSubjectSelectRedirect(null);
                                } else {
                                    navigate(destination);
                                }
                            }}
                            disabled={count === 0 && userType === 'authenticated' && !isDevUser}
                            className={`subject-button ${colorClass} ${(count === 0 && isDevUser) ? 'opacity-50' : ''}`}
                        >
                            <span className="subject-button__name">{subject.name}</span>
                            <span className="subject-button__count">
                            {userType === 'guest' ? 'Demo' : `${count} Soru`}
                            </span>
                        </button>
                    );
                    })}
                </div>
            </div>
        </RouteWrapper>
    );
};

export default SubjectSelectionScreen;
