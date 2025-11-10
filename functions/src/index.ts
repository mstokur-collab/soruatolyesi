import * as functions from 'firebase-functions';

import * as admin from 'firebase-admin';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { computeLeaderboardSnapshot } from './leaderboard';
import { buildSegmentSnapshots, getActiveSeasonId } from './leaderboardSegments';
import { buildMissionInstance, getActiveMissionDefinitions, MissionTargetType, createTargetedPracticeMissions } from './missions';



admin.initializeApp();
const db = admin.firestore();

const incrementQuestionCreation = async (uid: string, amount = 1): Promise<void> => {
    if (!uid || amount <= 0) return;
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
        participationStats: {
            questionsCreated: admin.firestore.FieldValue.increment(amount),
            lastQuestionCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
    }, { merge: true });
};


const presenceInvocationStats = {

    minuteBucket: 0,

    count: 0,

};



const logPresenceInvocation = (uid: string) => {

    const minuteBucket = Math.floor(Date.now() / 60000);

    if (presenceInvocationStats.minuteBucket !== minuteBucket) {

        presenceInvocationStats.minuteBucket = minuteBucket;

        presenceInvocationStats.count = 0;

    }

    presenceInvocationStats.count += 1;



    if (presenceInvocationStats.count === 1 || presenceInvocationStats.count % 20 === 0) {

        functions.logger.info('syncPresenceToFirestore invocation stats', {

            minuteBucket,

            count: presenceInvocationStats.count,

            sampleUid: uid,

        });

    }

};



// Helper function to safely parse JSON from AI responses

const parseAIJson = (jsonString: string): any => {

    try {

        const cleanedString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanedString);

    } catch (e) {

        console.error("Failed to parse AI JSON response:", jsonString, e);

        throw new functions.https.HttpsError(

            'internal',

            'Yapay zeka yanıtı beklenmedik bir formatta geldi. Lütfen tekrar deneyin.'

        );

    }

};

const DAILY_AI_ANALYSIS_LIMIT = 1;
const WEEKLY_AI_ANALYSIS_LIMIT = 3;

const getIsoWeekKey = (date = new Date()): string => {
    const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${temp.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
};

const enforceAiAnalysisQuota = async (userId: string) => {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
    }

    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const weekKey = getIsoWeekKey(now);
    const limits = userSnap.get('aiCoachLimits') || {};

    let dailyWindow = typeof limits?.dailyWindow === 'string' ? limits.dailyWindow : todayKey;
    let weeklyWindow = typeof limits?.weeklyWindow === 'string' ? limits.weeklyWindow : weekKey;
    let dailyCount = Number(limits?.dailyCount ?? 0);
    let weeklyCount = Number(limits?.weeklyCount ?? 0);

    if (dailyWindow !== todayKey) {
        dailyWindow = todayKey;
        dailyCount = 0;
    }
    if (weeklyWindow !== weekKey) {
        weeklyWindow = weekKey;
        weeklyCount = 0;
    }

    if (dailyCount >= DAILY_AI_ANALYSIS_LIMIT) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            'Günde en fazla 1 AI analizi yapabilirsin. Lütfen yarın tekrar dene.'
        );
    }
    if (weeklyCount >= WEEKLY_AI_ANALYSIS_LIMIT) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            'Bu hafta 3 AI analiz hakkını kullandın. Pazartesi günü hakların yenilenir.'
        );
    }

    return {
        userRef,
        now,
        todayKey,
        weekKey,
        limits: {
            dailyWindow,
            weeklyWindow,
            dailyCount,
            weeklyCount,
        },
    };
};



// Callable function for Gemini API operations

