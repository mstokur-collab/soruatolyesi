import React from 'react';
import type { Duel } from '../types';
import { Button } from './UI';

interface DuelInvitationModalProps {
  duel: Duel | null;
  onAccept: () => void;
  onReject: () => void;
}

const DuelInvitationModal: React.FC<DuelInvitationModalProps> = ({ duel, onAccept, onReject }) => {
  if (!duel) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-violet-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-violet-800/40 text-center w-full max-w-md animate-slideIn">
        <h3 className="text-3xl font-bold mb-4 text-violet-300">⚔️ Meydan Okuma! ⚔️</h3>
        
        <div className="flex flex-col items-center my-6">
            <img 
                src={duel.challengerPhotoURL || 'https://i.pravatar.cc/150'} 
                alt={duel.challengerName}
                className="w-28 h-28 rounded-full mb-3 border-4 border-slate-600 object-cover"
            />
            <p className="text-xl text-slate-200">
                <span className="font-bold text-yellow-400">{duel.challengerName}</span> sana meydan okuyor!
            </p>
        </div>

        <p className="text-slate-400 mb-8">Düelloyu kabul ediyor musun?</p>

        <div className="flex gap-4 justify-center">
          <Button onClick={onReject} variant="secondary" className="px-8 py-3 text-lg">Reddet</Button>
          <Button onClick={onAccept} variant="success" className="px-8 py-3 text-lg">Kabul Et</Button>
        </div>
      </div>
    </div>
  );
};

export default DuelInvitationModal;