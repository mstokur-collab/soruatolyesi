import React, { useState } from 'react';
import { useAuth } from '../contexts/AppContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'violet' | 'ai' | 'duel';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = 'text-white border border-white/20 rounded-2xl px-8 py-4 text-xl sm:text-2xl font-semibold shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none';
  
  const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-teal-600/90 hover:bg-teal-500/90 shadow-teal-500/40',
    secondary: 'bg-rose-500/80 hover:bg-rose-400/90 shadow-rose-500/30',
    success: 'bg-emerald-500/80 hover:bg-emerald-400/90 shadow-emerald-500/30',
    warning: 'bg-yellow-500/90 hover:bg-yellow-400/90 shadow-yellow-500/40 text-slate-900 font-bold',
    violet: 'bg-violet-600/90 hover:bg-violet-500/90 shadow-violet-500/40',
    ai: 'bg-gradient-to-br from-[#0b1b3c] via-[#123f61] to-[#36e0b8] text-white font-bold rounded-[32px] shadow-[0_22px_55px_rgba(5,28,63,0.65)] border border-cyan-200/30 hover:from-[#13274a] hover:via-[#185275] hover:to-[#4ff6cf] hover:shadow-[0_28px_65px_rgba(54,224,184,0.55)] focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
    duel: 'bg-gradient-to-br from-[#2b0f6b] via-[#551b78] to-[#c81c56] text-white font-black rounded-[36px] shadow-[0_26px_60px_rgba(43,15,107,0.6)] border border-fuchsia-200/30 hover:from-[#381885] hover:via-[#6d1f84] hover:to-[#e02462] hover:shadow-[0_32px_70px_rgba(200,28,86,0.55)]',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 animate-fadeIn">
      <div className="bg-slate-800/50 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl text-center w-full max-w-md animate-slideIn">
        <h3 className="text-2xl font-bold mb-4">{title}</h3>
        <div className="text-slate-200 mb-6">{message}</div>
        <div className="flex gap-4 justify-center">
          <Button onClick={onCancel} variant="secondary" className="px-6 py-2 text-lg">Hayır</Button>
          <Button onClick={onConfirm} variant="primary" className="px-6 py-2 text-lg">Evet</Button>
        </div>
      </div>
    </div>
  );
};

interface InfoModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 animate-fadeIn">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 backdrop-blur-xl border border-violet-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-violet-800/40 text-left w-full max-w-lg animate-slideIn">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-violet-500/50 rounded-full blur-lg"></div>
        <h3 className="text-3xl font-bold mb-4 text-center text-violet-300 flex items-center justify-center gap-2">{title}</h3>
        <div className="text-slate-200 mb-8 space-y-4 welcome-modal-content">{children}</div>
        <div className="flex justify-center">
          <Button onClick={onClose} variant="violet" className="px-10 py-3 !text-xl">Tamam</Button>
        </div>
      </div>
    </div>
  );
};


export const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} className="absolute top-6 left-6 bg-amber-400/80 hover:bg-amber-300/90 text-slate-900 font-bold px-4 py-2 rounded-xl backdrop-blur-md transition-transform hover:scale-105 shadow-lg z-10">
      ← Geri
    </button>
);

export const DeveloperSignature: React.FC = () => {
    return (
        <div className="w-full px-4 py-6 text-center text-xs text-indigo-300 sm:absolute sm:bottom-4 sm:right-6 sm:w-auto sm:px-0 sm:py-0 sm:text-right sm:text-sm">
            <h3 className="font-medium uppercase tracking-wide">Program Geliştiricisi</h3>
            <p className="text-cyan-300 font-bold text-base tracking-wide sm:text-lg">
                MUSTAFA OKUR
            </p>
        </div>
    );
};

type AiBadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface AiBadgeProps {
  label?: string;
  size?: AiBadgeSize;
  withSparkle?: boolean;
  className?: string;
  gradientClass?: string;
}

const aiBadgeSizeMap: Record<AiBadgeSize, string> = {
  xs: 'text-[0.65rem] sm:text-xs',
  sm: 'text-sm sm:text-base',
  md: 'text-base sm:text-xl',
  lg: 'text-xl sm:text-3xl',
};

export const AiBadge: React.FC<AiBadgeProps> = ({
  label = 'AI',
  size = 'md',
  withSparkle = true,
  className = '',
  gradientClass,
}) => {
  const badgeGradient =
    gradientClass ?? 'bg-gradient-to-r from-sky-300 via-emerald-300 to-rose-300';

  return (
    <span
      className={`relative inline-flex items-center font-black uppercase tracking-tight ${aiBadgeSizeMap[size]} ${className}`}
    >
      <span className="relative inline-flex px-1">
        <span
          className={`relative z-10 ${badgeGradient} bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(16,185,129,0.65)]`}
        >
          {label}
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 -z-10 rounded-full bg-gradient-to-r from-sky-400/30 via-emerald-400/25 to-rose-400/30 blur-lg"
        />
      </span>
      {withSparkle && (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="ml-1 h-4 w-4 text-cyan-100 drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]"
        >
          <path
            fill="currentColor"
            d="M12 3l1.4 4.3 4.3 1.4-4.3 1.4L12 14l-1.4-3.9-4.3-1.4 4.3-1.4z"
          />
        </svg>
      )}
    </span>
  );
};


export const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center w-full h-full">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-teal-400"></div>
  </div>
);
