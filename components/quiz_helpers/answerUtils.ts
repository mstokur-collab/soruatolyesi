import type { QuizQuestion } from '../../types';

const TURKISH_LOCALE = 'tr-TR';
const LETTER_PATTERN = /^([A-Z\u00C7\u011E\u0130\u00D6\u015E\u00DC])(?:\)|\.|:|-|\/|\s|$)/i;
const DIGIT_PATTERN = /^([1-9][0-9]*)/;

const normalize = (value?: string) => {
    return value ? value.normalize('NFKC').replace(/\s+/g, ' ').trim() : '';
};

const normalizeLower = (value?: string) => normalize(value).toLocaleLowerCase(TURKISH_LOCALE);

const findIndexByValue = (needle: string, haystack: string[]) => {
    const target = normalizeLower(needle);
    if (!target) return -1;
    return haystack.findIndex(item => normalizeLower(item) === target);
};

export const isOptionMatchingAnswer = (
    option: string,
    question: QuizQuestion,
    displayedOptions: string[]
): boolean => {
    if (!question?.answer) return false;

    const normalizedOption = normalizeLower(option);
    const normalizedAnswer = normalizeLower(question.answer);
    const answerTrimmed = normalize(question.answer);

    if (!normalizedOption || !answerTrimmed) return false;

    if (normalizedOption === normalizedAnswer) return true;

    const selectedIndex = findIndexByValue(option, displayedOptions);
    if (selectedIndex === -1) return false;

    const correctIndexByText = findIndexByValue(question.answer, displayedOptions);
    if (correctIndexByText !== -1) {
        return selectedIndex === correctIndexByText;
    }

    const expectedLetter = String.fromCharCode(65 + selectedIndex);
    if (answerTrimmed.toUpperCase() === expectedLetter) return true;

    const letterMatch = answerTrimmed.match(LETTER_PATTERN);
    if (letterMatch && letterMatch[1].toUpperCase() === expectedLetter) return true;

    const digitMatch = answerTrimmed.match(DIGIT_PATTERN);
    if (digitMatch) {
        const expectedIndex = parseInt(digitMatch[1], 10) - 1;
        if (!Number.isNaN(expectedIndex) && expectedIndex === selectedIndex) {
            return true;
        }
    }

    return false;
};
