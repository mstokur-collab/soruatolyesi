import { useState, useEffect, useRef } from 'react';

export const useShufflingNumber = (isAnimating: boolean, maxValue: number, finalValue: number | null) => {
  const [displayValue, setDisplayValue] = useState<number | string>('?');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAnimating) {
      setDisplayValue('?');
      intervalRef.current = window.setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * maxValue) + 1);
      }, 70);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (finalValue !== null) {
        setDisplayValue(finalValue);
      } else {
        setDisplayValue('?');
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAnimating, maxValue, finalValue]);

  return displayValue;
};