export const callGemini = functions.https.onCall(async (data, context) => {

    // Get API key from environment config

    const apiKey = functions.config().gemini?.key;

    

    if (!apiKey) {

        throw new functions.https.HttpsError(

            'failed-precondition',

            'Gemini API anahtarı yapılandırılmamış.'

        );

    }



    const ai = new GoogleGenerativeAI(apiKey);

    const { operation, params } = data;



    try {

        switch (operation) {

            case 'generateQuestion': {

                const {

                    grade,

                    kazanımId,

                    kazanımText,

                    difficulty,

                    type,

                    count = 1,

                    subjectName,

                    sourceDocument,

                    referenceDocument

                } = params;



                const prompt = `

                You are an expert ${grade}th grade ${subjectName} teacher and question writer in Turkey.

                Your task is to generate ${count} question(s) for the following objective (kazanım).

                

                Objective ID: ${kazanımId}

                Objective Text: ${kazanımText}

                Grade Level: ${grade}

                Difficulty: ${difficulty}

                Question Type: ${type}

                

                ${sourceDocument ? `Source Document context: The following text is from a user-uploaded PDF. Base the question on this content.\n---\n${sourceDocument.summary?.topics.join(' ')}\n---` : ''}

                ${referenceDocument ? `Reference Document context: The following content is from a user-uploaded reference document. Use it as inspiration or context.\n---\n${referenceDocument.name}\n---` : ''}

                

                Output a JSON array of ${count} question object(s). 

                For 'quiz' type, provide a question, 4 options, a correct answer, and a brief explanation.

                For 'fill-in' type, provide a sentence with '___', a correct answer, and 3 distractors.

                For 'matching' type, provide a list of pairs with terms and definitions.

                

                Example for 'quiz':

                [{

                  "question": "...",

                  "options": ["...", "...", "...", "..."],

                  "answer": "...",

                  "explanation": "..."

                }]

                `;



                const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

                const response = await model.generateContent(prompt);



                const result = parseAIJson(response.response.text());

                return { success: true, data: Array.isArray(result) ? result : [result] };

            }



            case 'analyzePdf': {

                const { content } = params;

                const prompt = "Analyze the provided document. Generate a suitable title and a list of the main topics discussed. Output in JSON format: {\"title\": \"...\", \"topics\": [\"...\", \"...\"]}";

                

                const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

                const response = await model.generateContent([

                    { inlineData: content },

                    { text: prompt }

                ]);



                return { success: true, data: parseAIJson(response.response.text()) };

            }



            case 'extractQuestionFromImage': {

                const { content } = params;

                const prompt = `Analyze the image of a multiple-choice question. Extract the question stem, four options, and identify the correct answer. Output a JSON array containing one object: [{ "question": "...", "options": ["...", "...", "...", "..."], "answer": "..." }]`;



                const model = ai.getGenerativeModel({ model: 'gemini-2.5-pro' });

                const response = await model.generateContent([

                    { inlineData: content },

                    { text: prompt }

                ]);



                return { success: true, data: parseAIJson(response.response.text()) };

            }



            case 'generateExam': {

                const { settings, subjectName } = params;

                const { grade, selectedKazanims, totalQuestions } = settings;

                

                const prompt = `

                You are an expert exam creator for ${grade}th grade ${subjectName} in Turkey.

                Create an exam with ${totalQuestions} questions based on the following objectives.

                For each objective, create the specified number of questions.

                Generate two different scenarios for the exam ('Örnek Yazılı 1', 'Örnek Yazılı 2').

                Each question must be open-ended, suitable for a written exam.

                Assign points to each question, ensuring the total is 100.

                For questions that would benefit from a visual, provide a detailed description in 'visualDescription'. Otherwise, set it to null.



                Objectives:

                ${Object.entries(selectedKazanims).map(([id, data]: [string, any]) => `- ${id} (${data.text}): ${data.count} question(s)`).join('\n')}



                Output a JSON object with two keys: "Örnek Yazılı 1" and "Örnek Yazılı 2". Each key should have an array of question objects.

                Each question object must have: id, kazanımId, kazanımText, questionStem, answer, visualDescription, points.

                

                Example format:

                {

                  "Örnek Yazılı 1": [

                    { "id": "1", "kazanımId": "...", "kazanımText": "...", "questionStem": "...", "answer": "...", "visualDescription": "...", "points": 10 },

                    ...

                  ],

                  "Örnek Yazılı 2": [ ... ]

                }

                `;



                const model = ai.getGenerativeModel({ 

                    model: 'gemini-2.5-pro',

                    generationConfig: { responseMimeType: 'application/json' }

                });

                const response = await model.generateContent(prompt);



                const usageMetadata = (response as any).usageMetadata || { totalTokenCount: 0, promptTokenCount: 0 };

                

                return {

                    success: true,

                    data: {

                        scenarios: parseAIJson(response.response.text()),

                        totalInputTokens: usageMetadata.promptTokenCount,

                        totalOutputTokens: usageMetadata.totalTokenCount - usageMetadata.promptTokenCount

                    }

                };

            }






            case 'analyzePerformance': {


                const { answerHistory, allKazanims, performanceSnapshots = [], previousSuccessRate, userId } = params;
                const resolvedUserId: string | null = context.auth?.uid || userId || null;
                let analysisQuotaContext: any = null;
                if (resolvedUserId) {
                    analysisQuotaContext = await enforceAiAnalysisQuota(resolvedUserId);
                }





                if (!Array.isArray(answerHistory) || answerHistory.length === 0) {


                    throw new functions.https.HttpsError(


                        'failed-precondition',


                        'Analiz yapabilmek icin en az bir cevap kaydi gereklidir.'


                    );


                }





                const kazanimMap = new Map(allKazanims.map((k: any) => [k.id, k.text]));


                const formatShortDate = (timestamp: number) => {


                    try {


                        return new Date(timestamp).toLocaleDateString('tr-TR', { month: 'short', day: '2-digit' });


                    } catch {


                        return new Date(timestamp).toISOString().slice(5, 10);


                    }


                };





                const buildSnapshotStats = (history: any[], chunkSize: number = 25) => {


                    if (!Array.isArray(history) || history.length === 0) {


                        return [];


                    }


                    const sorted = [...history].sort((a, b) => (a.answeredAt || 0) - (b.answeredAt || 0));


                    const snapshots: { label: string; total: number; correct: number; successRate: number }[] = [];


                    for (let i = 0; i < sorted.length; i += chunkSize) {


                        const chunk = sorted.slice(i, i + chunkSize);


                        const total = chunk.length;


                        const correct = chunk.filter((item: any) => item.isCorrect).length;


                        const startTs = chunk[0]?.answeredAt;


                        const endTs = chunk[chunk.length - 1]?.answeredAt;


                        const label = typeof startTs === 'number' && typeof endTs === 'number'


                            ? `${formatShortDate(startTs)} - ${formatShortDate(endTs)}`


                            : `Blok ${snapshots.length + 1}`;


                        snapshots.push({


                            label,


                            total,


                            correct,


                            successRate: total > 0 ? (correct / total) * 100 : 0,


                        });


                    }


                    return snapshots;


                };





                const describeProgress = (currentRate: number | null, prevRate: number | null) => {


                    if (currentRate == null) {


                        return 'Guncel basari orani hesaplanamadi.';


                    }


                    if (prevRate == null) {


                        return `Son donem basari orani %${currentRate.toFixed(1)} olarak hesaplandi.`;


                    }


                    const diff = currentRate - prevRate;


                    if (Math.abs(diff) < 0.05) {


                        return `Basari orani %${currentRate.toFixed(1)} seviyesinde sabit kaldi (onceki: %${prevRate.toFixed(1)}).`;


                    }


                    const direction = diff > 0 ? 'artti' : 'azaldi';


                    return `Bir onceki analizden bu yana basari orani %${Math.abs(diff).toFixed(1)} ${direction} (onceki: %${prevRate.toFixed(1)}, guncel: %${currentRate.toFixed(1)}).`;


                };





                const totalQuestions = answerHistory.length;


                const correctAnswers = answerHistory.filter((a: any) => a.isCorrect).length;


                const rawSuccessRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;


                const successRate = rawSuccessRate.toFixed(1);





                const bySubject: Record<string, { correct: number; total: number }> = {};


                const byKazanim: Record<string, { correct: number; total: number; subjectId?: string }> = {};


                const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;


                const currentWeekIndex = Math.floor(Date.now() / MS_PER_WEEK);


                const byWeek: Record<number, { correct: number; total: number }> = {};





                answerHistory.forEach((a: any) => {


                    if (!bySubject[a.subjectId]) {


                        bySubject[a.subjectId] = { correct: 0, total: 0 };


                    }


                    bySubject[a.subjectId].total++;


                    if (a.isCorrect) bySubject[a.subjectId].correct++;





                    const kazanimId = a.kazanimId ?? a['kazanımId'];


                    if (!kazanimId) {


                        return;


                    }


                    if (!byKazanim[kazanimId]) {


                        byKazanim[kazanimId] = { correct: 0, total: 0, subjectId: a.subjectId };


                    }


                    byKazanim[kazanimId].total++;


                    if (a.isCorrect) byKazanim[kazanimId].correct++;




                    if (a.subjectId && !byKazanim[kazanimId].subjectId) {


                        byKazanim[kazanimId].subjectId = a.subjectId;


                    }





                    if (typeof a.answeredAt === 'number') {


                        const weekIndex = Math.floor(a.answeredAt / MS_PER_WEEK);


                        if (!byWeek[weekIndex]) {


                            byWeek[weekIndex] = { correct: 0, total: 0 };


                        }


                        byWeek[weekIndex].total++;


                        if (a.isCorrect) {


                            byWeek[weekIndex].correct++;


                        }


                    }


                });





                const hardestKazanimStats = Object.entries(byKazanim)


                    .map(([id, data]) => {


                        const rate = data.total > 0 ? (data.correct / data.total) * 100 : 0;


                        const label = kazanimMap.get(id);
                        return {


                            id,


                            label: typeof label === 'string' && label.length ? label : id,


                            total: data.total,


                            correct: data.correct,


                            successRate: rate,


                            subjectId: data.subjectId,


                        };


                    })


                    .sort((a, b) => a.successRate - b.successRate)


                    .slice(0, 5);





                const hardestKazanimText = hardestKazanimStats.length
                    ? hardestKazanimStats
                        .map((item) => `${item.label}: %${item.successRate.toFixed(1)} (${item.correct}/${item.total})`)
                        .join('\n')
                    : 'Bu analiz icin yeterli kazanim verisi yok.';




                if (resolvedUserId && hardestKazanimStats.length) {
                    const confidentStats = hardestKazanimStats.filter((item) => item.total >= 3);
                    const prioritizedList = confidentStats.length ? confidentStats : hardestKazanimStats;
                    const primaryTarget = prioritizedList[0];
                    if (primaryTarget) {
                        await createTargetedPracticeMissions(
                            resolvedUserId,
                            [
                                {
                                    id: primaryTarget.id,
                                    label: primaryTarget.label,
                                    subjectId: primaryTarget.subjectId,
                                },
                            ],
                            {
                                questionTarget: 10,
                                accuracyTarget: 60,
                                expiresInHours: 48,
                                rewardPoints: 250,
                            }
                        );
                    }
                }





                const formatWeekRange = (weekIndex: number) => {


                    const startMs = weekIndex * MS_PER_WEEK;


                    const endMs = startMs + MS_PER_WEEK - 1;


                    return `${formatShortDate(startMs)} - ${formatShortDate(endMs)}`;


                };





                const weeklyTrendStats = Array.from({ length: 4 }).map((_, idx) => {


                    const targetWeek = currentWeekIndex - (3 - idx);


                    const weekData = byWeek[targetWeek] || { correct: 0, total: 0 };


                    const successRate = weekData.total > 0 ? (weekData.correct / weekData.total) * 100 : null;


                    return {


                        label: formatWeekRange(targetWeek),


                        total: weekData.total,


                        correct: weekData.correct,


                        successRate,


                    };


                });





                const weeklyTrendText = weeklyTrendStats
                    .map((stat) => {
                        if (!stat.total) {
                            return `${stat.label}: veri yok`;
                        }
                        return `${stat.label}: %${stat.successRate!.toFixed(1)} (${stat.correct}/${stat.total})`;
                    })
                    .join('\n');





                const derivedSnapshots = Array.isArray(performanceSnapshots) && performanceSnapshots.length > 0


                    ? performanceSnapshots


                    : buildSnapshotStats(answerHistory);


                const previousSnapshotRate = typeof previousSuccessRate === 'number'


                    ? previousSuccessRate


                    : (derivedSnapshots.length > 1 ? derivedSnapshots[derivedSnapshots.length - 2].successRate : null);


                const currentSnapshotRate = derivedSnapshots.length > 0


                    ? derivedSnapshots[derivedSnapshots.length - 1].successRate


                    : rawSuccessRate;


                const progressSummaryText = describeProgress(currentSnapshotRate, previousSnapshotRate);


                const snapshotSummaryText = derivedSnapshots.length > 0
                    ? derivedSnapshots
                        .map((snap: any, index: number) =>
                            `Donem ${index + 1} (${snap.label}): %${snap.successRate.toFixed(1)} (${snap.correct}/${snap.total})`
                        )
                        .join('\n')
                    : 'Snapshot verisi bulunamadi.';





                const historyInsights = answerHistory


                    .slice(-50)


                    .map((a: any) => {


                        const kazanimId = a.kazanimId ?? a['kazanımId'];


                        return {


                            kazanimId: kazanimId || 'bilinmeyen',


                            kazanimLabel: kazanimId ? (kazanimMap.get(kazanimId) || kazanimId) : 'Bilinmeyen kazanim',


                            difficulty: a.difficulty,


                            isCorrect: Boolean(a.isCorrect),


                            subjectId: a.subjectId,


                            answeredAt: typeof a.answeredAt === 'number' ? a.answeredAt : null,


                        };


                    });





                const promptPayload = {


                    overallStats: {


                        totalQuestions,


                        correctAnswers,


                        successRate: Number(successRate),


                    },


                    hardestKazanims: hardestKazanimStats,


                    weeklyTrend: weeklyTrendStats,


                    progressSummary: progressSummaryText,


                    snapshotSummary: snapshotSummaryText,


                    hardestKazanimsNarrative: hardestKazanimText,


                    weeklyTrendNarrative: weeklyTrendText,


                    historyInsights,


                };


                const promptPayloadJson = JSON.stringify(promptPayload, null, 2);


                const schemaDescription = `{


                    "generalSummary": "string",


                    "strengths": [


                        { "title": "string", "description": "string", "supportingStat": "string", "icon": "string" }


                    ],


                    "focusAreas": [


                        { "title": "string", "description": "string", "actionTip": "string", "icon": "string" }


                    ],


                    "hardestKazanims": [


                        { "title": "string", "description": "string", "recommendation": "string" }


                    ],


                    "progressSummary": "string",


                    "weeklyTrendSummary": "string",


                    "snapshotSummary": "string",


                    "actionPlan": [


                        { "title": "string", "steps": ["string"], "expectedBenefit": "string" }


                    ],


                    "motivationMessage": "string",


                    "language": "tr-TR"


                }`;





                const prompt = `


Sen deneyimli bir egitim kocusun ve ogrenci performans verilerini analiz ederek profesyonel gelisim onerileri olusturuyorsun.


Sana verilen JSON verilerini incele ve yalnizca belirtilen semaya uyan gecerli JSON dondur.


Verileri yorumlarken spesifik kazanımlara ve yuzde/deneme degerlerine referans ver.





Veri Seti:


${promptPayloadJson}





Zorunlu JSON Yapisi:


${schemaDescription}





Kurallar:


- Yanıt yalnizca JSON icermeli, Markdown veya fazladan metin yok.


- Tum alanlari Turkce doldur.


- strengths ve focusAreas listelerinde en az iki madde bulunsun.


- actionPlan adimlari uygulanabilir ve olculebilir olsun.


- language alanini "tr-TR" olarak ayarla.


`;





                const model = ai.getGenerativeModel({


                    model: 'gemini-flash-latest',


                    generationConfig: { responseMimeType: 'application/json' },


                });


                const response = await model.generateContent(prompt);


                const parsed = parseAIJson(response.response.text());

                if (resolvedUserId) {
                    const reportPayload = {
                        report: parsed,
                        overallStats: promptPayload.overallStats,
                        progressSummary: promptPayload.progressSummary,
                        snapshotSummary: promptPayload.snapshotSummary,
                        weeklyTrend: promptPayload.weeklyTrend,
                        hardestKazanims: promptPayload.hardestKazanims,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        generatedAt: Date.now(),
                    };
                    try {
                        await db
                            .collection('users')
                            .doc(resolvedUserId)
                            .collection('aiCoachReports')
                            .add(reportPayload);
                    } catch (storeError) {
                        functions.logger.error('Failed to store AI coach report', { userId: resolvedUserId, storeError });
                    }
                } else {
                    functions.logger.warn('AI coach report not persisted because no user id was provided');
                }





                if (analysisQuotaContext && resolvedUserId) {
                    const updatedLimits = {
                        dailyWindow: analysisQuotaContext.todayKey,
                        weeklyWindow: analysisQuotaContext.weekKey,
                        dailyCount: analysisQuotaContext.limits.dailyCount + 1,
                        weeklyCount: analysisQuotaContext.limits.weeklyCount + 1,
                        lastAnalysisAt: analysisQuotaContext.now.toISOString(),
                    };
                    try {
                        await analysisQuotaContext.userRef.set(
                            {
                                aiCoachLimits: updatedLimits,
                            },
                            { merge: true }
                        );
                    } catch (quotaError) {
                        functions.logger.error('Failed to update aiCoachLimits', { userId: resolvedUserId, quotaError });
                    }
                }

                return { success: true, data: parsed };


            }


            case 'generatePromptFromExample': {

                const { sampleQuestion, kazanımId, kazanımText } = params;

                const prompt = `

                Analyze the following sample multiple-choice question. Based on its structure, content, and style, generate a generic AI prompt template to create similar questions.

                The template should be in a JSON-like format within a string, using placeholders like [KAZANIM_ID], [KAZANIM_TEXT], etc.

                It must include a 'visualPrompt' field describing a suitable image for the question, even if the original has no image.

                

                Sample Question:

                "${sampleQuestion}"



                Generate a prompt template that, when given to an AI, will produce new, original questions in the same style for the objective: "${kazanımId} - ${kazanımText}".

                `;



                const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

                const response = await model.generateContent(prompt);

                

                return { success: true, data: response.response.text() };

            }



            case 'generatePromptFromImageExample': {

                const { imageContent, kazanımId, kazanımText } = params;

                const prompt = `

                Analyze the attached image, which contains a multiple-choice question.

                Based on its visual style, structure, and content, generate a generic AI prompt template to create similar questions.

                The template should be in a JSON-like format within a string, using placeholders.

                It must include a 'visualPrompt' field that abstractly describes the style and content of the image.

                

                Generate a prompt template that, when given to an AI, will produce new, original questions with similar visuals for the objective: "${kazanımId} - ${kazanımText}".

                `;

                

                const model = ai.getGenerativeModel({ model: 'gemini-2.5-pro' });

                const response = await model.generateContent([

                    { inlineData: imageContent }, 

                    { text: prompt }

                ]);



                return { success: true, data: response.response.text() };

            }



            default:

                throw new functions.https.HttpsError(

                    'invalid-argument',

                    'Geçersiz işlem türü.'

                );

        }

    } catch (error: any) {

        console.error('Gemini API Error:', error);

        throw new functions.https.HttpsError(

            'internal',

            error.message || 'Gemini API isteği başarısız oldu.'

        );

    }

});



