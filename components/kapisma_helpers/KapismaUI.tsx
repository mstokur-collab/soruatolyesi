import React, { useCallback, useRef } from 'react';

export const kapismaSharedStyles = `
    .kapisma-bg {
        background: radial-gradient(ellipse at bottom, #1e293b 0%, #0f172a 100%); /* slate gradient */
        position: relative;
        overflow: hidden;
    }
    .kapisma-bg::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle at center, rgba(139, 92, 246, 0.15) 0%, transparent 50%);
        opacity: 0.8;
        pointer-events: none;
        animation: kapisma-pulse 8s infinite ease-in-out;
    }
    @keyframes kapisma-pulse {
        0%, 100% { transform: scale(0.8); opacity: 0.5; }
        50% { transform: scale(1.3); opacity: 0.8; }
    }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
`;

export const useKapismaAudio = () => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const shuffleIntervalRef = useRef<number | null>(null);

    const playSound = useCallback((type: 'click' | 'correct' | 'incorrect' | 'score' | 'shuffle_tick') => {
        if (!audioCtxRef.current) {
            try {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API not supported.");
                return;
            }
        }
        const audioCtx = audioCtxRef.current;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        switch(type) {
            case 'click':
                gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
                break;
            case 'shuffle_tick':
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(Math.random() * 400 + 600, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
                break;
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
            case 'score':
                gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime);
                oscillator.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
                break;
        }
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    }, []);

    const startShuffle = useCallback(() => {
        if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
        shuffleIntervalRef.current = window.setInterval(() => {
            playSound('shuffle_tick');
        }, 100);
    }, [playSound]);

    const stopShuffle = useCallback(() => {
        if (shuffleIntervalRef.current) {
            clearInterval(shuffleIntervalRef.current);
            shuffleIntervalRef.current = null;
        }
    }, []);

    return { 
        playClick: () => playSound('click'),
        playCorrect: () => playSound('correct'),
        playIncorrect: () => playSound('incorrect'),
        playScore: () => playSound('score'),
        startShuffle, 
        stopShuffle 
    };
};

export const AnimatedScore = ({
  isAnimating,
  startPos,
  targetPos,
  onAnimationEnd,
  text
}: {
  isAnimating: boolean;
  startPos: { x: number; y: number };
  targetPos: { x: number; y: number };
  onAnimationEnd: () => void;
  text: string;
}) => {
  if (!isAnimating) return null;

  const style = {
    '--start-x': `${startPos.x}px`,
    '--start-y': `${startPos.y}px`,
    '--target-x': `${targetPos.x}px`,
    '--target-y': `${targetPos.y}px`,
  } as React.CSSProperties;

  return (
    <>
      <style>{`
        @keyframes flyToScore {
          0% {
            transform: translate(var(--start-x), var(--start-y)) scale(1.5);
            opacity: 1;
          }
          100% {
            transform: translate(var(--target-x), var(--target-y)) scale(0.3);
            opacity: 0;
          }
        }
        .score-fly-animation {
          position: fixed;
          left: 0;
          top: 0;
          color: #f59e0b; /* amber-500 */
          font-size: 5rem;
          font-weight: 900;
          text-shadow: 0 0 15px rgba(0,0,0,0.7);
          pointer-events: none;
          z-index: 100;
          animation: flyToScore 1.2s cubic-bezier(0.5, 0, 0.9, 0.5) forwards;
        }
      `}</style>
      <div
        className="score-fly-animation"
        style={style}
        onAnimationEnd={onAnimationEnd}
      >
        {text}
      </div>
    </>
  );
};