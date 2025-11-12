import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, PropsWithChildren, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import * as firestoreService from '../services/firestoreService';
import { getCurriculumForSubject } from '../services/curriculumService';
// FIX: Changed QuizQuestion to Question to support multiple question types.
import type { Question, GameSettings, UserData, HighScore, OgrenmeAlani, Kazanim, Duel, DocumentLibraryItem, Exam, AnswerRecord, QuizQuestion, DuelSelectionCriteria, CreditTransaction, CreditPackage, CreditTransactionsCursor, Difficulty, QuestionGeneratorPrefill, MissionInstance } from '../types';
import { demoQuestions } from '../data/demoQuestions';
import { allCurriculumData as staticCurriculum } from '../data/curriculum/index';
import { creditPackages as defaultCreditPackages } from '../data/creditPackages';
import { deepmerge } from '../utils/deepmerge';
import { getKazanimlarFromAltKonu } from '../utils/curriculum';
import { normalizeQuestionRecord } from '../utils/questionNormalization';
import { useToast } from '../components/Toast';

const resolveModeTrackingKey = (settings: GameSettings): string => {
    const baseMode = settings.gameMode ?? 'quiz';
    if (baseMode === 'quiz') {
        return `quiz-${settings.quizMode ?? 'klasik'}`;
    }
    return baseMode;
};

// Define context shapes
interface AuthContextType {
    currentUser: User | null;
    isAuthLoading: boolean;
    userType: 'guest' | 'authenticated';
    isAdmin: boolean;
    isDevUser: boolean;
    handleLogin: () => void;
    handleLogout: () => void;
    loginAsDev: () => void;
    showWelcomeModal: boolean;
    setShowWelcomeModal: (show: boolean) => void;
    welcomeModalTitle: string;
}

interface CreditHistoryLoadOptions {
    refresh?: boolean;
    limit?: number;
}

interface DataContextType {
    userData: UserData | null;
    isDataLoading: boolean;
    highScores: HighScore[];
    setHighScores: React.Dispatch<React.SetStateAction<HighScore[]>>;
    solvedQuestionIds: string[];
    setSolvedQuestionIds: React.Dispatch<React.SetStateAction<string[]>>;
    documentLibrary: DocumentLibraryItem[];
    setDocumentLibrary: React.Dispatch<React.SetStateAction<DocumentLibraryItem[]>>;
    generatedExams: Exam[];
    setGeneratedExams: React.Dispatch<React.SetStateAction<Exam[]>>;
    aiCredits: number;
    setAiCredits: React.Dispatch<React.SetStateAction<number>>;
    duelTickets: number;
    setDuelTickets: React.Dispatch<React.SetStateAction<number>>;
    leaderboardScore: number;
    setLeaderboardScore: React.Dispatch<React.SetStateAction<number>>;
    seasonScore: number;
    setSeasonScore: React.Dispatch<React.SetStateAction<number>>;
    skillPoints: number;
    setSkillPoints: React.Dispatch<React.SetStateAction<number>>;
    participationPoints: number;
    setParticipationPoints: React.Dispatch<React.SetStateAction<number>>;
    lastLeaderboardUpdate: string | null;
    setLastLeaderboardUpdate: React.Dispatch<React.SetStateAction<string | null>>;
    dailyCreditLimit: number;
    // FIX: Changed QuizQuestion to Question to support multiple question types.
    globalQuestions: Question[];
    // FIX: Changed QuizQuestion to Question to support multiple question types.
    setGlobalQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
    loadGlobalQuestions: (subjectId: string) => Promise<void>;
    isGlobalQuestionsLoading: boolean;
    customCurriculum: UserData['customCurriculum'];
    setCustomCurriculum: React.Dispatch<React.SetStateAction<UserData['customCurriculum']>>;
    globalCurriculum: UserData['customCurriculum'] | null;
    setGlobalCurriculum: React.Dispatch<React.SetStateAction<UserData['customCurriculum'] | null>>;
    answerHistory: AnswerRecord[];
    handleQuestionAnswered: (question: QuizQuestion, isCorrect: boolean) => void;
    // Duel related
    incomingDuel: Duel | null;
    acceptDuel: () => void;
    rejectDuel: () => void;
    sendDuelInvitation: (opponent: UserData, subjectId?: string, topic?: string, kazanimId?: string) => void;
    activeDuelId: string | null;
    startRematch: (oldDuel: Duel) => void;
    exitActiveDuel: () => void;
    activeMissions: MissionInstance[];
    isMissionLoading: boolean;
    missionError: string | null;
    claimMissionReward: (missionId: string) => Promise<void>;
    // User profile data shorthands
    displayName: string;
    photoURL: string;
    okul?: string;
    il?: string;
    sinif?: number;
    // Credit utilities
    creditPackages: CreditPackage[];
    creditTransactions: CreditTransaction[];
    hasMoreCreditTransactions: boolean;
    isCreditHistoryLoading: boolean;
    loadCreditTransactions: (options?: CreditHistoryLoadOptions) => Promise<void>;
}


interface PracticeSessionOptions {
    subjectId: string;
    grade: number;
    topic: string;
    kazanimId: string;
    difficulty?: Difficulty;
    questionCount?: number;
}

