import React from 'react';

interface GlowButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    gradientClass: string;
    borderClass: string;
    ringClass: string;
    hoverClass: string;
    textClass?: string;
    overlayClass?: string;
    disabled?: boolean;
    title?: string;
    className?: string;
}

const glowButtonBase =
    'w-full group relative overflow-hidden rounded-[40px] px-5 py-3.5 sm:px-6 sm:py-4 text-center text-base sm:text-lg font-black tracking-tight border shadow-[0_40px_95px_rgba(5,25,45,0.9)] ring-2 transition-all duration-300 min-h-[56px] sm:min-h-[60px] lg:min-h-[64px]';
const glowButtonActive = 'cursor-pointer hover:scale-[1.04]';
const glowButtonDisabled = 'cursor-not-allowed opacity-60';

const GlowButton: React.FC<GlowButtonProps> = ({
    children,
    onClick,
    gradientClass,
    borderClass,
    ringClass,
    hoverClass,
    textClass = 'text-white',
    overlayClass = 'bg-gradient-to-br from-white/35 via-transparent to-white/15',
    disabled = false,
    title,
    className = '',
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-disabled={disabled}
        className={`${glowButtonBase} ${gradientClass} ${borderClass} ${ringClass} ${textClass} ${
            disabled ? glowButtonDisabled : `${glowButtonActive} ${hoverClass}`
        } ${className}`}
    >
        <div className={`pointer-events-none absolute -inset-[2px] rounded-[44px] opacity-60 blur-3xl ${overlayClass}`} />
        <div className="absolute inset-0 opacity-75 blur-[60px] mix-blend-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_transparent_60%)]" />
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(120deg,_rgba(255,255,255,0.4)_0%,_transparent_35%,_transparent_65%,_rgba(255,255,255,0.35)_100%)] animate-pulse" />
        <div className="relative flex items-center justify-center gap-3">{children}</div>
    </button>
);

export default GlowButton;
