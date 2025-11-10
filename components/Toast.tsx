import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef, PropsWithChildren } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  isVisible: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// FIX: Aligned component definition with AppProvider by using a plain function with inline prop types instead of React.FC. This can resolve obscure type inference issues with nested providers.
// FIX: The previous fix using a plain function was insufficient. Reverting to React.FC with the explicit PropsWithChildren utility type to resolve an obscure type inference error with nested providers.
export const ToastProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', isVisible: false });
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast({ message, type, isVisible: true });
    timerRef.current = window.setTimeout(() => {
      setToast(prev => ({ ...prev, isVisible: false }));
    }, 4000);
  }, []);

  const hideToast = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast(prev => ({ ...prev, isVisible: false }));
  };
  
  const typeClasses = {
    success: 'bg-green-600/90 border-green-500/50',
    error: 'bg-red-600/90 border-red-500/50',
    info: 'bg-blue-600/90 border-blue-500/50',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.isVisible && (
        <div 
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg text-white font-semibold backdrop-blur-md border shadow-2xl flex items-center gap-4 transition-all duration-300 ${toast.isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} ${typeClasses[toast.type]}`}
          role="alert"
          aria-live="assertive"
        >
          <span>{toast.message}</span>
          <button onClick={hideToast} aria-label="Kapat" className="font-bold text-xl leading-none opacity-70 hover:opacity-100">&times;</button>
        </div>
      )}
    </ToastContext.Provider>
  );
};
