// FIX: Add 'useRef' to the import from 'react'.
import { useState, useEffect, useCallback, useRef } from 'react';
import type { QuizMode, Question } from '../../types';

const QUESTION_TIME_QUIZ = 40;
const QUESTION_TIME_FILL_IN = 35;
const QUESTION_TIME_MATCHING = 40;
const QUESTION_TIME_PARAGRAPH = 70;
const MASTER_TIME_DEFAULT = 120;

const formatTime = (seconds: number) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
};

interface UseGameTimerProps {
  quizMode: QuizMode;
  isTimerActive: boolean;
  onTimeOut: () => void;
  playSound: (type: 'tick') => void;
  currentQuestion: Question;
  subjectId: string;
  streak: number;
  currentQuestionIndex: number;
}

export const useGameTimer = ({
  quizMode,
  isTimerActive,
  onTimeOut,
  playSound,
  currentQuestion,
  subjectId,
  streak,
  currentQuestionIndex,
}: UseGameTimerProps) => {
    const [masterTimeLeft, setMasterTimeLeft] = useState(MASTER_TIME_DEFAULT);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_QUIZ);

    const resetQuestionTimer = useCallback(() => {
        if (quizMode === 'klasik' || quizMode === 'hayatta-kalma') {
            let time;
            if (subjectId === 'paragraph' && currentQuestion?.type === 'quiz') {
                time = QUESTION_TIME_PARAGRAPH;
            } else {
                switch (currentQuestion?.type) {
                    case 'quiz': time = QUESTION_TIME_QUIZ; break;
                    case 'fill-in': time = QUESTION_TIME_FILL_IN; break;
                    case 'matching': time = QUESTION_TIME_MATCHING; break;
                    default: time = QUESTION_TIME_QUIZ;
                }
            }
            if (quizMode === 'hayatta-kalma') {
                time = Math.max(10, time - streak);
            }
            setTimeLeft(time);
        }
    }, [currentQuestion?.type, quizMode, streak, subjectId]);

    useEffect(() => {
        resetQuestionTimer();
    }, [currentQuestionIndex, resetQuestionTimer]);

    useEffect(() => {
        if (!isTimerActive) return;

        let timer: number;
        if (quizMode === 'zamana-karsi') {
            if (masterTimeLeft > 0) {
                timer = window.setTimeout(() => setMasterTimeLeft(prev => prev - 1), 1000);
                if (masterTimeLeft <= 10) playSound('tick');
            } else {
                onTimeOut();
            }
        } else {
            if (timeLeft > 0) {
                timer = window.setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
                if (timeLeft <= 10) playSound('tick');
            } else {
                onTimeOut();
            }
        }

        return () => clearTimeout(timer);
    }, [timeLeft, masterTimeLeft, isTimerActive, playSound, onTimeOut, quizMode]);

    const addTime = useCallback(() => {
        if (quizMode === 'zamana-karsi') {
            setMasterTimeLeft(prev => prev + 15);
        } else {
            setTimeLeft(prev => prev + 15);
        }
    }, [quizMode]);

    const formattedTime = formatTime(quizMode === 'zamana-karsi' ? masterTimeLeft : timeLeft);
    
    // This ref is needed by the main component to calculate points
    const timeLeftRef = useRef(timeLeft);
    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    return {
        formattedTime,
        addTime,
        timeLeftRef,
        masterTimeLeft,
    };
};