interface GameContextType {
    settings: GameSettings;
    updateSetting: (key: keyof GameSettings, value: any) => void;
    score: number;
    setScore: React.Dispatch<React.SetStateAction<number>>;
    // FIX: Changed QuizQuestion to Question to support multiple question types.
    gameQuestions: Question[];
    // FIX: Changed QuizQuestion to Question to support multiple question types.
    handleGameEnd: (finalScore: number, answers?: any, groupScores?: { grup1: number, grup2: number }, questionsPlayed?: Question[]) => void;
    finalGroupScores: { grup1: number, grup2: number } | null;
    // FIX: Changed QuizQuestion to Question to support multiple question types.
    lastGameQuestions: Question[] | null;
    lastGameAnswers: any | null;
    allSubjects: Record<string, { name: string }>;
    selectedSubjectId: string;
    setSelectedSubjectId: React.Dispatch<React.SetStateAction<string>>;
    subjectName: string;
    handleSubjectSelect: (subjectId: string) => Promise<void>;
    // FIX: Changed QuizQuestion to Question to support multiple question types.
    getQuestionsForCriteria: (criteria: Partial<GameSettings>) => Question[];
    getSubjectCount: (subjectId: string) => number;
    isCurriculumLoading: boolean;
    mergedCurriculum: Record<string, Record<number, OgrenmeAlani[]>>;
    ogrenmeAlanlari: OgrenmeAlani[];
    kazanimlar: Kazanim[];
    showNoQuestionsModal: boolean;
    setShowNoQuestionsModal: React.Dispatch<React.SetStateAction<boolean>>;
    postSubjectSelectRedirect: string | null;
    setPostSubjectSelectRedirect: React.Dispatch<React.SetStateAction<string | null>>;
    startPracticeSession: (options: PracticeSessionOptions) => Promise<{ success: boolean; reason?: string; availableQuestions?: number }>;
    generatorPrefill: QuestionGeneratorPrefill | null;
    setGeneratorPrefill: React.Dispatch<React.SetStateAction<QuestionGeneratorPrefill | null>>;
}


// Create contexts
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DataContext = createContext<DataContextType | undefined>(undefined);
const GameContext = createContext<GameContextType | undefined>(undefined);

// Custom hooks for consuming contexts
export const useAuth = () => useContext(AuthContext)!;
export const useData = () => useContext(DataContext)!;
export const useGame = () => useContext(GameContext)!;

