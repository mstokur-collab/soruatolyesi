import { db, rtdb, functions, auth } from '../firebase';
import { 
    doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot, 
    addDoc, serverTimestamp, writeBatch, runTransaction, getDocs, orderBy, limit, documentId,
    deleteDoc, FirestoreError, QueryConstraint, startAfter, increment
} from 'firebase/firestore';
import { ref, onValue, onDisconnect, set as setRTDB, serverTimestamp as rtdbServerTimestamp } from "firebase/database";
import { httpsCallable } from 'firebase/functions';
import type {
    UserData,
    Question,
    Duel,
    DuelPlayer,
    AnswerRecord,
    QuizQuestion,
    CreditTransaction,
    CreditTransactionsCursor,
    AiCoachReport,
    AiCoachReportRecord,
    LeaderboardSegment,
    MissionInstance,
    MissionTargetType,
} from '../types';
import { normalizeQuestionRecord } from '../utils/questionNormalization';

const DAILY_CREDIT_LIMIT = 0; // GÃ¼nlÃ¼k Ã¼cretsiz bakiye YOK
const MIN_DUEL_QUESTIONS = 5;

const createSessionId = (uid: string): string => {
    return `${uid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const getIsoWeekKey = (date = new Date()): string => {
    const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${temp.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
};

const getClientDeviceInfo = () => {
    if (typeof navigator === 'undefined') {
        return {
            userAgent: 'unknown',
            platform: 'server',
            language: 'en',
            vendor: 'unknown',
        };
    }

    const { userAgent, platform, language, vendor } = navigator;
    return {
        userAgent,
        platform,
        language,
        vendor,
    };
};

const sanitizeModeKey = (value: string): string => {
    return value
        ?.toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'unknown';
};

interface AiCreditTransactionParams {
    uid: string;
    amount: number;
    reason: string;
    metadata?: Record<string, any>;
}

interface ListCreditTransactionsOptions {
    limit?: number;
    cursor?: CreditTransactionsCursor | null;
}

// =================================================================
// USER DATA MANAGEMENT
// =================================================================

export const getDefaultUserData = (uid: string, displayName: string, photoURL?: string): UserData => ({
    uid,
    displayName: displayName || 'Anonim KullanÄ±cÄ±',
    photoURL: photoURL || '',
    highScores: [],
    solvedQuestionIds: [],
    answerHistory: [],
    documentLibrary: [],
    generatedExams: [],
    aiCredits: 20, // Ä°lk kayÄ±t bonusu
    lastCreditReset: new Date().toISOString().split('T')[0],
    duelWins: 0,
    duelLosses: 0,
    duelTickets: 0, // Ba�lang��ta bilet yok
    leaderboardScore: 0,
    seasonScore: 0,
    skillPoints: 0,
    participationPoints: 0,
    lastLeaderboardUpdate: new Date().toISOString(),
    aiCoachLimits: {
        dailyWindow: new Date().toISOString().split('T')[0],
        dailyCount: 0,
        weeklyWindow: getIsoWeekKey(),
        weeklyCount: 0,
    },
    creditPlan: 'free',
    entitlements: {
        examGenerator: false,
    },
    missionPoints: 0,
    participationStats: {
        questionsCreated: 0,
        modePlays: {},
    },
});

export const getActiveSeasonId = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `${year}-Q${quarter}`;
};

export const getSeasonLeaderboardSegments = async (): Promise<LeaderboardSegment[]> => {
    if (!db) return [];
    const seasonId = getActiveSeasonId();
    const segmentsRef = collection(db, 'leaderboards', seasonId, 'segments');
    const snapshot = await getDocs(segmentsRef);
    return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<LeaderboardSegment, 'id'>),
    }));
};

export const subscribeToActiveMissions = (
    uid: string,
    callback: (missions: MissionInstance[]) => void,
    onError?: (error: FirestoreError) => void
) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    const missionsRef = collection(db, 'users', uid, 'activeMissions');
    const missionsQuery = query(missionsRef, orderBy('assignedAt', 'desc'));
    return onSnapshot(missionsQuery, (snapshot) => {
        const data = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<MissionInstance, 'id'>),
        }));
        callback(data);
    }, onError);
};

const callFunction = async <T = unknown, R = unknown>(name: string, data: T): Promise<R> => {
    if (!functions) {
        throw new Error('Cloud Functions not initialized.');
    }
    const callable = httpsCallable(functions, name);
    const result = await callable(data);
    return result.data as R;
};

export const reportMissionProgress = async (
    targetType: MissionTargetType,
    amount: number,
    metadata?: Record<string, any>
) => {
    await callFunction('reportMissionProgress', {
        targetType,
        amount,
        metadata,
    });
};

export const claimMissionReward = async (missionId: string) => {
    await callFunction('claimMissionReward', { missionId });
};

export const ensureDailyMissions = async (): Promise<{ assigned: number }> => {
    return callFunction('ensureDailyMissions', {});
};

export const getUserData = async (uid: string): Promise<UserData | null> => {
    if (!db) return null;
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() ? userDoc.data() as UserData : null;
};

export const createUserData = async (uid: string, displayName: string, photoURL?: string): Promise<UserData> => {
    if (!db) throw new Error("Firestore not initialized.");
    const newUser = getDefaultUserData(uid, displayName, photoURL);
    await setDoc(doc(db, 'users', uid), newUser);
    return newUser;
};

export const updateUserData = async (uid: string, data: Partial<UserData>): Promise<void> => {
    if (!db) return;
    const userDocRef = doc(db, 'users', uid);
    // Use setDoc with merge option to handle both new and existing documents
    await setDoc(userDocRef, data, { merge: true });
};

export const recordQuestionCreation = async (uid: string, questionCount: number): Promise<void> => {
    if (!db || !uid || questionCount <= 0) return;
    const userDocRef = doc(db, 'users', uid);
    try {
        await updateDoc(userDocRef, {
            'participationStats.questionsCreated': increment(questionCount),
            'participationStats.lastQuestionCreatedAt': serverTimestamp(),
        });
        
        // Mission tracking için
        await reportMissionProgress('questionsCreated', questionCount);
    } catch (error) {
        console.warn('recordQuestionCreation failed:', error);
    }
};

export const recordExamCreation = async (uid: string): Promise<void> => {
    if (!db || !uid) return;
    try {
        await reportMissionProgress('examsCreated', 1);
    } catch (error) {
        console.warn('recordExamCreation failed:', error);
    }
};

export const recordModePlay = async (uid: string, modeKey: string): Promise<void> => {
    if (!db || !uid || !modeKey) return;
    const userDocRef = doc(db, 'users', uid);
    const sanitizedKey = sanitizeModeKey(modeKey);
    if (!sanitizedKey) return;
    try {
        await updateDoc(userDocRef, {
            [`participationStats.modePlays.${sanitizedKey}.count`]: increment(1),
            [`participationStats.modePlays.${sanitizedKey}.lastPlayedAt`]: serverTimestamp(),
            'participationStats.lastModePlayedAt': serverTimestamp(),
        });
    } catch (error) {
        console.warn('recordModePlay failed:', error);
    }
};

// =================================================================
// AI CREDIT MANAGEMENT
// =================================================================

export const deductAiCredits = async ({ uid, amount, reason, metadata }: AiCreditTransactionParams): Promise<number> => {
    if (!db) throw new Error("Firestore not initialized.");
    if (amount <= 0) {
        throw new Error("Kredi dÃ¼ÅŸÃ¼mÃ¼ iÃ§in pozitif bir tutar gerekli.");
    }

    const userDocRef = doc(db, 'users', uid);

    return await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(userDocRef);
        if (!snapshot.exists()) {
            throw new Error("KullanÄ±cÄ± bulunamadÄ±.");
        }

        const userData = snapshot.data() as UserData;
        const currentCredits = Number(userData.aiCredits ?? 0);

        if (currentCredits < amount) {
            throw new Error("Yetersiz kredi.");
        }

        const newCredits = Math.max(0, currentCredits - amount);
        transaction.update(userDocRef, { aiCredits: newCredits });

        const logCollection = collection(userDocRef, 'creditTransactions');
        const logRef = doc(logCollection);
        transaction.set(logRef, {
            type: reason,
            amount: -amount,
            before: currentCredits,
            after: newCredits,
            metadata: metadata ?? {},
            createdAt: serverTimestamp(),
        });

        return newCredits;
    });
};

export const refundAiCredits = async ({ uid, amount, reason, metadata }: AiCreditTransactionParams): Promise<number> => {
    if (!db) throw new Error("Firestore not initialized.");
    if (amount <= 0) {
        throw new Error("Kredi iadesi iÃ§in pozitif bir tutar gerekli.");
    }

    const userDocRef = doc(db, 'users', uid);

    return await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(userDocRef);
        if (!snapshot.exists()) {
            throw new Error("KullanÄ±cÄ± bulunamadÄ±.");
        }

        const userData = snapshot.data() as UserData;
        const currentCredits = Number(userData.aiCredits ?? 0);
        const newCredits = currentCredits + amount;

        transaction.update(userDocRef, { aiCredits: newCredits });

        const logCollection = collection(userDocRef, 'creditTransactions');
        const logRef = doc(logCollection);
        transaction.set(logRef, {
            type: reason,
            amount,
            before: currentCredits,
            after: newCredits,
            metadata: metadata ?? {},
            createdAt: serverTimestamp(),
        });

        return newCredits;
    });
};

export const grantAiCredits = async (params: AiCreditTransactionParams): Promise<number> => {
    return refundAiCredits(params);
};

export const listCreditTransactions = async (
    uid: string,
    options: ListCreditTransactionsOptions = {}
): Promise<{ transactions: CreditTransaction[]; cursor: CreditTransactionsCursor | null }> => {
    if (!db) throw new Error("Firestore not initialized.");
    const { limit: limitValue = 10, cursor } = options;

    const transactionsCollection = collection(db, 'users', uid, 'creditTransactions');
    const constraints: QueryConstraint[] = [
        orderBy('createdAt', 'desc'),
        orderBy(documentId(), 'desc'),
        limit(limitValue),
    ];

    if (cursor?.docId) {
        constraints.push(startAfter(cursor.createdAt ?? null, cursor.docId));
    }

    const q = query(transactionsCollection, ...constraints);
    const snapshot = await getDocs(q);

    const transactions: CreditTransaction[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<CreditTransaction, 'id'>),
    }));

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor: CreditTransactionsCursor | null = lastDoc
        ? {
            createdAt: lastDoc.get('createdAt') ?? null,
            docId: lastDoc.id,
        }
        : null;

    return { transactions, cursor: nextCursor };
};

export const onUserChanges = (
    uid: string,
    callback: (userData: UserData | null) => void,
    onError?: (error: FirestoreError) => void
): (() => void) => {
    if (!db) return () => {};
    const userDocRef = doc(db, 'users', uid);
    return onSnapshot(
        userDocRef,
        (doc) => {
            callback(doc.exists() ? doc.data() as UserData : null);
        },
        (error) => {
            console.error('onUserChanges listener failed:', error);
            onError?.(error);
        }
    );
};

export const addQuestionsToGlobalPool = async (questions: Partial<Question>[]): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    const batch = writeBatch(db);
    const questionsCollection = collection(db, 'questions');

    questions.forEach(question => {
        const docRef = doc(questionsCollection);
        batch.set(docRef, {
            ...question,
            id: docRef.id,
        });
    });

    await batch.commit();
};

export const fetchGlobalQuestions = async (subjectId: string): Promise<Question[]> => {
    if (!db) return [];
    const q = query(collection(db, 'questions'), where('subjectId', '==', subjectId));
    const querySnapshot = await getDocs(q);
    const questions: Question[] = [];
    querySnapshot.forEach((docSnapshot) => {
        const normalized = normalizeQuestionRecord(docSnapshot.data());
        if (normalized) {
            questions.push(normalized);
        }
    });
    return questions;
};

export const markUserOnline = async (uid: string): Promise<void> => {
    if (!db) return;
    try {
        await setDoc(doc(db, 'users', uid), { isOnline: true }, { merge: true });
    } catch (error) {
        console.error('Failed to mark user online:', error);
    }
};

export const markUserOffline = async (uid: string): Promise<void> => {
    if (!db) return;
    try {
        await setDoc(doc(db, 'users', uid), { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
    } catch (error) {
        console.error('Failed to mark user offline:', error);
    }
};

export const setupPresenceManagement = (uid: string): (() => void) => {
    if (!db) {
        return () => {};
    }

    const sessionId = createSessionId(uid);
    const deviceInfo = getClientDeviceInfo();
    const buildPresencePayload = (isOnline: boolean) => ({
        sessionId,
        deviceInfo,
        isOnline,
        lastSeen: rtdbServerTimestamp(),
        updatedAt: rtdbServerTimestamp(),
    });

    const goOnline = () => { void markUserOnline(uid); };
    const goOffline = () => { void markUserOffline(uid); };

    // ✅ ENHANCED: Beacon API için offline marking (daha güvenilir)
    const goOfflineSync = () => {
        // Beacon API kullanarak sync request gönder (beforeunload için ideal)
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            try {
                // Beacon API ile offline durumunu işaretle
                // Not: Bu gerçek bir API endpoint gerektirmez, sadece browser'ın 
                // async olarak işlemi tamamlamasını sağlar
                const blob = new Blob([JSON.stringify({ uid, action: 'offline', timestamp: Date.now() })], 
                    { type: 'application/json' });
                navigator.sendBeacon('/offline-beacon', blob);
            } catch (error) {
                console.warn('Beacon API failed, falling back to normal offline marking:', error);
            }
        }
        goOffline();
    };

    if (!rtdb) {
        goOnline();
        
        // ✅ ENHANCED: Browser event listeners ekle
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                goOffline();
            } else if (document.visibilityState === 'visible') {
                goOnline();
            }
        };

        const handlePageHide = () => {
            goOfflineSync();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
            goOffline();
        };
    }

    const userStatusDatabaseRef = ref(rtdb, `/status/${uid}`);
    const presenceRef = ref(rtdb, '.info/connected');
    let hasConnected = false;

    // ✅ ENHANCED: Visibility API desteği ekle
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            goOffline();
            // RTDB'ye de offline durumunu yaz
            setRTDB(userStatusDatabaseRef, buildPresencePayload(false)).catch((err) => {
                console.warn('Failed to update RTDB on visibility hidden:', err);
            });
        } else if (document.visibilityState === 'visible') {
            goOnline();
            // RTDB'ye de online durumunu yaz
            setRTDB(userStatusDatabaseRef, buildPresencePayload(true)).catch((err) => {
                console.warn('Failed to update RTDB on visibility visible:', err);
            });
        }
    };

    const handlePageHide = () => {
        goOfflineSync();
        setRTDB(userStatusDatabaseRef, buildPresencePayload(false)).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    const unsubscribe = onValue(presenceRef, (snapshot) => {
        if (snapshot.val() === false) {
            if (hasConnected) {
                goOffline();
            }
            return;
        }

        hasConnected = true;
        onDisconnect(userStatusDatabaseRef)
            .set(buildPresencePayload(false))
            .then(() => {
                return setRTDB(userStatusDatabaseRef, buildPresencePayload(true)).catch(() => {});
            })
            .catch((err) => {
                console.error('Failed to configure presence disconnect handler:', err);
            })
            .finally(() => {
                goOnline();
            });
    });

    return () => {
        // Cleanup: Tüm event listener'ları kaldır
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('beforeunload', handlePageHide);
        
        // RTDB cleanup
        unsubscribe();
        onDisconnect(userStatusDatabaseRef).cancel().catch(() => {});
        setRTDB(userStatusDatabaseRef, buildPresencePayload(false)).catch(() => {});
        
        // Firestore cleanup
        goOffline();
    };
};

// =================================================================
// DUEL QUESTION POOL MANAGEMENT
// =================================================================

export const addQuestionsToDuelPool = async (questions: Partial<Question>[]): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    const batch = writeBatch(db);
    const duelQuestionsCollection = collection(db, 'duelQuestions');

    questions.forEach(question => {
        const docRef = doc(duelQuestionsCollection);
        batch.set(docRef, {
            ...question,
            id: docRef.id,
        });
    });

    await batch.commit();
};

export const fetchDuelQuestions = async (subjectId: string): Promise<Question[]> => {
    if (!db) return [];
    const q = query(collection(db, 'duelQuestions'), where('subjectId', '==', subjectId));
    const querySnapshot = await getDocs(q);
    const questions: Question[] = [];
    querySnapshot.forEach((docSnapshot) => {
        const normalized = normalizeQuestionRecord(docSnapshot.data());
        if (normalized) {
            questions.push(normalized);
        }
    });
    return questions;
};

export const getQuestionsByIds = async (questionIds: string[], fromDuelPool: boolean = false): Promise<Question[]> => {
    if (!db || questionIds.length === 0) return [];
    // Firestore 'in' query supports up to 30 items
    const chunks = [];
    for (let i = 0; i < questionIds.length; i += 30) {
        chunks.push(questionIds.slice(i, i + 30));
    }

    const collectionName = fromDuelPool ? 'duelQuestions' : 'questions';
    const questions: Question[] = [];
    for (const chunk of chunks) {
        const q = query(collection(db, collectionName), where(documentId(), 'in', chunk));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnapshot) => {
            const normalized = normalizeQuestionRecord(docSnapshot.data());
            if (normalized) {
                questions.push(normalized);
            }
        });
    }

    // Preserve original order
    return questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];
};

export const deleteQuestionFromGlobalPool = async (questionId: string): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    await deleteDoc(doc(db, "questions", questionId));
};

// =================================================================
// CURRICULUM MANAGEMENT
// =================================================================

export const getGlobalCurriculum = async (): Promise<UserData['customCurriculum'] | null> => {
    if (!db) return null;
    const curriculumDocRef = doc(db, 'global', 'curriculum');
    const docSnap = await getDoc(curriculumDocRef);
    return docSnap.exists() ? docSnap.data().data : null;
};

export const updateGlobalCurriculum = async (data: UserData['customCurriculum']): Promise<void> => {
    if (!db) return;
    const curriculumDocRef = doc(db, 'global', 'curriculum');
    await setDoc(curriculumDocRef, { data });
};

// =================================================================
// LEADERBOARD
// =================================================================

export const getLeaderboardData = async (): Promise<UserData[]> => {
    if (!db) return [];
    const q = query(collection(db, 'users'), orderBy('duelWins', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    const leaderboard: UserData[] = [];
    querySnapshot.forEach((doc) => {
        leaderboard.push(doc.data() as UserData);
    });
    return leaderboard;
};

// =================================================================
// DUEL MANAGEMENT
// =================================================================

export const createDuelInDb = async (
    challenger: UserData, 
    opponent: UserData,
    subjectId?: string,
    topic?: string,
    kazanimId?: string
): Promise<string> => {
    if (!db) throw new Error("Firestore not initialized.");

    // Check if there's already an active duel invitation
    const q = query(collection(db, 'duels'), 
        where('challengerId', '==', challenger.uid), 
        where('opponentId', '==', opponent.uid),
        where('status', '==', 'pending')
    );
    const existingDuels = await getDocs(q);
    if (!existingDuels.empty) {
        throw new Error("Bu oyuncuya zaten bir davet gÃ¶ndermiÅŸsiniz.");
    }

    const grade = challenger.sinif || 8;
    let filtersFallbackUsed = false;
    let selectedSubjectId = subjectId;
    let selectedTopic = topic;
    let selectedKazanimId = kazanimId;

    const fetchQuestionBatch = async (constraints: QueryConstraint[]): Promise<QuizQuestion[]> => {
        const questionsQuery = query(
            collection(db, 'duelQuestions'),
            where('type', '==', 'quiz'),
            where('grade', '==', grade),
            ...constraints,
            limit(20)
        );
        const snapshot = await getDocs(questionsQuery);
        // Filter out malformed quiz entries to avoid runtime crashes during gameplay
        return snapshot.docs
            .map(doc => normalizeQuestionRecord<QuizQuestion>(doc.data() as QuizQuestion))
            .filter((question): question is QuizQuestion =>
                question &&
                Array.isArray(question.options) &&
                question.options.length >= 2 &&
                typeof question.answer === 'string'
            );
    };

    let questionPool: QuizQuestion[] = [];

    if (subjectId && topic && kazanimId) {
        questionPool = await fetchQuestionBatch([
            where('subjectId', '==', subjectId),
            where('topic', '==', topic),
            where('kazanimId', '==', kazanimId),
        ]);

        if (questionPool.length < MIN_DUEL_QUESTIONS) {
            filtersFallbackUsed = true;
            selectedKazanimId = undefined;
            questionPool = await fetchQuestionBatch([
                where('subjectId', '==', subjectId),
                where('topic', '==', topic),
            ]);
        }

        if (questionPool.length < MIN_DUEL_QUESTIONS) {
            selectedTopic = undefined;
            selectedKazanimId = undefined;
            questionPool = await fetchQuestionBatch([
                where('subjectId', '==', subjectId),
            ]);
        }
    } else if (subjectId && topic) {
        questionPool = await fetchQuestionBatch([
            where('subjectId', '==', subjectId),
            where('topic', '==', topic),
        ]);

        if (questionPool.length < MIN_DUEL_QUESTIONS) {
            filtersFallbackUsed = true;
            selectedTopic = undefined;
            questionPool = await fetchQuestionBatch([
                where('subjectId', '==', subjectId),
            ]);
        }
    } else if (subjectId) {
        questionPool = await fetchQuestionBatch([
            where('subjectId', '==', subjectId),
        ]);
    } else {
        filtersFallbackUsed = true;
        questionPool = await fetchQuestionBatch([]);
    }

    if (questionPool.length < MIN_DUEL_QUESTIONS) {
        throw new Error("Duello icin yeterli soru bulunamadi. Lutfen farkli bir kriter secin veya soru havuzuna katkida bulunun.");
    }

    const selectedQuestions = questionPool
        .sort(() => 0.5 - Math.random())
        .slice(0, MIN_DUEL_QUESTIONS);
    const questionIds = selectedQuestions.map(q => q.id);

    const challengerPlayer: DuelPlayer = {
        uid: challenger.uid,
        name: challenger.displayName,
        photoURL: challenger.photoURL,
        score: 0,
        selection: null,
        pauseAttemptsLeft: 1,
        rematchRequested: false,
    };
    const opponentPlayer: DuelPlayer = {
        uid: opponent.uid,
        name: opponent.displayName,
        photoURL: opponent.photoURL,
        score: 0,
        selection: null,
        pauseAttemptsLeft: 1,
        rematchRequested: false,
    };

    // FIX: Firestore doesn't accept undefined values, remove them
    const newDuel: any = {
        challengerId: challenger.uid,
        opponentId: opponent.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        players: {
            [challenger.uid]: challengerPlayer,
            [opponent.uid]: opponentPlayer,
        },
        questionIds,
        currentQuestionIndex: 0,
        roundState: 'starting',
        roundWinnerId: null,
        roundStartedAt: null,
        pausedBy: null,
        pauseEndsAt: null,
        gameWinnerId: null,
        selectedGrade: grade,
        filtersFallbackUsed,
    };

    // Only add optional fields if they have values
    if (selectedSubjectId) {
        newDuel.selectedSubjectId = selectedSubjectId;
    }
    if (selectedTopic) {
        newDuel.selectedTopic = selectedTopic;
    }
    if (selectedKazanimId) {
        newDuel.selectedKazanimId = selectedKazanimId;
    }

    const duelDocRef = await addDoc(collection(db, 'duels'), newDuel);
    return duelDocRef.id;
};

export const onIncomingDuels = (uid: string, callback: (duel: Duel) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(
        collection(db, 'duels'),
        where('opponentId', '==', uid),
        where('status', '==', 'pending')
    );
    return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                callback({ id: change.doc.id, ...change.doc.data() } as Duel);
            }
        });
    });
};

export const onDuelChanges = (duelId: string, callback: (duel: Duel | null) => void): (() => void) => {
    if (!db) return () => {};
    return onSnapshot(doc(db, 'duels', duelId), (doc) => {
        callback(doc.exists() ? { id: doc.id, ...doc.data() } as Duel : null);
    });
};

export const acceptDuelChallenge = async (duelId: string): Promise<void> => {
    if (!db) return;
    await updateDoc(doc(db, 'duels', duelId), { status: 'in-progress', roundState: 'asking', roundStartedAt: serverTimestamp() });
};

export const rejectDuelChallenge = async (duelId: string): Promise<void> => {
    if (!db) return;
    await updateDoc(doc(db, 'duels', duelId), { status: 'rejected' });
};

export const submitDuelAnswer = async (duelId: string, userId: string, questionIndex: number, answer: string, currentQuestion: QuizQuestion): Promise<void> => {
    if (!db) return;
    const duelRef = doc(db, 'duels', duelId);

    try {
        await runTransaction(db, async (transaction) => {
            const duelDoc = await transaction.get(duelRef);
            if (!duelDoc.exists()) {
                throw new Error("DÃ¼ello bulunamadÄ±!");
            }

            const duelData = duelDoc.data() as Duel;
            
            // FIX: Daha gÃ¼venli state kontrolleri
            if (duelData.roundState !== 'asking') {
                console.warn('Round state is not asking:', duelData.roundState);
                return; // Sessizce Ã§Ä±k, Ã§Ã¼nkÃ¼ round zaten bitmiÅŸ olabilir
            }

            // FIX: Timeout iÃ§in Ã¶zel kontrol - timeout hem 'userId' hem de 'selection' olarak gelir
            const isTimeout = userId === 'timeout' && answer === 'timeout';
            
            if (!isTimeout && duelData.players[userId]?.selection !== null) {
                console.warn('Player already answered:', userId);
                return; // Oyuncu zaten cevaplamÄ±ÅŸ
            }

            // Get opponent info
            const opponentId = Object.keys(duelData.players).find(id => id !== userId);
            if (!opponentId) {
                throw new Error("Rakip bulunamadÄ±!");
            }
            
            const opponent = duelData.players[opponentId];
            const correctAnswer = currentQuestion.answer;

            // FIX: Timeout durumu - kimse cevaplamamÄ±ÅŸ
            if (isTimeout) {
                // Her iki oyuncu da cevaplamamÄ±ÅŸ, tur berabere biter
                transaction.update(duelRef, { 
                    roundState: 'finished', 
                    roundWinnerId: null 
                });
                return;
            }

            // Normal cevap - Update player's selection
            transaction.update(duelRef, { [`players.${userId}.selection`]: answer });

            // Check if opponent has also answered
            if (opponent.selection !== null) {
                // Both players have answered, determine winner
                const mySelection = answer;
                const opponentSelection = opponent.selection;

                let roundWinnerId: string | null = null;
                const iAmCorrect = mySelection === correctAnswer;
                const opponentIsCorrect = opponentSelection === correctAnswer;

                if (iAmCorrect && !opponentIsCorrect) {
                    roundWinnerId = userId;
                } else if (!iAmCorrect && opponentIsCorrect) {
                    roundWinnerId = opponentId;
                }
                // If both correct or both wrong, winner is null (draw)

                const updates: Partial<Duel> & { [key: string]: any } = { 
                    roundState: 'finished', 
                    roundWinnerId 
                };

                if (roundWinnerId) {
                    updates[`players.${roundWinnerId}.score`] = (duelData.players[roundWinnerId].score || 0) + 10;
                }
                
                transaction.update(duelRef, updates);
            }
            // Else: wait for opponent to answer
        });
    } catch (error) {
        console.error('submitDuelAnswer error:', error);
        throw error;
    }
};

// FIX: User stats gÃ¼ncellemesini transaction dÄ±ÅŸÄ±na taÅŸÄ± - performans iyileÅŸtirmesi
const updateDuelStats = async (winnerId: string, loserId: string): Promise<void> => {
    if (!db) return;
    
    try {
        const winnerRef = doc(db, 'users', winnerId);
        const loserRef = doc(db, 'users', loserId);
        
        // Paralel olarak oku
        const [winnerDoc, loserDoc] = await Promise.all([
            getDoc(winnerRef),
            getDoc(loserRef)
        ]);

        // Batch update kullan - transaction'dan daha hÄ±zlÄ±
        const batch = writeBatch(db);
        
        if (winnerDoc.exists()) {
            batch.update(winnerRef, { 
                duelWins: (Number(winnerDoc.data()?.duelWins) || 0) + 1 
            });
        }
        
        if (loserDoc.exists()) {
            batch.update(loserRef, { 
                duelLosses: (Number(loserDoc.data()?.duelLosses) || 0) + 1 
            });
        }
        
        await batch.commit();

        if (auth?.currentUser?.uid === winnerId) {
            await reportMissionProgress('duelWins', 1).catch((error) => {
                console.warn('reportMissionProgress duelWins failed:', error);
            });
        }
    } catch (error) {
        console.error('Failed to update duel stats:', error);
        // Don't throw - stats update failure shouldn't break the game
    }
};

export const advanceToNextRound = async (duelId: string): Promise<void> => {
    if (!db) return;
    const duelRef = doc(db, 'duels', duelId);

    try {
        await runTransaction(db, async (transaction) => {
            const duelDoc = await transaction.get(duelRef);
            if (!duelDoc.exists()) {
                throw new Error("DÃ¼ello bulunamadÄ±!");
            }
            
            const duelData = duelDoc.data() as Duel;
            
            // FIX: State kontrolÃ¼ ekle
            if (duelData.roundState !== 'finished') {
                console.warn('Attempting to advance round but state is not finished:', duelData.roundState);
                return;
            }
            
            const nextQuestionIndex = duelData.currentQuestionIndex + 1;

            if (nextQuestionIndex >= duelData.questionIds.length) {
                // Game Over
                const player1 = Object.values(duelData.players)[0] as DuelPlayer;
                const player2 = Object.values(duelData.players)[1] as DuelPlayer;
                let gameWinnerId: string | null = null;

                if (player1.score > player2.score) {
                    gameWinnerId = player1.uid;
                } else if (player2.score > player1.score) {
                    gameWinnerId = player2.uid;
                }
                
                // FIX: Sadece duel document'Ä± gÃ¼ncelle
                transaction.update(duelRef, { 
                    roundState: 'gameover', 
                    status: 'completed', 
                    gameWinnerId 
                });

                // FIX: User stats'Ä± transaction dÄ±ÅŸÄ±nda gÃ¼ncelle (non-blocking)
                // Bu sayede transaction lock sÃ¼resi kÄ±salÄ±r
                if (gameWinnerId) {
                    const loserId = gameWinnerId === player1.uid ? player2.uid : player1.uid;
                    // Asenkron olarak Ã§alÄ±ÅŸtÄ±r, transaction'Ä± bekleme
                    updateDuelStats(gameWinnerId, loserId).catch(err => {
                        console.error('Stats update failed:', err);
                    });
                }

            } else {
                // Advance to next question
                const players = { ...duelData.players };
                Object.keys(players).forEach(uid => {
                    players[uid].selection = null;
                });

                transaction.update(duelRef, {
                    currentQuestionIndex: nextQuestionIndex,
                    roundState: 'asking',
                    roundStartedAt: serverTimestamp(),
                    roundWinnerId: null,
                    players: players,
                });
            }
        });
    } catch (error) {
        console.error('advanceToNextRound error:', error);
        throw error;
    }
};

export const requestRematch = async (duelId: string, userId: string): Promise<void> => {
    if (!db) return;
    await updateDoc(doc(db, 'duels', duelId), { [`players.${userId}.rematchRequested`]: true });
};

export const setNextDuel = async (oldDuelId: string, newDuelId: string): Promise<void> => {
    if (!db) return;
    await updateDoc(doc(db, 'duels', oldDuelId), { nextDuelId: newDuelId });
};

export const declareWinnerOnDisconnect = async (duelId: string, winnerId: string): Promise<void> => {
    if (!db) return;
    const duelRef = doc(db, 'duels', duelId);
    const duelDoc = await getDoc(duelRef);
    if(duelDoc.exists() && duelDoc.data().status === 'in-progress') {
       await updateDoc(duelRef, { status: 'disconnected', gameWinnerId: winnerId });
    }
};

export const requestPause = async (duelId: string, userId: string): Promise<void> => {
    if (!db) return;
    const duelRef = doc(db, 'duels', duelId);
    await runTransaction(db, async (transaction) => {
        const duelDoc = await transaction.get(duelRef);
        if (!duelDoc.exists()) throw new Error("DÃ¼ello bulunamadÄ±.");
        const duelData = duelDoc.data() as Duel;
        if (duelData.roundState !== 'asking') throw new Error("Sadece soru sÄ±rasÄ±nda mola verilebilir.");
        if (duelData.players[userId].pauseAttemptsLeft <= 0) throw new Error("Mola hakkÄ±nÄ±z kalmadÄ±.");

        transaction.update(duelRef, {
            roundState: 'paused',
            pausedBy: userId,
            // Firestore server timestamp can't be used for future dates directly in rules/client-side logic,
            // but we can set it and use a cloud function or client-side timer to resume.
            // For simplicity here, we rely on a client-side timer in DuelGameScreen.
            pauseEndsAt: serverTimestamp(),
            [`players.${userId}.pauseAttemptsLeft`]: duelData.players[userId].pauseAttemptsLeft - 1,
        });
    });
};

export const resumeDuel = async (duelId: string): Promise<void> => {
    if (!db) return;
    await updateDoc(doc(db, 'duels', duelId), {
        roundState: 'asking',
        pausedBy: null,
        pauseEndsAt: null,
        roundStartedAt: serverTimestamp(),
    });
};

export const forfeitDuel = async (duelId: string, forfeiterId: string): Promise<void> => {
    if (!db) return;
    const duelDoc = await getDoc(doc(db, 'duels', duelId));
    if(!duelDoc.exists()) return;

    const duelData = duelDoc.data() as Duel;
    const winnerId = Object.keys(duelData.players).find(id => id !== forfeiterId);
    
    await updateDoc(doc(db, 'duels', duelId), {
        status: 'completed',
        roundState: 'gameover',
        gameWinnerId: winnerId
    });
};

// =================================================================
// DUEL TICKETS MANAGEMENT
// =================================================================

export const awardDuelTicket = async (uid: string): Promise<void> => {
    if (!db) return;
    const userDocRef = doc(db, 'users', uid);
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) throw new Error("KullanÄ±cÄ± bulunamadÄ±.");
        const userData = userDoc.data() as UserData;
        transaction.update(userDocRef, { duelTickets: (userData.duelTickets || 0) + 1 });
    });
};

export const useDuelTicket = async (uid: string): Promise<void> => {
    if (!db) return;
    const userDocRef = doc(db, 'users', uid);
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) throw new Error("KullanÄ±cÄ± bulunamadÄ±.");
        const userData = userDoc.data() as UserData;
        const currentTickets = userData.duelTickets || 0;
        if (currentTickets <= 0) {
            throw new Error("DÃ¼ello bileti yok.");
        }
        transaction.update(userDocRef, { duelTickets: currentTickets - 1 });
    });
};

// =================================================================
// ADMIN MANAGEMENT
// =================================================================

export const grantSuperAdminAccess = async (uid: string, email: string): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
        throw new Error("KullanÄ±cÄ± bulunamadÄ±.");
    }

    const existingData = userDoc.data() as UserData;
    
    await updateDoc(userDocRef, {
        isAdmin: true,
        isSuperAdmin: true,
        email: email,
        adminPermissions: {
            unlimitedCredits: true,
            canEditAllContent: true,
            canDeleteAllContent: true,
            canManageUsers: true,
            canAccessAdminPanel: true,
        },
        aiCredits: 999999, // SÄ±nÄ±rsÄ±z bakiye
        creditPlan: 'pro',
        entitlements: {
            ...(existingData.entitlements ?? {}),
            examGenerator: true,
        },
    });
};

export const checkAdminStatus = async (uid: string): Promise<boolean> => {
    if (!db) return false;
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return false;
    const userData = userDoc.data() as UserData;
    return userData.isAdmin === true || userData.isSuperAdmin === true;
};

export const getAllUsers = async (): Promise<UserData[]> => {
    if (!db) return [];
    const usersQuery = query(collection(db, 'users'), limit(100));
    const querySnapshot = await getDocs(usersQuery);
    const users: UserData[] = [];
    querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserData);
    });
    return users;
};

export const updateUserAdminStatus = async (uid: string, isAdmin: boolean, isSuperAdmin: boolean = false): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
        isAdmin,
        isSuperAdmin,
        ...(isAdmin && {
            adminPermissions: {
                unlimitedCredits: true,
                canEditAllContent: true,
                canDeleteAllContent: true,
                canManageUsers: isSuperAdmin,
                canAccessAdminPanel: true,
            }
        })
    });
};

// =================================================================
// ONLINE USERS TRACKING
// =================================================================

const fetchFirestoreOnlineUsers = async (): Promise<UserData[]> => {
    if (!db) return [];

    const q = query(
        collection(db, 'users'),
        where('isOnline', '==', true),
        limit(100)
    );

    const snapshot = await getDocs(q);
    const users: UserData[] = [];
    snapshot.forEach((docSnapshot) => {
        users.push(docSnapshot.data() as UserData);
    });
    return users;
};

const subscribeOnlineUsersViaFirestore = (callback: (users: UserData[]) => void): (() => void) => {
    if (!db) return () => {};

    const q = query(
        collection(db, 'users'),
        where('isOnline', '==', true),
        limit(100)
    );

    return onSnapshot(q, (snapshot) => {
        const users: UserData[] = [];
        snapshot.forEach((docSnapshot) => {
            users.push(docSnapshot.data() as UserData);
        });
        callback(users);
    });
};

const subscribeOnlineUsersViaRealtimeDb = (callback: (users: UserData[]) => void): (() => void) => {
    if (!rtdb || !db) {
        return subscribeOnlineUsersViaFirestore(callback);
    }

    const statusRef = ref(rtdb, '/status');
    const profileCache = new Map<string, UserData>();
    const profileSubscriptions = new Map<string, () => void>();

    const ensureProfileSubscription = (uid: string) => {
        if (!db || profileSubscriptions.has(uid)) return;
        const userDocRef = doc(db, 'users', uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                profileCache.set(uid, docSnapshot.data() as UserData);
            }
        }, (error) => {
            console.error('Presence profile listener error:', error);
        });
        profileSubscriptions.set(uid, unsubscribe);
    };

    const releaseStaleSubscriptions = (activeUids: Set<string>) => {
        profileSubscriptions.forEach((unsubscribe, uid) => {
            if (!activeUids.has(uid)) {
                unsubscribe();
                profileSubscriptions.delete(uid);
                profileCache.delete(uid);
            }
        });
    };

    const processSnapshot = async (snapshot: any) => {
        try {
            const statusData = snapshot.val() as Record<string, any> | null;
            if (!statusData) {
                callback(await fetchFirestoreOnlineUsers());
                releaseStaleSubscriptions(new Set<string>());
                return;
            }

            const onlineEntries = Object.entries(statusData)
                .filter(([, value]) => Boolean(value?.isOnline))
                .slice(0, 100);

            const activeUids = new Set<string>(onlineEntries.map(([uid]) => uid));
            releaseStaleSubscriptions(activeUids);

            if (!onlineEntries.length) {
                callback(await fetchFirestoreOnlineUsers());
                return;
            }

            const users = await Promise.all(onlineEntries.map(async ([uid, presence]) => {
                ensureProfileSubscription(uid);

                let profile = profileCache.get(uid);
                if (!profile) {
                    try {
                        const docSnapshot = await getDoc(doc(db, 'users', uid));
                        if (!docSnapshot.exists()) {
                            return null;
                        }
                        profile = docSnapshot.data() as UserData;
                        profileCache.set(uid, profile);
                    } catch (error) {
                        console.error('Failed to fetch user profile for presence list:', error);
                        return null;
                    }
                }

                return {
                    ...profile,
                    isOnline: true,
                    activeSessionId: presence?.sessionId ?? profile.activeSessionId,
                    lastDeviceInfo: presence?.deviceInfo ?? profile.lastDeviceInfo,
                    presenceUpdatedAt: presence?.updatedAt ?? profile.presenceUpdatedAt,
                } as UserData;
            }));

            callback(users.filter(Boolean) as UserData[]);
        } catch (error) {
            console.error('Failed to process realtime presence snapshot:', error);
        }
    };

    const unsubscribe = onValue(statusRef, (snapshot) => {
        void processSnapshot(snapshot);
    }, (error) => {
        console.error('Realtime presence listener failed:', error);
    });

    return () => {
        unsubscribe();
        profileSubscriptions.forEach((stop) => stop());
        profileSubscriptions.clear();
        profileCache.clear();
    };
};

export const onOnlineUsersChange = (callback: (users: UserData[]) => void): (() => void) => {
    if (!rtdb || !db) {
        console.warn('Realtime Database unavailable. Falling back to Firestore query for online users.');
        return subscribeOnlineUsersViaFirestore(callback);
    }
    return subscribeOnlineUsersViaRealtimeDb(callback);
};

export const subscribeToAiCoachReports = (
    uid: string,
    callback: (reports: AiCoachReportRecord[]) => void,
    limitCount = 5,
    onError?: (error: FirestoreError) => void
) => {
    if (!db) {
        throw new Error('Firestore baÄŸlantÄ±sÄ± kurulamadÄ±.');
    }
    const reportsRef = collection(db, 'users', uid, 'aiCoachReports');
    const reportsQuery = query(reportsRef, orderBy('createdAt', 'desc'), limit(limitCount));
    return onSnapshot(
        reportsQuery,
        (snapshot) => {
            const records: AiCoachReportRecord[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                const firestoreTimestamp = data.createdAt;
                const createdAt =
                    typeof firestoreTimestamp?.toMillis === 'function'
                        ? firestoreTimestamp.toMillis()
                        : data.generatedAt ?? Date.now();
                return {
                    id: docSnap.id,
                    createdAt,
                    generatedAt: data.generatedAt ?? createdAt,
                    report: data.report as AiCoachReport,
                    overallStats: data.overallStats,
                };
            });
            callback(records);
        },
        (error) => {
            onError?.(error);
        }
    );
};
