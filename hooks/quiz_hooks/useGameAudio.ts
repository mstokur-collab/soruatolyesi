import { useRef, useCallback } from 'react';

export const useGameAudio = () => {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const playSound = useCallback((type: 'correct' | 'incorrect' | 'tick') => {
        if (!audioCtxRef.current) {
            try {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API desteklenmiyor.");
                return;
            }
        }
        const audioCtx = audioCtxRef.current;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        switch (type) {
            case 'correct':
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
                oscillator.frequency.linearRampToValueAtTime(659.25, audioCtx.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
                break;
            case 'incorrect':
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(164.81, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
                break;
            case 'tick':
                gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
                break;
        }
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    }, []);

    return { playSound };
};
