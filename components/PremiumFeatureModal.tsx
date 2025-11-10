import React from 'react';
import { Button } from './UI';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AppContext';

interface PremiumFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  credits: number;
}

const CREDITS_PER_MINUTE = 10;

const PremiumFeatureModal: React.FC<PremiumFeatureModalProps> = ({ isOpen, onClose, onConfirm, credits }) => {
  const { userType } = useAuth();
  const { showToast } = useToast();

  const handleStart = () => {
    if (userType === 'guest') {
      showToast('Bu özelliği kullanmak için giriş yapmalısınız.', 'error');
      onClose();
      return;
    }
    if (credits < CREDITS_PER_MINUTE) {
      showToast(`Yeterli krediniz yok. Bu özellik için en az ${CREDITS_PER_MINUTE} kredi gerekir.`, 'error');
      return;
    }
    onConfirm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 animate-fadeIn">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 backdrop-blur-xl border border-violet-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-violet-800/40 text-left w-full max-w-lg animate-slideIn">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-violet-500/50 rounded-full blur-lg"></div>
        <button onClick={onClose} className="absolute top-4 right-4 text-3xl text-slate-400 hover:text-white transition-colors">&times;</button>
        
        <h3 className="text-3xl font-bold mb-2 text-center text-violet-300 flex items-center justify-center gap-3">
          🚀 Premium Özellik: Sesli Asistan
        </h3>
        <p className="text-center text-slate-400 mb-6">
          Bu özellik, yapay zeka ile 'canlı bir sohbet' içerdiği için standart bir sorudan daha maliyetlidir ve premium erişim gerektirir.
        </p>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-teal-500/30 text-center">
            <h4 className="text-2xl font-bold text-teal-300">Dinamik Fiyatlandırma</h4>
            <p className="text-slate-300 my-3">
                Kullanım süresi dakika başına <strong>{CREDITS_PER_MINUTE} kredi</strong> olarak ücretlendirilir.
                Oturumunuzun sonunda, toplam süreye göre kredinizden düşüm yapılır.
            </p>
            <p className="text-lg font-bold text-white">Mevcut Krediniz: <span className="text-yellow-400">{credits}</span></p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button onClick={onClose} variant="secondary" className="w-full sm:w-auto">Kapat</Button>
            <Button 
                onClick={handleStart} 
                variant="success" 
                className="w-full sm:w-auto"
                disabled={userType === 'authenticated' && credits < CREDITS_PER_MINUTE}
                title={userType === 'authenticated' && credits < CREDITS_PER_MINUTE ? 'Yetersiz kredi' : ''}
            >
                Onayla ve Başla
            </Button>
        </div>
      </div>
    </div>
  );
};

export default PremiumFeatureModal;