// The main provider component
// FIX: Updated AppProvider to use React.FC<PropsWithChildren<{}>> to resolve an obscure type error where the 'children' prop was incorrectly reported as missing on nested providers.
export const AppProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // --- AUTH STATE ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const isDevUser = currentUser?.uid === 'dev-user-12345';
    // Admin: Dev kullanıcı veya mstokur@hotmail.com hesabı 
    const isAdmin = isDevUser || currentUser?.email === 'mstokur@hotmail.com';
    const userType = currentUser ? 'authenticated' : 'guest';
    
    // --- DATA STATE ---
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [highScores, setHighScores] = useState<HighScore[]>([]);
    const [solvedQuestionIds, setSolvedQuestionIds] = useState<string[]>([]);
    const [documentLibrary, setDocumentLibrary] = useState<DocumentLibraryItem[]>([]);    const [generatedExams, setGeneratedExams] = useState<Exam[]>([]);
    const [aiCredits, setAiCredits] = useState(0);
    const [duelTickets, setDuelTickets] = useState(0);
    const [leaderboardScore, setLeaderboardScore] = useState(0);
    const [seasonScore, setSeasonScore] = useState(0);
    const [skillPoints, setSkillPoints] = useState(0);
    const [participationPoints, setParticipationPoints] = useState(0);
    const [lastLeaderboardUpdate, setLastLeaderboardUpdate] = useState<string | null>(null);
    const [customCurriculum, setCustomCurriculum] = useState<UserData['customCurriculum']>();
    const [answerHistory, setAnswerHistory] = useState<AnswerRecord[]>([]);
    // FIX: Changed QuizQuestion to Question to support multiple question types.
    const [globalQuestions, setGlobalQuestions] = useState<Question[]>([]);
    const [isGlobalQuestionsLoading, setIsGlobalQuestionsLoading] = useState(false);
    const [globalCurriculum, setGlobalCurriculum] = useState<UserData['customCurriculum'] | null>(null);
    const [incomingDuel, setIncomingDuel] = useState<Duel | null>(null);
    const [activeDuelId, setActiveDuelId] = useState<string | null>(null);
    const rematchInProgressRef = useRef(false);
    const hasEnsuredDailyMissionsRef = useRef(false);
    const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
    const [creditHistoryCursor, setCreditHistoryCursor] = useState<CreditTransactionsCursor | null>(null);
    const [hasMoreCreditTransactions, setHasMoreCreditTransactions] = useState(false);
    const [isCreditHistoryLoading, setIsCreditHistoryLoading] = useState(false);
    const [availableCreditPackages] = useState<CreditPackage[]>(defaultCreditPackages);
    const [activeMissions, setActiveMissions] = useState<MissionInstance[]>([]);
    const [isMissionLoading, setIsMissionLoading] = useState(true);
    const [missionError, setMissionError] = useState<string | null>(null);


    // --- GAME STATE ---
    const [settings, setSettings] = useState<GameSettings>({
        gameMode: 'quiz',
        difficulty: 'orta',
        grade: 5
    });
    const [score, setScore] = useState(0);
    // FIX: Changed QuizQuestion to Question to support multiple question types.
    const [gameQuestions, setGameQuestions] = useState<Question[]>([]);
    const [finalGroupScores, setFinalGroupScores] = useState<{grup1: number, grup2: number} | null>(null);
    // FIX: Changed QuizQuestion to Question to support multiple question types.
    const [lastGameQuestions, setLastGameQuestions] = useState<Question[] | null>(null);
    const [lastGameAnswers, setLastGameAnswers] = useState<any | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [curriculum, setCurriculum] = useState<Record<number, OgrenmeAlani[]>>({});
    const [isCurriculumLoading, setIsCurriculumLoading] = useState(false);
    const [showNoQuestionsModal, setShowNoQuestionsModal] = useState(false);
    const [postSubjectSelectRedirect, setPostSubjectSelectRedirect] = useState<string | null>(null);
    const [generatorPrefill, setGeneratorPrefill] = useState<QuestionGeneratorPrefill | null>(null);

    const getNormalizedDemoQuestions = useCallback((subjectId?: string) => {
        if (!subjectId) return [];
        return (demoQuestions[subjectId] || [])
            .map((question) => normalizeQuestionRecord<QuizQuestion>(question))
            .filter((question): question is QuizQuestion => Boolean(question));
    }, []);

    const demoQuestionPool = useMemo(
        () => getNormalizedDemoQuestions(selectedSubjectId),
        [selectedSubjectId, getNormalizedDemoQuestions]
    );

    const fetchQuestionsForSubject = useCallback(async (subjectId: string): Promise<Question[]> => {
        if (!subjectId) return [];
        if (userType === 'guest' || isDevUser) {
            return getNormalizedDemoQuestions(subjectId);
        }

        setIsGlobalQuestionsLoading(true);
        try {
            const questions = await firestoreService.fetchGlobalQuestions(subjectId);
            return questions;
        } catch (error) {
            console.error('Error loading subject questions:', error);
            showToast('Sorular yüklenirken bir hata oluştu.', 'error');
            return [];
        } finally {
            setIsGlobalQuestionsLoading(false);
        }
    }, [userType, isDevUser, getNormalizedDemoQuestions, showToast]);


    // --- AUTH LOGIC ---
    useEffect(() => {
        if (!auth) {
            console.warn("Firebase Auth is not available. Running in guest mode.");
            setIsAuthLoading(false);
            setIsDataLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (!user) {
                setIsDataLoading(false);
            }
            setIsAuthLoading(false);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        setCreditTransactions([]);
        setCreditHistoryCursor(null);
        setHasMoreCreditTransactions(false);
        setIsCreditHistoryLoading(false);
    }, [currentUser?.uid]);

    useEffect(() => {
        hasEnsuredDailyMissionsRef.current = false;
    }, [currentUser?.uid]);

    const handleLogin = async () => {
        if (!auth) {
            showToast('Giriş servisi şu anda kullanılamıyor.', 'error');
            return;
        }
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Google sign-in error:", error);
            showToast('Giriş yapılırken bir hata oluştu.', 'error');
        }
    };

    const handleLogout = async () => {
        if (!auth) return;
        if (currentUser && !isDevUser) {
            await firestoreService.markUserOffline(currentUser.uid);
        }
        await signOut(auth);
        navigate('/');
    };

    const loginAsDev = () => {
        const devUser = {
            uid: 'dev-user-12345',
            displayName: 'Geliştirici',
            email: 'dev@example.com',
            photoURL: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
        } as User;
        setCurrentUser(devUser);
    };

    // --- DATA LOGIC ---
    // Load user data from Firestore
    useEffect(() => {
        if (!currentUser) {
            setUserData(null);
            setHighScores([]);
            setSolvedQuestionIds([]);
            setDocumentLibrary([]);
            setGeneratedExams([]);
            setAiCredits(0);
            setCustomCurriculum({});
            setAnswerHistory([]);
            setLeaderboardScore(0);
            setSeasonScore(0);
            setSkillPoints(0);
            setParticipationPoints(0);
            setLastLeaderboardUpdate(null);
            setIncomingDuel(null);
            setActiveDuelId(null);
            setCreditTransactions([]);
            setCreditHistoryCursor(null);
            setHasMoreCreditTransactions(false);
            setIsCreditHistoryLoading(false);
            setActiveMissions([]);
            setIsMissionLoading(false);
            setMissionError(null);
            setIsDataLoading(false);
            return;
        }

        if (isDevUser) {
            const devData = firestoreService.getDefaultUserData(
                currentUser.uid,
                currentUser.displayName || 'Developer',
                currentUser.photoURL
            );
            setUserData(devData);
            setHighScores(devData.highScores || []);
            setSolvedQuestionIds(devData.solvedQuestionIds || []);
            setDocumentLibrary(devData.documentLibrary || []);
            setGeneratedExams(devData.generatedExams || []);
            setAiCredits(devData.aiCredits ?? 999999);
            setDuelTickets(devData.duelTickets ?? 0);
            setLeaderboardScore(devData.leaderboardScore ?? 0);
            setSeasonScore(devData.seasonScore ?? 0);
            setSkillPoints(devData.skillPoints ?? 0);
            setParticipationPoints(devData.participationPoints ?? 0);
            setLastLeaderboardUpdate(devData.lastLeaderboardUpdate ?? null);
            setCustomCurriculum(devData.customCurriculum || {});
            setAnswerHistory(devData.answerHistory || []);
            setIsDataLoading(false);
            return;
        }
        
        // Admin kullanıcı (mstokur@hotmail.com) için sonsuz kredi
        if (currentUser.email === 'mstokur@hotmail.com') {
            setIsDataLoading(true);
            const unsubscribe = firestoreService.onUserChanges(
                currentUser.uid,
                (data) => {
                    if (data) {
                        setUserData(data);
                        setHighScores(data.highScores || []);
                        setSolvedQuestionIds(data.solvedQuestionIds || []);
                        setDocumentLibrary(data.documentLibrary || []);
                        setGeneratedExams(data.generatedExams || []);
                        setAiCredits(999999); // Sonsuz kredi
                        setDuelTickets(data.duelTickets ?? 0);
                        setLeaderboardScore(data.leaderboardScore ?? 0);
                        setSeasonScore(data.seasonScore ?? 0);
                        setSkillPoints(data.skillPoints ?? 0);
                        setParticipationPoints(data.participationPoints ?? 0);
                        setLastLeaderboardUpdate(data.lastLeaderboardUpdate ?? null);
                        setCustomCurriculum(data.customCurriculum);
                        setAnswerHistory(data.answerHistory || []);
                    } else {
                        firestoreService.createUserData(currentUser.uid, currentUser.displayName || '', currentUser.photoURL)
                            .then(newUserData => {
                                setUserData(newUserData);
                                setAiCredits(999999); // Yeni kullanıcı ya da sonsuz kredi
                                setLeaderboardScore(newUserData.leaderboardScore ?? 0);
                                setSeasonScore(newUserData.seasonScore ?? 0);
                                setSkillPoints(newUserData.skillPoints ?? 0);
                                setParticipationPoints(newUserData.participationPoints ?? 0);
                                setLastLeaderboardUpdate(newUserData.lastLeaderboardUpdate ?? null);
                            });
                        setShowWelcomeModal(true);
                    }
                    setIsDataLoading(false);
                },
                (error) => {
                    console.error('Failed to listen for user profile updates:', error);
                    showToast('Profil verileri yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.', 'error');
                    setIsDataLoading(false);
                    setUserData(null);
                }
            );
            return () => unsubscribe();
        }

        setIsDataLoading(true);
        const unsubscribe = firestoreService.onUserChanges(
            currentUser.uid,
            (data) => {
                if (data) {
                    setUserData(data);
                    setHighScores(data.highScores || []);
                    setSolvedQuestionIds(data.solvedQuestionIds || []);
                    setDocumentLibrary(data.documentLibrary || []);
                    setGeneratedExams(data.generatedExams || []);
                    setAiCredits(data.aiCredits ?? 0);
                    setDuelTickets(data.duelTickets ?? 0);
                    setLeaderboardScore(data.leaderboardScore ?? 0);
                    setSeasonScore(data.seasonScore ?? 0);
                    setSkillPoints(data.skillPoints ?? 0);
                    setParticipationPoints(data.participationPoints ?? 0);
                    setLastLeaderboardUpdate(data.lastLeaderboardUpdate ?? null);
                    setCustomCurriculum(data.customCurriculum);
                    setAnswerHistory(data.answerHistory || []);
                } else {
                    firestoreService.createUserData(currentUser.uid, currentUser.displayName || '', currentUser.photoURL)
                        .then(newUserData => {
                            setUserData(newUserData);
                            setLeaderboardScore(newUserData.leaderboardScore ?? 0);
                            setSeasonScore(newUserData.seasonScore ?? 0);
                            setSkillPoints(newUserData.skillPoints ?? 0);
                            setParticipationPoints(newUserData.participationPoints ?? 0);
                            setLastLeaderboardUpdate(newUserData.lastLeaderboardUpdate ?? null);
                        });
                    setShowWelcomeModal(true);
                }
                setIsDataLoading(false);
            },
            (error) => {
                console.error('Failed to listen for user profile updates:', error);
                showToast('Profil verileri yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.', 'error');
                setIsDataLoading(false);
                setUserData(null);
            }
        );

        return () => unsubscribe();
    }, [currentUser, isDevUser]);

    useEffect(() => {
        if (!currentUser) {
            setActiveMissions([]);
            setMissionError(null);
            setIsMissionLoading(false);
            return;
        }
        setIsMissionLoading(true);
        const unsubscribe = firestoreService.subscribeToActiveMissions(
            currentUser.uid,
            (missions) => {
                setActiveMissions(missions);
                setMissionError(null);
                setIsMissionLoading(false);
            },
            (error) => {
                console.error('Failed to subscribe missions:', error);
                setMissionError(error.message);
                setIsMissionLoading(false);
            }
        );
        return () => unsubscribe();
    }, [currentUser]);

    const ensureDailyMissionsForUser = useCallback(async () => {
        if (!currentUser || hasEnsuredDailyMissionsRef.current) {
            return;
        }

        hasEnsuredDailyMissionsRef.current = true;
        try {
            await firestoreService.ensureDailyMissions();
        } catch (error) {
            console.error('ensureDailyMissions failed:', error);
            hasEnsuredDailyMissionsRef.current = false;
        }
    }, [currentUser]);

    const hasDailyMissions = useMemo(
        () => activeMissions.some(mission => mission.frequency === 'daily'),
        [activeMissions]
    );

    useEffect(() => {
        if (!currentUser || userType !== 'authenticated') {
            return;
        }
        if (isMissionLoading || hasDailyMissions) {
            return;
        }
        ensureDailyMissionsForUser();
    }, [currentUser, userType, isMissionLoading, hasDailyMissions, ensureDailyMissionsForUser]);

    // ✅ FIXED: Tek bir presence yönetim sistemi kullanıyoruz
    // setupPresenceManagement zaten RTDB onDisconnect + Firestore sync yapıyor
    // Ekstra browser event listener'lar kaldırıldı (çakışma önlendi)
    useEffect(() => {
        if (!currentUser || userType !== 'authenticated' || isDevUser) return;
        const cleanup = firestoreService.setupPresenceManagement(currentUser.uid);
        return () => {
            cleanup();
        };
    }, [currentUser, userType, isDevUser]);

    const handleMissionRewardClaim = useCallback(async (missionId: string) => {
        try {
            await firestoreService.claimMissionReward(missionId);
            showToast('Görev ödülün eklendi!', 'success');
        } catch (error: any) {
            console.error('claimMissionReward failed:', error);
            showToast(error?.message || 'Görev ödülü alınamadı.', 'error');
        }
    }, [showToast]);

    useEffect(() => {
        if (!currentUser || userType !== 'authenticated' || isDevUser) return;

        const unsubscribe = firestoreService.onIncomingDuels(currentUser.uid, async (duel) => {
            try {
                const challengerProfile = await firestoreService.getUserData(duel.challengerId);
                setIncomingDuel(prev => {
                    const enriched = {
                        ...duel,
                        challengerName: challengerProfile?.displayName || duel.challengerName || 'Bilinmeyen Oyuncu',
                        challengerPhotoURL: challengerProfile?.photoURL || duel.challengerPhotoURL || '',
                    };
                    return enriched;
                });
                showToast(`${duel.challengerName || challengerProfile?.displayName || 'Bir oyuncu'} seni düelloya davet etti!`, 'info');
            } catch (error) {
                console.error('Failed to hydrate incoming duel:', error);
                setIncomingDuel(duel);
                showToast('Yeni bir düello daveti var!', 'info');
            }
        });

        return () => unsubscribe();
    }, [currentUser, userType, isDevUser, showToast]);
