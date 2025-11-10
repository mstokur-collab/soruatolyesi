import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
    Difficulty,
    QuizQuestion,
    DocumentLibraryItem,
    Kazanım,
    AnswerRecord,
    GeneratedQuestion,
    PerformanceSnapshot,
    AiCoachReport,
} from '../types';

const functions = getFunctions();

type GeminiResponse<T> = {
    success: boolean;
    data: T;
};

const callGeminiFunction = async <T>(operation: string, params: any): Promise<T> => {
    const callable = httpsCallable(functions, 'callGemini');
    const result = await callable({ operation, params });
    const payload = result.data as GeminiResponse<T>;
    if (!payload.success) {
        throw new Error('Cloud Function isteği başarısız oldu.');
    }
    return payload.data;
};

export const generateQuestionWithAI = async (
    grade: number,
    kazanımId: string,
    kazanımText: string,
    difficulty: Difficulty,
    type: 'quiz' | 'fill-in' | 'matching',
    count: number,
    subjectName: string,
    sourceDocument?: DocumentLibraryItem | null,
    referenceDocument?: DocumentLibraryItem | null
): Promise<Partial<QuizQuestion>[]> => {
    return await callGeminiFunction<Partial<QuizQuestion>[]>('generateQuestion', {
        grade,
        kazanımId,
        kazanımText,
        difficulty,
        type,
        count,
        subjectName,
        sourceDocument,
        referenceDocument,
    });
};

export const analyzePdfContent = async (content: { mimeType: string; data: string }): Promise<{ title: string; topics: string[] }> => {
    return await callGeminiFunction('analyzePdf', { content });
};

export const extractQuestionFromImage = async (content: { mimeType: string; data: string }): Promise<Partial<QuizQuestion>[]> => {
    return await callGeminiFunction('extractQuestionFromImage', { content });
};

export const generateExamWithAI = async (
    settings: any,
    subjectName: string
): Promise<{ scenarios: Record<string, GeneratedQuestion[]>; totalInputTokens: number; totalOutputTokens: number }> => {
    return await callGeminiFunction('generateExam', { settings, subjectName });
};

interface AnalyzePerformanceOptions {
    performanceSnapshots?: PerformanceSnapshot[];
    previousSuccessRate?: number | null;
    userId?: string;
}

export const analyzePerformanceWithAI = async (
    answerHistory: AnswerRecord[],
    allKazanims: Kazanım[],
    options: AnalyzePerformanceOptions = {}
): Promise<AiCoachReport> => {
    return await callGeminiFunction('analyzePerformance', {
        answerHistory,
        allKazanims,
        ...options,
    });
};

export const generatePromptFromExample = async (sampleQuestion: string, kazanımId: string, kazanımText: string): Promise<string> => {
    return await callGeminiFunction('generatePromptFromExample', { sampleQuestion, kazanımId, kazanımText });
};

export const generatePromptFromImageExample = async (
    imageContent: { mimeType: string; data: string },
    kazanımId: string,
    kazanımText: string
): Promise<string> => {
    return await callGeminiFunction('generatePromptFromImageExample', { imageContent, kazanımId, kazanımText });
};
