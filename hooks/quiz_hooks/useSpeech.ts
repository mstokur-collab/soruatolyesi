import { useState, useCallback, useRef, useEffect } from 'react';
import type { Question, QuizQuestion, FillInQuestion, MatchingQuestion } from '../../types';

export const useSpeech = (onSpeechEnd: () => void) => {
    const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        const loadVoices = () => {
            voicesRef.current = window.speechSynthesis.getVoices();
        };
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
        return () => {
            window.speechSynthesis.onvoiceschanged = null;
            window.speechSynthesis.cancel();
        };
    }, []);

    const speak = useCallback((
        currentQuestion: Question,
        optionsToShow: string[],
        questionText: string,
    ) => {
        if (!isSpeechEnabled || !currentQuestion) {
            onSpeechEnd();
            return;
        }

        window.speechSynthesis.cancel();

        const partsToRead: string[] = [];

        switch (currentQuestion.type) {
            case 'quiz': {
                const quizQ = currentQuestion as QuizQuestion;
                partsToRead.push(questionText || quizQ.question);
                optionsToShow.forEach((option, index) => {
                    const letter = String.fromCharCode(65 + index);
                    partsToRead.push(`${letter} şıkkı. ${option}`);
                });
                break;
            }
            case 'fill-in': {
                const fillInQ = currentQuestion as FillInQuestion;
                const sentenceParts = fillInQ.sentence.split('___');
                partsToRead.push(sentenceParts[0]);
                partsToRead.push("boşluk");
                if (sentenceParts[1]) partsToRead.push(sentenceParts[1]);
                partsToRead.push("Seçenekler şunlar:");
                optionsToShow.forEach(option => partsToRead.push(option));
                break;
            }
            case 'matching': {
                const matchingQ = currentQuestion as MatchingQuestion;
                partsToRead.push(matchingQ.question || "Aşağıdaki ifadeleri doğru şekilde eşleştirin.");
                break;
            }
        }

        if (partsToRead.length === 0) {
            onSpeechEnd();
            return;
        }

        let partIndex = 0;
        const speakNextPart = () => {
            if (!isSpeechEnabled || partIndex >= partsToRead.length) {
                if(isSpeechEnabled) onSpeechEnd();
                return;
            }
            
            const textToSpeak = partsToRead[partIndex];
            partIndex++;
            
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            
            const turkishVoices = voicesRef.current.filter(voice => voice.lang === 'tr-TR');
            const findVoice = (keyword: string) => turkishVoices.find(v => v.name.toLowerCase().includes(keyword));
            const aylinVoice = findVoice('aylin');
            const yeldaVoice = findVoice('yelda');
            const googleVoice = findVoice('google');
            
            utterance.voice = aylinVoice || yeldaVoice || googleVoice || turkishVoices[0] || null;
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            
            utterance.onend = () => {
                setTimeout(speakNextPart, 350);
            };
            
            window.speechSynthesis.speak(utterance);
        };

        speakNextPart();

    }, [isSpeechEnabled, onSpeechEnd]);

    const toggleSpeech = useCallback(() => {
        setIsSpeechEnabled(prev => {
            const isNowEnabled = !prev;
            if (!isNowEnabled) {
                window.speechSynthesis.cancel();
                // We call onSpeechEnd to immediately start the timer if speech is disabled mid-flow.
                onSpeechEnd();
            }
            return isNowEnabled;
        });
    }, [onSpeechEnd]);

    return { isSpeechEnabled, toggleSpeech, speak };
};
