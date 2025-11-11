import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGame } from '../../contexts/AppContext';
import GlowButton from '../GlowButton';
const subjectGlowPalette = [
    {
        gradientClass: 'bg-gradient-to-br from-[#0b1e46] via-[#1d4ed8] to-[#3b82f6]',
        borderClass: 'border-slate-100/70',
        ringClass: 'ring-blue-200/60',
        hoverClass: 'hover:ring-blue-100/90 hover:shadow-[0_55px_120px_rgba(59,130,246,0.45)]',
        overlayClass: 'bg-gradient-to-br from-white/25 via-transparent to-white/5',
    },
    {
        gradientClass: 'bg-gradient-to-br from-[#4c0519] via-[#dc2626] to-[#ef4444]',
        borderClass: 'border-rose-200/70',
        ringClass: 'ring-rose-200/60',
        hoverClass: 'hover:ring-rose-100/90 hover:shadow-[0_55px_120px_rgba(239,68,68,0.45)]',
        overlayClass: 'bg-gradient-to-br from-white/35 via-transparent to-white/5',
    },
    {
        gradientClass: 'bg-gradient-to-br from-[#075c43] via-[#16a34a] to-[#22c55e]',
        borderClass: 'border-emerald-200/70',
        ringClass: 'ring-emerald-200/60',
        hoverClass: 'hover:ring-emerald-100/90 hover:shadow-[0_55px_120px_rgba(16,185,129,0.4)]',
        overlayClass: 'bg-gradient-to-br from-white/30 via-transparent to-white/5',
    },
    {
        gradientClass: 'bg-gradient-to-br from-[#7c2d12] via-[#f97316] to-[#fb923c]',
        borderClass: 'border-amber-200/70',
        ringClass: 'ring-amber-200/60',
        hoverClass: 'hover:ring-amber-100/90 hover:shadow-[0_55px_120px_rgba(251,146,60,0.45)]',
        overlayClass: 'bg-gradient-to-br from-white/40 via-transparent to-white/5',
    },
    {
        gradientClass: 'bg-gradient-to-br from-[#4c1d95] via-[#a855f7] to-[#c084fc]',
        borderClass: 'border-fuchsia-200/60',
        ringClass: 'ring-fuchsia-200/60',
        hoverClass: 'hover:ring-fuchsia-100/90 hover:shadow-[0_55px_120px_rgba(192,132,252,0.45)]',
        overlayClass: 'bg-gradient-to-br from-white/40 via-transparent to-white/5',
    },
    {
        gradientClass: 'bg-gradient-to-br from-[#0f172a] via-[#475569] to-[#94a3b8]',
        borderClass: 'border-slate-100/50',
        ringClass: 'ring-slate-200/60',
        hoverClass: 'hover:ring-slate-100/90 hover:shadow-[0_55px_120px_rgba(148,163,184,0.45)]',
        overlayClass: 'bg-gradient-to-br from-white/30 via-transparent to-white/5',
    },
];

const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6">
        {children}
    </div>
);

const SubjectSelectionScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userType, isDevUser } = useAuth();
    const { allSubjects, getSubjectCount, handleSubjectSelect, postSubjectSelectRedirect, setPostSubjectSelectRedirect } = useGame();
    const guestTooltip = userType === 'guest' ? 'Bu özelliği kullanmak için giriş yapmalısınız' : '';

    return (
        <RouteWrapper>
            <div className="grade-selection-container max-w-6xl w-full">
                <button onClick={() => navigate('/ana-sayfa')} className="back-button-yellow">← Ana Sayfa</button>
                <h2 className="grade-selection-title flex items-center justify-center gap-2 text-3xl sm:text-4xl">
                    <span>Soru Çözmek İçin Ders Seç</span>
                </h2>
                <div className="grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
                    {Object.keys(allSubjects).map((id, index) => {
                        const subject = allSubjects[id];
                        const count = getSubjectCount(id);
                        const destination = '/sinif-sec';
                        const palette = subjectGlowPalette[index % subjectGlowPalette.length];
                        const isDisabled = count === 0 && userType === 'authenticated' && !isDevUser;

                        const handleClick = () => {
                            handleSubjectSelect(id);
                            if (postSubjectSelectRedirect) {
                                navigate(postSubjectSelectRedirect);
                                setPostSubjectSelectRedirect(null);
                            } else {
                                navigate(destination);
                            }
                        };

                        return (
                            <GlowButton
                                key={id}
                                onClick={handleClick}
                                gradientClass={palette.gradientClass}
                                borderClass={palette.borderClass}
                                ringClass={palette.ringClass}
                                hoverClass={palette.hoverClass}
                                overlayClass={palette.overlayClass}
                                disabled={isDisabled || userType === 'guest'}
                                title={isDisabled ? 'Bu derste soru bulunmuyor veya erişiminiz yok' : guestTooltip}
                                className="text-left min-h-[180px] sm:min-h-[200px] px-6 py-6 sm:px-8 sm:py-8"
                            >
                                <div className="flex w-full h-full flex-col items-start justify-between gap-4 text-left">
                                    <span className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">{subject.name}</span>
                                    <span className="text-sm sm:text-base font-bold uppercase tracking-wider rounded-full bg-white/25 px-4 py-2 shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
                                        {userType === 'guest' ? 'Demo' : `${count} SORU`}
                                    </span>
                                </div>
                            </GlowButton>
                        );
                    })}
                </div>
            </div>
        </RouteWrapper>
    );
};

export default SubjectSelectionScreen;