const SCORE_DELTA_EPSILON = 0.5;

const hasScoreChanged = (previous: unknown, next: number): boolean => {
    const prevNumber = Number(previous);
    if (!Number.isFinite(prevNumber)) {
        return true;
    }
    return Math.abs(prevNumber - next) >= SCORE_DELTA_EPSILON;
};

export const updateLeaderboardSnapshot = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        if (!change.after.exists) {
            return null;
        }
        const userDoc = change.after.data();
        if (!userDoc) {
            return null;
        }

        const snapshot = computeLeaderboardSnapshot(userDoc);
        const differences = {
            leaderboardScore: hasScoreChanged(userDoc.leaderboardScore, snapshot.leaderboardScore),
            seasonScore: hasScoreChanged(userDoc.seasonScore, snapshot.seasonScore),
            skillPoints: hasScoreChanged(userDoc.skillPoints, snapshot.skillPoints),
            participationPoints: hasScoreChanged(userDoc.participationPoints, snapshot.participationPoints),
        };

        const shouldUpdate = Object.values(differences).some(Boolean);
        if (!shouldUpdate) {
            return null;
        }

        const updatePayload: Record<string, number | string> = {};
        if (differences.leaderboardScore) updatePayload.leaderboardScore = snapshot.leaderboardScore;
        if (differences.seasonScore) updatePayload.seasonScore = snapshot.seasonScore;
        if (differences.skillPoints) updatePayload.skillPoints = snapshot.skillPoints;
        if (differences.participationPoints) updatePayload.participationPoints = snapshot.participationPoints;
        updatePayload.lastLeaderboardUpdate = new Date().toISOString();

        await change.after.ref.set(updatePayload, { merge: true });
        functions.logger.info('Leaderboard snapshot updated', {
            uid: context.params.userId,
            leaderboardScore: updatePayload.leaderboardScore ?? snapshot.leaderboardScore,
            seasonScore: updatePayload.seasonScore ?? snapshot.seasonScore,
        });
        return null;
    });