// --- GAME LOGIC ---
    const allSubjects = useMemo(() => ({
        'social-studies': { name: 'Sosyal Bilgiler' },
        'math': { name: 'Matematik' },
        'science': { name: 'Fen Bilimleri' },
        'turkish': { name: 'Türkçe' },
        'english': { name: 'İngilizce' },
        'paragraph': { name: 'Paragraf' },
    }), []);
    const subjectName = allSubjects[selectedSubjectId]?.name || 'Bilinmeyen Ders';

    const mergedCurriculum = useMemo(() => deepmerge(deepmerge(staticCurriculum, globalCurriculum || {}), customCurriculum || {}), [globalCurriculum, customCurriculum]);

    const handleSubjectSelect = useCallback(async (subjectId: string) => {
        if (!subjectId) return;
        setSelectedSubjectId(subjectId);
        setGlobalQuestions([]); // Clear questions from previous subject

        const questions = await fetchQuestionsForSubject(subjectId);
        setGlobalQuestions(questions);

        if (userType === 'authenticated' && !isDevUser && questions.length === 0) {
            setShowNoQuestionsModal(true);
        }
    }, [fetchQuestionsForSubject, userType, isDevUser]);

    const ogrenmeAlanlari: OgrenmeAlani[] = useMemo(() => {
        if (!selectedSubjectId || !settings.grade || !mergedCurriculum[selectedSubjectId]) return [];
        return mergedCurriculum[selectedSubjectId][settings.grade] || [];
    }, [selectedSubjectId, settings.grade, mergedCurriculum]);

    const kazanimlar: Kazanim[] = useMemo(() => {
        if (!settings.topic || !ogrenmeAlanlari) return [];
        const alan = ogrenmeAlanlari.find(oa => oa.name === settings.topic);
        if (!alan) return [];
        const merged = Array.isArray(alan.altKonular)
            ? alan.altKonular.flatMap((altKonu) => getKazanimlarFromAltKonu(altKonu))
            : [];
        return merged;
    }, [settings.topic, ogrenmeAlanlari]);

     // FIX: Changed return type to Question[] and removed incorrect type assertion.
     const getQuestionsForCriteria = useCallback((criteria: Partial<GameSettings>): Question[] => {
        const source = userType === 'guest' || isDevUser ? demoQuestionPool : globalQuestions;
        const normalizedGameMode = criteria.gameMode === 'kapisma' || criteria.gameMode === 'voice'
            ? 'quiz'
            : criteria.gameMode;

        return source.filter(q =>
            (criteria.grade === undefined || q.grade === criteria.grade) &&
            (criteria.topic === undefined || q.topic === criteria.topic) &&
            (criteria.kazanimId === undefined || q.kazanimId === criteria.kazanimId) &&
            (criteria.difficulty === undefined || q.difficulty === criteria.difficulty) &&
            (normalizedGameMode === undefined || q.type === normalizedGameMode) &&
            !solvedQuestionIds.includes(q.id)
        );
    }, [userType, isDevUser, demoQuestionPool, globalQuestions, solvedQuestionIds]);

    const getSubjectCount = useCallback((subjectId: string) => {
        if (userType === 'guest' || isDevUser) return getNormalizedDemoQuestions(subjectId).length;
        return globalQuestions.filter(q => q.subjectId === subjectId).length;
    }, [userType, isDevUser, getNormalizedDemoQuestions, globalQuestions]);

     const updateSetting = (key: keyof GameSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // Prepare questions for a new game
    useEffect(() => {
        if(settings.difficulty) { // A trigger that a full selection has been made
             const questions = getQuestionsForCriteria(settings);
             setGameQuestions(questions.sort(() => 0.5 - Math.random()).slice(0, 15));
        }
    }, [settings.difficulty, getQuestionsForCriteria]); // Depends on the final setting selected

    const startPracticeSession = useCallback(async (options: PracticeSessionOptions) => {
        const { subjectId, grade, topic, kazanimId, difficulty = 'orta', questionCount = 15 } = options;
        if (!subjectId || !grade || !topic || !kazanimId) {
            return { success: false, reason: 'Pratik oturumu için gerekli bilgiler eksik.' };
        }

        let activeQuestions = globalQuestions;
        if (selectedSubjectId !== subjectId || globalQuestions.length === 0) {
            setSelectedSubjectId(subjectId);
            setGlobalQuestions([]);
            activeQuestions = await fetchQuestionsForSubject(subjectId);
            setGlobalQuestions(activeQuestions);
            if (userType === 'authenticated' && !isDevUser && activeQuestions.length === 0) {
                setShowNoQuestionsModal(true);
                return { success: false, reason: 'Bu ders için soru bulunamadı.' };
            }
        }

        const filtered = activeQuestions.filter(q =>
            q.type === 'quiz' &&
            q.grade === grade &&
            q.topic === topic &&
            q.kazanimId === kazanimId
        );

        if (!filtered.length) {
            return { success: false, reason: 'Bu kazanım için kayıtlı soru bulunamadı.' };
        }

        updateSetting('subjectId', subjectId);
        updateSetting('grade', grade);
        updateSetting('topic', topic);
        updateSetting('kazanimId', kazanimId);
        updateSetting('gameMode', 'quiz');
        updateSetting('quizMode', 'klasik');
        updateSetting('competitionMode', 'bireysel');
        updateSetting('questionCount', Math.min(questionCount, filtered.length));
        updateSetting('difficulty', difficulty);

        return { success: true, availableQuestions: filtered.length };
    }, [globalQuestions, selectedSubjectId, fetchQuestionsForSubject, userType, isDevUser, updateSetting, setSelectedSubjectId, setGlobalQuestions, setShowNoQuestionsModal]);

    // FIX: Changed questionsPlayed parameter to Question[] to match usage.
    const handleGameEnd = (finalScore: number, answers: any = {}, groupScores?: {grup1: number, grup2: number}, questionsPlayed?: Question[]) => {
        setScore(finalScore);
        setFinalGroupScores(groupScores || null);
        setLastGameAnswers(answers);
        setLastGameQuestions(questionsPlayed || gameQuestions);
        
        if (userType === 'authenticated' && !isDevUser && settings.quizMode !== 'zamana-karsi' && finalScore > 0) {
            const newScore: HighScore = {
                name: currentUser?.displayName || 'Anonim',
                score: finalScore,
                date: new Date().toISOString(),
                settings: { ...settings }
            };
            setHighScores(prev => [...prev, newScore].sort((a, b) => b.score - a.score).slice(0, 20));
        }

        const answeredIds = (questionsPlayed || gameQuestions).map(q => q.id);
        setSolvedQuestionIds(prev => {
            const updated = Array.from(new Set([...prev, ...answeredIds]));
            if (currentUser?.uid) {
                firestoreService.updateUserData(currentUser.uid, { solvedQuestionIds: updated }).catch(err => {
                    console.error('Failed to save solved question ids:', err);
                });
            }
            return updated;
        });
        
        // Process all answers for AI coach statistics at game end
        // This batch approach improves performance and prevents visual feedback issues
        if (userType === 'authenticated' && !isDevUser && currentUser?.email !== 'mstokur@hotmail.com') {
            const questions = questionsPlayed || gameQuestions;
            const answerRecords: AnswerRecord[] = [];
            const timestamp = Date.now();
            
            // Create answer records for all quiz questions
            Object.entries(answers).forEach(([indexStr, answerState]: [string, any]) => {
                const index = parseInt(indexStr);
                const question = questions[index];
                
                if (question?.type === 'quiz') {
                    const quizQuestion = question as QuizQuestion;
                    reportMissionProgressForQuestion(quizQuestion, Boolean(answerState?.isCorrect));
                    answerRecords.push({
                        questionId: quizQuestion.id,
                        isCorrect: answerState.isCorrect,
                        answeredAt: timestamp,
                        subjectId: quizQuestion.subjectId,
                        kazanimId: quizQuestion.kazanimId,
                        difficulty: quizQuestion.difficulty
                    });
                }
            });
            
            // Update local state and save to Firestore in batch
            if (answerRecords.length > 0) {
                setAnswerHistory(prev => {
                    const newHistory = [...prev, ...answerRecords];
                    
                    // Save to Firestore asynchronously (non-blocking)
                    if (currentUser?.uid) {
                        firestoreService.updateUserData(currentUser.uid, { answerHistory: newHistory })
                            .catch(err => {
                                console.error('Failed to save answer history:', err);
                            });
                    }
                    
                    return newHistory;
                });
            }
        }

        if (userType === 'authenticated' && !isDevUser && currentUser?.uid) {
            const modeKey = resolveModeTrackingKey(settings);
            firestoreService.recordModePlay(currentUser.uid, modeKey).catch(err => {
                console.warn('recordModePlay failed:', err);
            });
        }
    };
    
    const loadCreditTransactions = useCallback(async (options: CreditHistoryLoadOptions = {}) => {
        const uid = currentUser?.uid;
        if (userType !== 'authenticated' || !uid) return;
        if (isCreditHistoryLoading) return;

        const { refresh = false, limit = 10 } = options;
        setIsCreditHistoryLoading(true);

        try {
            const { transactions, cursor } = await firestoreService.listCreditTransactions(uid, {
                limit,
                cursor: refresh ? null : creditHistoryCursor,
            });

            setCreditTransactions(prev => {
                if (refresh) {
                    return transactions;
                }
                const existingIds = new Set(prev.map(tx => tx.id));
                const merged = [...prev];
                transactions.forEach(tx => {
                    if (!existingIds.has(tx.id)) {
                        merged.push(tx);
                    }
                });
                return merged;
            });

            setCreditHistoryCursor(cursor ?? null);
            setHasMoreCreditTransactions(Boolean(cursor));
        } catch (error) {
            console.error('loadCreditTransactions failed:', error);
        } finally {
            setIsCreditHistoryLoading(false);
        }
    }, [userType, currentUser?.uid, isCreditHistoryLoading, creditHistoryCursor]);

    const reportMissionProgressForQuestion = useCallback((question: QuizQuestion, isCorrect: boolean) => {
        if (userType !== 'authenticated' || isDevUser) return;
        if (currentUser?.email === 'mstokur@hotmail.com') return;

        const metadata = {
            subjectId: question.subjectId,
            kazanimId: question.kazanimId,
            isCorrect,
            questionId: question.id,
            difficulty: question.difficulty,
        };

        void firestoreService.reportMissionProgress('questionsSolved', 1, metadata).catch((error) => {
            console.warn('reportMissionProgress questionsSolved failed:', error);
        });

        if (question.kazanimId) {
            void firestoreService.reportMissionProgress('kazanimPractice', 1, metadata).catch((error) => {
                console.warn('reportMissionProgress kazanimPractice failed:', error);
            });
        }

        // Zor sorular için özel tracking
        if (question.difficulty === 'zor') {
            void firestoreService.reportMissionProgress('difficultQuestions', 1, metadata).catch((error) => {
                console.warn('reportMissionProgress difficultQuestions failed:', error);
            });
        }
    }, [userType, isDevUser, currentUser]);

    const handleQuestionAnswered = useCallback((question: QuizQuestion, isCorrect: boolean) => {
        if(userType !== 'authenticated' || isDevUser) return;
        
        // Exclude admin email from coach tracking to keep coach data clean.
        if(currentUser?.email === 'mstokur@hotmail.com') return;
        
        const record: AnswerRecord = {
            questionId: question.id,
            isCorrect,
            answeredAt: Date.now(),
            subjectId: question.subjectId,
            kazanimId: question.kazanimId,
            difficulty: question.difficulty
        };
        
        // Update local state
        setAnswerHistory(prev => {
            const newHistory = [...prev, record];
            
            // Save to Firestore asynchronously
            if(currentUser?.uid) {
                firestoreService.updateUserData(currentUser.uid, { answerHistory: newHistory }).catch(err => {
                    console.error('Failed to save answer history:', err);
                });
            }
            
            return newHistory;
        });

        setSolvedQuestionIds(prev => {
            if (prev.includes(question.id)) return prev;
            const updated = [...prev, question.id];
            if (currentUser?.uid) {
                firestoreService.updateUserData(currentUser.uid, { solvedQuestionIds: updated }).catch(err => {
                    console.error('Failed to save solved question ids:', err);
                });
            }
            return updated;
        });

        reportMissionProgressForQuestion(question, isCorrect);
    }, [userType, isDevUser, currentUser, reportMissionProgressForQuestion]);
    

    // --- DUEL LOGIC ---
    const acceptDuel = useCallback(async () => {
        if (!incomingDuel) return;
        try {
            await firestoreService.acceptDuelChallenge(incomingDuel.id);
            setIncomingDuel(null);
            setActiveDuelId(incomingDuel.id);
            showToast('Düello kabul edildi! Başarılar!', 'success');
        } catch (error) {
            console.error('Failed to accept duel:', error);
            showToast('Düello kabul edilirken bir sorun oluştu.', 'error');
        }
    }, [incomingDuel, showToast]);

    const rejectDuel = useCallback(async () => {
        if (!incomingDuel) return;
        try {
            await firestoreService.rejectDuelChallenge(incomingDuel.id);
            setIncomingDuel(null);
            showToast('Düello daveti reddedildi.', 'info');
        } catch (error) {
            console.error('Failed to reject duel:', error);
            showToast('Düello reddedilirken bir sorun oluştu.', 'error');
        }
    }, [incomingDuel, showToast]);

    const startRematch = useCallback(async (oldDuel: Duel) => {
        if (!currentUser || !userData || userType !== 'authenticated') {
            showToast('Düello bilgileri eksik. Lütfen tekrar deneyin.', 'error');
            return;
        }

        if (rematchInProgressRef.current) return;

        const { uid, email, displayName: authDisplayName, photoURL: authPhoto } = currentUser;
        const unlimitedTickets = isDevUser || email === 'mstokur@hotmail.com' || userData.adminPermissions?.unlimitedCredits;

        if (!unlimitedTickets && duelTickets <= 0) {
            showToast('Yeni düello için bilet bulunmuyor.', 'error');
            return;
        }

        rematchInProgressRef.current = true;
        let spentTicket = false;

        try {
            if (!unlimitedTickets) {
                await firestoreService.useDuelTicket(uid);
                setDuelTickets(prev => Math.max(0, (prev || 0) - 1));
                spentTicket = true;
            }

            const challengerData: UserData = {
                ...userData,
                uid,
                displayName: userData.displayName || authDisplayName || 'Bilinmeyen Oyuncu',
                photoURL: userData.photoURL || authPhoto || '',
            };

            const opponentId = oldDuel.challengerId === uid ? oldDuel.opponentId : oldDuel.challengerId;
            const opponentProfile = await firestoreService.getUserData(opponentId);

            if (!opponentProfile) {
                throw new Error('Rakip profili bulunamadi .');
            }

            const newDuelId = await firestoreService.createDuelInDb(
                challengerData, 
                opponentProfile,
                oldDuel.selectedSubjectId,
                oldDuel.selectedTopic,
                oldDuel.selectedKazanimId
            );
            await firestoreService.acceptDuelChallenge(newDuelId);
            await firestoreService.setNextDuel(oldDuel.id, newDuelId);
            setActiveDuelId(newDuelId);
            showToast('Rematch hazır! İyi şanslar!', 'success');
        } catch (error) {
            console.error('Failed to start rematch:', error);
            showToast(error instanceof Error ? error.message : 'Rematch oluşturulamadı.', 'error');

            if (spentTicket) {
                try {
                    await firestoreService.awardDuelTicket(currentUser.uid);
                    setDuelTickets(prev => prev + 1);
                } catch (refundError) {
                    console.error('Failed to refund duel ticket:', refundError);
                }
            }
        } finally {
            rematchInProgressRef.current = false;
        }
    }, [currentUser, userData, userType, isDevUser, duelTickets, setDuelTickets, showToast]);

    const exitActiveDuel = useCallback(() => {
        setActiveDuelId(null);
    }, []);

    const sendDuelInvitation = useCallback(async (
        opponent: UserData,
        subjectId?: string,
        topic?: string,
        kazanimId?: string
    ) => {
        if (userType !== 'authenticated') {
            showToast('Meydan okumak için giriş yapmalısınız.', 'error');
            return;
        }

        if (!currentUser || !userData) {
            showToast('Profil bilgileriniz yüklenemedi. Lütfen tekrar deneyin.', 'error');
            return;
        }

        if (!opponent?.uid) {
            showToast('Geçersiz rakip seçimi.', 'error');
            return;
        }

        if (opponent.uid === currentUser.uid) {
            showToast('Kendinize düello daveti gönderemezsiniz.', 'error');
            return;
        }

        const { uid, email, displayName: authDisplayName, photoURL: authPhoto } = currentUser;
        const unlimitedTickets = isDevUser || email === 'mstokur@hotmail.com' || userData.adminPermissions?.unlimitedCredits;

        if (!unlimitedTickets && duelTickets <= 0) {
            showToast('Düello bileti yok. Yeni bilet kazanmak için sorular ekleyin.', 'error');
            return;
        }

        let spentTicket = false;
        try {
            if (!unlimitedTickets) {
                await firestoreService.useDuelTicket(uid);
                spentTicket = true;
                setDuelTickets(prev => Math.max(0, (prev || 0) - 1));
            }

            const challengerData: UserData = {
                ...userData,
                uid,
                displayName: userData.displayName || authDisplayName || 'Bilinmeyen Oyuncu',
                photoURL: userData.photoURL || authPhoto || '',
            };

            const duelId = await firestoreService.createDuelInDb(
                challengerData,
                opponent,
                subjectId,
                topic,
                kazanimId
            );
            setActiveDuelId(duelId);
            showToast(`${opponent.displayName || 'Rakip'} oyuncusuna düello daveti gönderildi!`, 'success');
        } catch (error: any) {
            if (spentTicket) {
                try {
                    await firestoreService.awardDuelTicket(uid);
                } catch (refundError) {
                    console.error('Düello bileti iade edilemedi:', refundError);
                }
                setDuelTickets(prev => prev + 1);
            }

            const message = error instanceof Error ? error.message : 'Düello daveti gönderilirken bir sorun oluştu.';
            console.error('sendDuelInvitation error:', error);
            showToast(message, 'error');
        }
    }, [userType, currentUser, userData, showToast, isDevUser, duelTickets, setDuelTickets, setActiveDuelId]);

    const authContextValue: AuthContextType = {
        currentUser, isAuthLoading, userType, isAdmin, isDevUser,
        handleLogin, handleLogout, loginAsDev,
        showWelcomeModal, setShowWelcomeModal, welcomeModalTitle: 'Hoş Geldin!'
    };
    
    const dataContextValue: DataContextType = {
        userData, isDataLoading, highScores, setHighScores, solvedQuestionIds, setSolvedQuestionIds,
        documentLibrary, setDocumentLibrary, generatedExams, setGeneratedExams, aiCredits, setAiCredits,
        duelTickets, setDuelTickets,
        leaderboardScore, setLeaderboardScore,
        seasonScore, setSeasonScore,
        skillPoints, setSkillPoints,
        participationPoints, setParticipationPoints,
        lastLeaderboardUpdate, setLastLeaderboardUpdate,
        creditPackages: availableCreditPackages,
        creditTransactions,
        hasMoreCreditTransactions,
        isCreditHistoryLoading,
        loadCreditTransactions,
        // FIX: Removed incorrect type assertions.
        dailyCreditLimit: 0, globalQuestions: globalQuestions, setGlobalQuestions: setGlobalQuestions,
        loadGlobalQuestions: async (subjectId: string) => {
            if (userType !== 'authenticated' || isDevUser) return;
            setIsGlobalQuestionsLoading(true);
            try {
                const questions = await firestoreService.fetchGlobalQuestions(subjectId);
                setGlobalQuestions(questions);
                if (questions.length === 0) {
                    setShowNoQuestionsModal(true);
                }
            } catch (error) {
                console.error('Error loading global questions:', error);
                showToast('Sorular yüklenirken bir hata oluştu.', 'error');
            } finally {
                setIsGlobalQuestionsLoading(false);
            }
        }, 
        isGlobalQuestionsLoading,
        customCurriculum, setCustomCurriculum, globalCurriculum, setGlobalCurriculum, answerHistory,
        handleQuestionAnswered, incomingDuel, acceptDuel, rejectDuel, sendDuelInvitation, activeDuelId, startRematch, exitActiveDuel,
        activeMissions,
        isMissionLoading,
        missionError,
        claimMissionReward: handleMissionRewardClaim,
        displayName: userData?.displayName || currentUser?.displayName || 'Misafir',
        photoURL: userData?.photoURL || currentUser?.photoURL || '',
        okul: userData?.okul, il: userData?.il, sinif: userData?.sinif
    };

    const gameContextValue: GameContextType = {
        // FIX: Removed incorrect type assertions.
        settings, updateSetting, score, setScore, gameQuestions: gameQuestions, handleGameEnd, finalGroupScores,
        lastGameQuestions, lastGameAnswers, allSubjects, selectedSubjectId, setSelectedSubjectId, subjectName,
        handleSubjectSelect, getQuestionsForCriteria: getQuestionsForCriteria, getSubjectCount, isCurriculumLoading,
        mergedCurriculum, ogrenmeAlanlari, kazanimlar, showNoQuestionsModal, setShowNoQuestionsModal,
        postSubjectSelectRedirect, setPostSubjectSelectRedirect, startPracticeSession,
        generatorPrefill, setGeneratorPrefill
    };


    return (
        <AuthContext.Provider value={authContextValue}>
            <DataContext.Provider value={dataContextValue}>
                <GameContext.Provider value={gameContextValue}>
                    {children}
                </GameContext.Provider>
            </DataContext.Provider>
        </AuthContext.Provider>
    );
};
