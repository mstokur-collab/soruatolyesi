import { useCallback, useLayoutEffect, useRef } from 'react';

export const useFitText = (text: string, refitTrigger?: any) => {
    const textRef = useRef<HTMLDivElement>(null);

    const fitTextCallback = useCallback(() => {
        const el = textRef.current;
        if (!el || !el.parentElement) return;
        const container = el.parentElement;

        el.style.visibility = 'hidden';

        const computedFontSize = parseFloat(window.getComputedStyle(el).fontSize) || 22;
        let currentSize = computedFontSize;
        const minFontSize = Math.max(14, computedFontSize * 0.7);

        el.style.fontSize = `${currentSize}px`;

        const isOverflowing = () => el.scrollHeight > container.clientHeight || el.scrollWidth > container.clientWidth;

        while (isOverflowing() && currentSize > minFontSize) {
            currentSize -= 1;
            el.style.fontSize = `${currentSize}px`;
        }
        
        el.style.visibility = 'visible';
    }, []);

    useLayoutEffect(() => {
        fitTextCallback();
        window.addEventListener('resize', fitTextCallback);
        return () => {
            window.removeEventListener('resize', fitTextCallback);
        };
    }, [text, fitTextCallback, refitTrigger]);

    return textRef;
};