const getQuestionAuthorId = (data: admin.firestore.DocumentData | undefined): string | null => {
    if (!data) return null;
    const authorUid = data.author?.uid;
    return typeof authorUid === 'string' && authorUid.trim().length ? authorUid : null;
};

export const onGlobalQuestionCreated = functions.firestore
    .document('questions/{questionId}')
    .onCreate(async (snap) => {
        const authorId = getQuestionAuthorId(snap.data());
        if (!authorId) {
            return null;
        }
        await incrementQuestionCreation(authorId, 1);
        return null;
    });

export const onDuelQuestionCreated = functions.firestore
    .document('duelQuestions/{questionId}')
    .onCreate(async (snap) => {
        const authorId = getQuestionAuthorId(snap.data());
        if (!authorId) {
            return null;
        }
        await incrementQuestionCreation(authorId, 1);
        return null;
    });

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
    if (chunkSize <= 0) return [items];
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        result.push(items.slice(i, i + chunkSize));
    }
    return result;
};

export const refreshLeaderboardSegments = functions.pubsub
    .schedule('every 15 minutes')
    .onRun(async () => {
        const seasonId = getActiveSeasonId();
        const usersSnapshot = await db.collection('users').get();

        const segments = buildSegmentSnapshots(usersSnapshot.docs);
        const seasonRef = db.collection('leaderboards').doc(seasonId);
        const segmentCollection = seasonRef.collection('segments');

        await seasonRef.set({
            seasonId,
            totalPlayers: usersSnapshot.size,
            segmentCount: segments.length,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        const newSegmentIds = new Set(segments.map((segment) => segment.docId));

        const segmentChunks = chunkArray(segments, 400);
        for (const chunk of segmentChunks) {
            const batch = db.batch();
            chunk.forEach((segment) => {
                const docRef = segmentCollection.doc(segment.docId);
                batch.set(docRef, {
                    seasonId,
                    segmentType: segment.segmentType,
                    segmentId: segment.segmentId,
                    label: segment.label,
                    filters: segment.filters,
                    topPlayers: segment.entries,
                    playerCount: segment.entries.length,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            });
            await batch.commit();
        }

        const existingDocs = await segmentCollection.listDocuments();
        const staleDocs = existingDocs.filter((docRef) => !newSegmentIds.has(docRef.id));
        const staleChunks = chunkArray(staleDocs, 450);
        for (const chunk of staleChunks) {
            const batch = db.batch();
            chunk.forEach((docRef) => batch.delete(docRef));
            await batch.commit();
        }

        functions.logger.info('Leaderboard segments refreshed', {
            seasonId,
            segments: segments.length,
            totalPlayers: usersSnapshot.size,
        });

        return null;
    });

const DAILY_MISSION_ASSIGN_LIMIT = 3;
const DAILY_MISSION_USER_LIMIT = 500;

export const assignDailyMissions = functions.pubsub
    .schedule('0 5 * * *')
    .timeZone('Europe/Istanbul')
    .onRun(async () => {
        const missions = await getActiveMissionDefinitions('daily');
        if (!missions.length) {
            functions.logger.info('No active daily missions found.');
            return null;
        }

        const usersSnapshot = await db.collection('users').limit(DAILY_MISSION_USER_LIMIT).get();
        const todayKey = new Date().toISOString().split('T')[0];
        const assignments: Array<Promise<void>> = [];

        usersSnapshot.docs.forEach((userDoc) => {
            assignments.push((async () => {
                const activeRef = userDoc.ref.collection('activeMissions');
                const existingSnapshot = await activeRef
                    .where('frequency', '==', 'daily')
                    .where('assignedDate', '==', todayKey)
                    .get();

                const alreadyAssigned = new Set(existingSnapshot.docs.map((doc) => doc.data().missionId as string));
                if (existingSnapshot.size >= DAILY_MISSION_ASSIGN_LIMIT) {
                    return;
                }

                const available = missions.filter((mission) => !alreadyAssigned.has(mission.id));
                if (!available.length) {
                    return;
                }

                const toAssign = available.slice(0, DAILY_MISSION_ASSIGN_LIMIT - existingSnapshot.size);
                const batch = db.batch();
                toAssign.forEach((mission) => {
                    const instance = buildMissionInstance(mission, todayKey);
                    const docRef = activeRef.doc(`${mission.id}-${todayKey}`);
                    batch.set(docRef, instance);
                });
                await batch.commit();
            })());
        });

        await Promise.all(assignments);
        functions.logger.info('Daily missions assigned', {
            missions: missions.length,
            usersProcessed: usersSnapshot.size,
        });
        return null;
    });

export const expireMissionInstances = functions.pubsub
    .schedule('every 1 hours')
    .onRun(async () => {
        const now = new Date().toISOString();
        const snapshot = await admin
            .firestore()
            .collectionGroup('activeMissions')
            .where('status', '==', 'pending')
            .where('expiresAt', '<', now)
            .limit(500)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const batch = db.batch();
        snapshot.docs.forEach((docSnap) => {
            batch.update(docSnap.ref, {
                status: 'expired',
                expiredAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();
        functions.logger.info('Expired missions cleaned up', { count: snapshot.size });
        return null;
    });

export const reportMissionProgress = functions.https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Giriş yapmanız gerekiyor.');
    }
    const uid = context.auth.uid;
    const targetType: MissionTargetType | undefined = data?.targetType;
    const amount = Number(data?.amount ?? 1);
    const metadata = typeof data?.metadata === 'object' && data.metadata ? data.metadata : {};

    if (!targetType || typeof targetType !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Geçerli bir hedef tipi gerekli.');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Miktar pozitif bir sayı olmalıdır.');
    }
    if (targetType === 'kazanimPractice') {
        if (typeof metadata.kazanimId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'kazanimPractice ilerlemesi için kazanimId gereklidir.');
        }
        if (typeof metadata.isCorrect !== 'boolean') {
            throw new functions.https.HttpsError('invalid-argument', 'kazanimPractice ilerlemesi için isCorrect belirtilmelidir.');
        }
    }

    const missionsRef = db.collection('users').doc(uid).collection('activeMissions');
    let queryRef = missionsRef
        .where('targetType', '==', targetType)
        .where('status', '==', 'pending');

    if (targetType === 'kazanimPractice') {
        queryRef = queryRef.where('practiceConfigKazanimId', '==', metadata.kazanimId);
    }

    const pendingSnapshot = await queryRef.get();

    if (pendingSnapshot.empty) {
        return { updated: 0 };
    }

    let updatedCount = 0;
    await Promise.all(
        pendingSnapshot.docs.map(async (docSnap) => {
            await db.runTransaction(async (transaction) => {
                const missionRef = docSnap.ref;
                const freshSnap = await transaction.get(missionRef);
                if (!freshSnap.exists) {
                    return;
                }
                const mission = freshSnap.data() as any;
                if (mission.status !== 'pending') {
                    return;
                }
                const progress = mission.progress ?? { current: 0, target: mission.target ?? 0 };
                const newCurrent = Math.min(progress.target, progress.current + amount);
                const nowIso = new Date().toISOString();
                const update: Record<string, any> = {
                    'progress.lastUpdatedAt': nowIso,
                };

                if (mission.targetType === 'kazanimPractice' && mission.practiceConfig) {
                    const questionId: string = metadata.questionId;
                    const uniqueIds: string[] = Array.isArray(mission.practiceStats?.uniqueQuestionIds)
                        ? mission.practiceStats.uniqueQuestionIds
                        : [];
                    if (uniqueIds.includes(questionId)) {
                        return;
                    }
                    const updatedIds = [...uniqueIds, questionId];
                    const attempts = updatedIds.length;
                    const correct = (mission.practiceStats?.correct ?? 0) + (metadata.isCorrect ? 1 : 0);
                    const questionTarget = mission.practiceConfig.minQuestions ?? progress.target;
                    const accuracyTarget = mission.practiceConfig.minAccuracy ?? 0;
                    const accuracy = attempts > 0 ? (correct / attempts) * 100 : 0;

                    update['practiceStats.uniqueQuestionIds'] = updatedIds;
                    update['practiceStats.attempts'] = attempts;
                    update['practiceStats.correct'] = correct;
                    update['practiceStats.lastAttemptAt'] = nowIso;
                    if (!mission.practiceStats?.firstAttemptAt) {
                        update['practiceStats.firstAttemptAt'] = nowIso;
                    }
                    update['progress.current'] = Math.min(questionTarget, attempts);

                    const meetsCount = attempts >= questionTarget;
                    const meetsAccuracy = accuracy >= accuracyTarget;

                    if (meetsCount && meetsAccuracy) {
                        update.status = 'completed';
                        update.completedAt = admin.firestore.FieldValue.serverTimestamp();
                    }
                } else {
                    update['progress.current'] = newCurrent;
                    if (newCurrent >= progress.target) {
                        update.status = 'completed';
                    }
                }

                transaction.update(missionRef, update);
                updatedCount += 1;
            });
        })
    );

    return { updated: updatedCount };
});
export const claimMissionReward = functions.https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Giriş yapmanız gerekiyor.');
    }
    const uid = context.auth.uid;
    const missionDocId = data?.missionId;
    if (!missionDocId || typeof missionDocId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'missionId zorunludur.');
    }

    const userRef = db.collection('users').doc(uid);
    const missionRef = userRef.collection('activeMissions').doc(missionDocId);
    const historyRef = userRef.collection('missionHistory').doc();

    await db.runTransaction(async (transaction) => {
        const missionSnap = await transaction.get(missionRef);
        if (!missionSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Görev bulunamadı.');
        }
        const mission = missionSnap.data() as any;
        if (mission.status !== 'completed') {
            throw new functions.https.HttpsError('failed-precondition', 'Görev henüz tamamlanmadı.');
        }

        const rewardPoints = Number(mission.rewardPoints) || 0;
        transaction.update(missionRef, {
            status: 'claimed',
            rewardClaimedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        transaction.update(userRef, {
            missionPoints: admin.firestore.FieldValue.increment(rewardPoints),
        });
        transaction.set(historyRef, {
            missionId: mission.missionId,
            title: mission.title,
            rewardPoints,
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });

    return { claimed: true };
});

export const syncPresenceToFirestore = functions.database

    .ref('/status/{uid}')

    .onWrite(async (change, context) => {

        const uid = context.params.uid;

        if (!uid) {

            console.warn('syncPresenceToFirestore called without uid param.');

            return null;

        }



        logPresenceInvocation(uid);



        const beforeVal = change.before.exists() ? change.before.val() : null;

        const afterVal = change.after.exists() ? change.after.val() : null;

        const userRef = admin.firestore().collection('users').doc(uid);



        if (!afterVal) {

            await userRef.set({

                isOnline: false,

                activeSessionId: null,

                presenceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),

                lastSeen: admin.firestore.FieldValue.serverTimestamp(),

            }, { merge: true });

            functions.logger.info('Presence synchronized (offline)', { uid });

            return null;

        }



        if (beforeVal) {

            const signature = (val: any) => `${Boolean(val?.isOnline)}-${val?.lastSeen ?? 'NA'}-${val?.sessionId ?? 'NA'}`;

            if (signature(beforeVal) === signature(afterVal)) {

                functions.logger.debug('Presence change contains no effective difference; skipping Firestore write.', { uid });

                return null;

            }

        }



        const update: Record<string, any> = {

            isOnline: Boolean(afterVal.isOnline),

            presenceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),

        };



        const isOnline = Boolean(afterVal.isOnline);

        update.isOnline = isOnline;



        if (typeof afterVal.lastSeen === 'number') {

            update.lastSeen = admin.firestore.Timestamp.fromMillis(afterVal.lastSeen);

        } else if (!isOnline) {

            update.lastSeen = admin.firestore.FieldValue.serverTimestamp();

        }



        if (typeof afterVal.updatedAt === 'number') {

            update.presenceUpdatedAt = admin.firestore.Timestamp.fromMillis(afterVal.updatedAt);

        }



        if (afterVal.sessionId) {

            update.activeSessionId = afterVal.sessionId;

        }



        if (afterVal.deviceInfo) {

            update.lastDeviceInfo = afterVal.deviceInfo;

        }



        await userRef.set(update, { merge: true });

        functions.logger.info('Presence synchronized', {

            uid,

            isOnline: update.isOnline,

            sessionId: afterVal.sessionId ?? null,

        });

        return null;

    });

