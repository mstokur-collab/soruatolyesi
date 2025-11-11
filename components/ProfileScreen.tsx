import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useData, useGame } from "../contexts/AppContext";
import { AiBadge, Button, LoadingSpinner } from "./UI";
import { analyzePerformanceWithAI } from "../services/geminiService";
import { getAllKazanims } from "../services/curriculumService";
import { subscribeToAiCoachReports, getSeasonLeaderboardSegments } from "../services/firestoreService";
import type {
    Kazanim,
    Difficulty,
    AnswerRecord,
    PerformanceSnapshot,
    AiCoachReport,
    AiCoachHighlight,
    AiCoachReportRecord,
    LeaderboardSegment,
    MissionInstance,
} from "../types";
import { useToast } from "./Toast";
import { CreditResourceStrip, CreditPurchaseSheet } from "./CreditResources";
import { getKazanimlarFromAltKonu } from "../utils/curriculum";

const subjectNames: Record<string, string> = {
    "social-studies": "Sosyal Bilgiler",
    math: "Matematik",
    science: "Fen Bilimleri",
    turkish: "Türkçe",
    english: "İngilizce",
    paragraph: "Paragraf",
};

const SNAPSHOT_CHUNK_SIZE = 25;
const DAILY_ANALYSIS_LIMIT = 1;
const WEEKLY_ANALYSIS_LIMIT = 3;

const getIsoWeekKey = (date: Date = new Date()) => {
    const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${temp.getUTCFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
};

const formatTimeRemaining = (deadline?: string | null) => {
    if (!deadline) return null;
    const diffMs = new Date(deadline).getTime() - Date.now();
    if (!Number.isFinite(diffMs)) return null;
    if (diffMs <= 0) return "Süre doldu";
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}g ${hours}s`;
    if (hours > 0) return `${hours}s ${minutes}dk`;
    return `${minutes} dk`;
};

const highlightVariantStyles: Record<
    "strength" | "focus" | "hardest",
    { border: string; background: string; accent: string }
> = {
    strength: {
        border: "border-emerald-400/40",
        background: "bg-emerald-500/5",
        accent: "text-emerald-300",
    },
    focus: {
        border: "border-amber-400/40",
        background: "bg-amber-500/5",
        accent: "text-amber-300",
    },
    hardest: {
        border: "border-rose-400/40",
        background: "bg-rose-500/5",
        accent: "text-rose-300",
    },
};

const renderHighlightCards = (items: AiCoachHighlight[], variant: "strength" | "focus") => {
    if (!items?.length) {
        return null;
    }
    const styles = highlightVariantStyles[variant];
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item, idx) => (
                <div
                    key={`${variant}-${item.title}-${idx}`}
                    className={`p-4 rounded-2xl border ${styles.border} ${styles.background} shadow-inner shadow-black/20`}
                >
                    <div className={`text-xs uppercase ${styles.accent} tracking-wide mb-1.5`}>
                        {item.icon ? `${item.icon} ` : ""}{variant === "strength" ? "Güçlü Yön" : "Gelişim Alanı"}
                    </div>
                    <h4 className="font-semibold text-slate-100">{item.title}</h4>
                    <p className="text-sm text-slate-300 mt-1">{item.description}</p>
                    {item.supportingStat && (
                        <p className="mt-2 text-xs text-slate-400">{item.supportingStat}</p>
                    )}
                    {item.actionTip && variant === "focus" && (
                        <p className="mt-2 text-xs font-medium text-amber-200">{item.actionTip}</p>
                    )}
                </div>
            ))}
        </div>
    );
};

interface HardestKazanim {
    id: string;
    label: string;
    total: number;
    correct: number;
    successRate: number;
    subjectId?: string;
}

const formatSnapshotDate = (timestamp?: number) => {
    if (typeof timestamp !== "number") {
        return null;
    }
    try {
        return new Date(timestamp).toLocaleDateString("tr-TR", { month: "short", day: "2-digit" });
    } catch {
        return new Date(timestamp).toISOString().slice(5, 10);
    }
};

const formatHistoryDate = (timestamp: number) => {
    try {
        return new Date(timestamp).toLocaleString("tr-TR", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return new Date(timestamp).toISOString().slice(5, 16);
    }
};

const buildPerformanceSnapshots = (
    history: AnswerRecord[],
    chunkSize: number = SNAPSHOT_CHUNK_SIZE
): PerformanceSnapshot[] => {
    if (!history.length) {
        return [];
    }
    const sorted = [...history].sort((a, b) => (a.answeredAt || 0) - (b.answeredAt || 0));
    const snapshots: PerformanceSnapshot[] = [];
    for (let i = 0; i < sorted.length; i += chunkSize) {
        const chunk = sorted.slice(i, i + chunkSize);
        const total = chunk.length;
        const correct = chunk.filter(item => item.isCorrect).length;
        const startLabel = formatSnapshotDate(chunk[0]?.answeredAt);
        const endLabel = formatSnapshotDate(chunk[chunk.length - 1]?.answeredAt);
        const label = startLabel && endLabel ? `${startLabel} - ${endLabel}` : `Blok ${snapshots.length + 1}`;
        snapshots.push({
            label,
            total,
            correct,
            successRate: total ? (correct / total) * 100 : 0,
        });
    }
    return snapshots;
};

const normalizeKazanimId = (value?: string | null) => {
    if (!value) {
        return "";
    }
    return value
        .toString()
        .trim()
        .toLocaleLowerCase("tr-TR")
        .replace(/[^a-z0-9]+/g, "-");
};

const BarChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => (
    <div className="w-full space-y-4">
        {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
                <div className="w-32 text-sm text-right text-slate-300 truncate">{item.label}</div>
                <div className="flex-1 bg-slate-700/50 rounded-full h-6">
                    <div
                        className={`h-6 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 ${item.color}`}
                        style={{ width: `${Math.max(item.value, 0)}%` }}
                    >
                        <span className="font-bold text-sm text-white drop-shadow-md">{item.value.toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const ProfileScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userType, currentUser } = useAuth();
    const {
        displayName,
        photoURL,
        answerHistory,
        aiCredits,
        duelTickets,
        creditPackages = [],
        okul,
        il,
        sinif,
        activeMissions,
        isMissionLoading: missionsLoading,
        missionError,
        claimMissionReward,
        userData,
    } = useData();
    const { mergedCurriculum, handleSubjectSelect, updateSetting, setGeneratorPrefill } = useGame();
    const { showToast } = useToast();
    const isGuest = userType === "guest";

    const [allKazanims, setAllKazanims] = useState<Kazanim[]>([]);
    const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
    const [generatorLoadingId, setGeneratorLoadingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<AiCoachReport | null>(null);
    const [error, setError] = useState("");
    const [reportHistory, setReportHistory] = useState<AiCoachReportRecord[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState("");
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [isAwaitingHistorySync, setIsAwaitingHistorySync] = useState(false);
    const [lastAnalysisTimestamp, setLastAnalysisTimestamp] = useState<number | null>(null);
    const [hasAutoTriggeredAnalysis, setHasAutoTriggeredAnalysis] = useState(false);
    const [seasonSegments, setSeasonSegments] = useState<LeaderboardSegment[]>([]);
    const [isSeasonLoading, setIsSeasonLoading] = useState(false);
    const [seasonError, setSeasonError] = useState("");
    const [claimingMissionId, setClaimingMissionId] = useState<string | null>(null);
    const historySyncTimeoutRef = useRef<number | null>(null);
    
    const handleOpenPurchase = () => setIsPurchaseOpen(true);
    const handleClosePurchase = () => setIsPurchaseOpen(false);

    const handleClaimMission = useCallback(async (missionId: string) => {
        try {
            setClaimingMissionId(missionId);
            await claimMissionReward(missionId);
        } catch (error: any) {
            console.error("Failed to claim mission reward:", error);
            showToast(error?.message || "Görev ödülü alınamadı.", "error");
        } finally {
            setClaimingMissionId(null);
        }
    }, [claimMissionReward, showToast]);

    const kazanimMetaMap = useMemo(() => {
        const map = new Map<string, { subjectId: string; grade: number; topic: string; text: string }>();
        Object.entries(mergedCurriculum || {}).forEach(([subjectId, gradeEntries]) => {
            Object.entries(gradeEntries || {}).forEach(([gradeKey, areas]) => {
                (areas || []).forEach((ogrenme) => {
                    (ogrenme.altKonular || []).forEach((altKonu) => {
                        const kazanimlar = getKazanimlarFromAltKonu(altKonu);
                        kazanimlar.forEach((kazanim) => {
                            const meta = {
                                subjectId,
                                grade: Number(gradeKey),
                                topic: ogrenme.name,
                                text: kazanim.text,
                            };
                            const registerKey = (key?: string | null) => {
                                if (!key) return;
                                map.set(key, meta);
                            };
                            const normalizedId = normalizeKazanimId(kazanim.id);
                            registerKey(kazanim.id);
                            if (normalizedId && normalizedId !== kazanim.id) {
                                registerKey(normalizedId);
                            }
                            if (subjectId) {
                                registerKey(`${subjectId}:${kazanim.id}`);
                                if (normalizedId) {
                                    registerKey(`${subjectId}:${normalizedId}`);
                                }
                            }
                        });
                    });
                });
            });
        });
        return map;
    }, [mergedCurriculum]);

    const normalizeLabel = useCallback((value: string) => value.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim(), []);

    const findKazanimMeta = useCallback(
        (kazanimId: string, options: { label?: string; subjectId?: string } = {}) => {
            const normalizedId = normalizeKazanimId(kazanimId);
            const candidateKeys: Array<string | null | undefined> = [
                kazanimId,
                normalizedId,
                options.subjectId && kazanimId ? `${options.subjectId}:${kazanimId}` : null,
                options.subjectId && normalizedId ? `${options.subjectId}:${normalizedId}` : null,
            ];
            for (const key of candidateKeys) {
                if (!key) continue;
                const hit = kazanimMetaMap.get(key);
                if (hit) {
                    return hit;
                }
            }
            if (!options.label) {
                return null;
            }
            const target = normalizeLabel(options.label);
            let fallback: { subjectId: string; grade: number; topic: string; text: string } | null = null;
            kazanimMetaMap.forEach((entry) => {
                if (fallback) {
                    return;
                }
                if (options.subjectId && entry.subjectId !== options.subjectId) {
                    return;
                }
                if (normalizeLabel(entry.text) === target) {
                    fallback = entry;
                }
            });
            return fallback;
        },
        [kazanimMetaMap, normalizeLabel]
    );

    useEffect(() => {
        const loadAllData = async () => {
            const kazanims = await getAllKazanims();
            setAllKazanims(kazanims);
        };
        loadAllData();
    }, []);

    useEffect(() => {
        if (isAwaitingHistorySync) {
            const newest = reportHistory[0];
            if (newest) {
                const newestTimestamp = newest.generatedAt ?? newest.createdAt;
                if (!lastAnalysisTimestamp || newestTimestamp >= lastAnalysisTimestamp) {
                    setSelectedReportId(newest.id);
                    setAiFeedback(newest.report);
                    setIsAwaitingHistorySync(false);
                    setLastAnalysisTimestamp(null);
                }
            }
            return;
        }
        if (!selectedReportId && reportHistory.length > 0) {
            setSelectedReportId(reportHistory[0].id);
            setAiFeedback(reportHistory[0].report);
        }
    }, [reportHistory, selectedReportId, isAwaitingHistorySync, lastAnalysisTimestamp]);

    useEffect(() => {
        if (!currentUser) {
            setReportHistory([]);
            setIsHistoryLoading(false);
            setHistoryError("");
            setSelectedReportId(null);
            setAiFeedback(null);
            setIsAwaitingHistorySync(false);
            setLastAnalysisTimestamp(null);
            setHasAutoTriggeredAnalysis(false);
            if (historySyncTimeoutRef.current) {
                window.clearTimeout(historySyncTimeoutRef.current);
                historySyncTimeoutRef.current = null;
            }
            return;
        }
        setIsHistoryLoading(true);
        setHistoryError("");
        setReportHistory([]);
        setSelectedReportId(null);
        setAiFeedback(null);
        setIsAwaitingHistorySync(false);
        setLastAnalysisTimestamp(null);
        setHasAutoTriggeredAnalysis(false);
        if (historySyncTimeoutRef.current) {
            window.clearTimeout(historySyncTimeoutRef.current);
            historySyncTimeoutRef.current = null;
        }
        let unsubscribe: (() => void) | undefined;
        try {
            unsubscribe = subscribeToAiCoachReports(
                currentUser.uid,
                (entries) => {
                    setReportHistory(entries);
                    setHistoryError("");
                    setIsHistoryLoading(false);
                    setIsAwaitingHistorySync(false);
                    if (historySyncTimeoutRef.current) {
                        window.clearTimeout(historySyncTimeoutRef.current);
                        historySyncTimeoutRef.current = null;
                    }
                },
                5,
                (err) => {
                    console.error("AI coach history listener error:", err);
                    setHistoryError(err.message || "Analiz geçmişi alınamadı.");
                    setIsHistoryLoading(false);
                    setIsAwaitingHistorySync(false);
                    if (historySyncTimeoutRef.current) {
                        window.clearTimeout(historySyncTimeoutRef.current);
                        historySyncTimeoutRef.current = null;
                    }
                }
            );
        } catch (listenerError: any) {
            console.error("Failed to subscribe AI coach history:", listenerError);
            setHistoryError(listenerError?.message || "Geçmiş yüklenemedi.");
            setIsHistoryLoading(false);
            setIsAwaitingHistorySync(false);
            if (historySyncTimeoutRef.current) {
                window.clearTimeout(historySyncTimeoutRef.current);
                historySyncTimeoutRef.current = null;
            }
        }
        return () => {
            unsubscribe?.();
        };
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) {
            setSeasonSegments([]);
            setSeasonError("");
            setIsSeasonLoading(false);
            return;
        }
        let isMounted = true;
        const loadSegments = async () => {
            setIsSeasonLoading(true);
            try {
                const data = await getSeasonLeaderboardSegments();
                if (isMounted) {
                    setSeasonSegments(data);
                    setSeasonError("");
                }
            } catch (err: any) {
                console.error("Sezon liderlik verileri yüklenemedi:", err);
                if (isMounted) {
                    setSeasonSegments([]);
                    setSeasonError(err?.message || "Sezon verileri yüklenemedi.");
                }
            } finally {
                if (isMounted) {
                    setIsSeasonLoading(false);
                }
            }
        };
        void loadSegments();
        return () => {
            isMounted = false;
        };
    }, [currentUser]);

    useEffect(() => {
        if (isAwaitingHistorySync && reportHistory.length === 0) {
            if (historySyncTimeoutRef.current) {
                window.clearTimeout(historySyncTimeoutRef.current);
            }
            historySyncTimeoutRef.current = window.setTimeout(() => {
                historySyncTimeoutRef.current = null;
                setIsAwaitingHistorySync(false);
                setHistoryError((prev) => prev || "Analiz raporu kaydedilemedi. Lütfen tekrar deneyin.");
            }, 15000);
        } else if ((!isAwaitingHistorySync || reportHistory.length > 0) && historySyncTimeoutRef.current) {
            window.clearTimeout(historySyncTimeoutRef.current);
            historySyncTimeoutRef.current = null;
        }
        return () => {
            if (historySyncTimeoutRef.current) {
                window.clearTimeout(historySyncTimeoutRef.current);
                historySyncTimeoutRef.current = null;
            }
        };
    }, [isAwaitingHistorySync, reportHistory.length]);

    const stats = useMemo(() => {
        const total = answerHistory.length;
        const kazanimMap = new Map<string, string>();
        allKazanims.forEach(k => {
            if (!k.id) {
                return;
            }
            kazanimMap.set(k.id, k.text);
            const normalizedId = normalizeKazanimId(k.id);
            if (normalizedId && normalizedId !== k.id) {
                kazanimMap.set(normalizedId, k.text);
            }
        });

        const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
        const currentWeekIndex = Math.floor(Date.now() / MS_PER_WEEK);
        const byWeek: Record<number, { total: number; correct: number }> = {};

        const formatWeekRange = (weekIndex: number) => {
            const startMs = weekIndex * MS_PER_WEEK;
            const start = new Date(startMs);
            const end = new Date(startMs + MS_PER_WEEK - 1);
            const formatDate = (date: Date) => {
                try {
                    return date.toLocaleDateString('tr-TR', { month: 'short', day: '2-digit' });
                } catch {
                    return date.toISOString().slice(5, 10);
                }
            };
            return `${formatDate(start)} - ${formatDate(end)}`;
        };

        if (total === 0) {
            return {
                totalAnswered: 0,
                correctAnswers: 0,
                successRate: 0,
                bySubject: [],
                worstKazanims: [],
                weeklyTrend: Array.from({ length: 4 }).map((_, idx) => ({
                    label: formatWeekRange(currentWeekIndex - (3 - idx)),
                    total: 0,
                    correct: 0,
                    successRate: null,
                })),
            };
        }

        const correct = answerHistory.filter(a => a.isCorrect).length;
        const bySubject: Record<string, { total: number; correct: number }> = {};
        const byKazanim: Record<string, { total: number; correct: number; subjectId?: string }> = {};

        answerHistory.forEach(answer => {
            if (!bySubject[answer.subjectId]) {
                bySubject[answer.subjectId] = { total: 0, correct: 0 };
            }
            bySubject[answer.subjectId].total += 1;
            if (answer.isCorrect) {
                bySubject[answer.subjectId].correct += 1;
            }

            if (!answer.kazanimId) {
                return;
            }
            if (!byKazanim[answer.kazanimId]) {
                byKazanim[answer.kazanimId] = { total: 0, correct: 0, subjectId: answer.subjectId };
            }
            byKazanim[answer.kazanimId].total += 1;
            if (answer.isCorrect) {
                byKazanim[answer.kazanimId].correct += 1;
            }

            if (typeof answer.answeredAt === 'number') {
                const weekIndex = Math.floor(answer.answeredAt / MS_PER_WEEK);
                if (!byWeek[weekIndex]) {
                    byWeek[weekIndex] = { total: 0, correct: 0 };
                }
                byWeek[weekIndex].total += 1;
                if (answer.isCorrect) {
                    byWeek[weekIndex].correct += 1;
                }
            }
        });

        const subjectData = Object.entries(bySubject)
            .map(([subjectId, data]) => ({
                label: subjectNames[subjectId] || "Diğer",
                value: (data.correct / data.total) * 100,
                color: "bg-teal-500",
            }))
            .sort((a, b) => b.value - a.value);

        const hardestKazanims: HardestKazanim[] = Object.entries(byKazanim)
            .map(([KazanimId, data]) => {
                const success = (data.correct / data.total) * 100;
                return {
                    id: KazanimId,
                    label: kazanimMap.get(KazanimId) || KazanimId,
                    total: data.total,
                    correct: data.correct,
                    successRate: success,
                    subjectId: data.subjectId,
                };
            })
            .filter(item => item.total >= 1)
            .sort((a, b) => {
                const diff = a.successRate - b.successRate;
                if (diff !== 0) return diff;
                return b.total - a.total;
            })
            .slice(0, 3);

        const weeklyTrend = Array.from({ length: 4 }).map((_, idx) => {
            const targetWeek = currentWeekIndex - (3 - idx);
            const weekData = byWeek[targetWeek] || { total: 0, correct: 0 };
            const success = weekData.total > 0 ? (weekData.correct / weekData.total) * 100 : null;
            return {
                label: formatWeekRange(targetWeek),
                total: weekData.total,
                correct: weekData.correct,
                successRate: success,
            };
        });

        return {
            totalAnswered: total,
            correctAnswers: correct,
            successRate: (correct / total) * 100,
            bySubject: subjectData,
            worstKazanims: hardestKazanims,
            weeklyTrend,
        };
    }, [answerHistory, allKazanims, currentUser?.uid]);

    const derivePracticeDifficulty = (successRate: number): Difficulty => {
        if (successRate >= 75) return 'zor';
        if (successRate >= 45) return 'orta';
        return 'kolay';
    };

    const playerSeasonSnapshot = useMemo(() => {
        if (!currentUser?.uid || seasonSegments.length === 0) {
            return null;
        }
        const normalizedSchool = okul?.trim() || null;
        const normalizedCity = il?.trim() || null;
        const gradeLevel = typeof sinif === "number" ? sinif : null;

        const predicates: Array<(segment: LeaderboardSegment) => boolean> = [
            (segment) =>
                Boolean(
                    normalizedSchool &&
                        gradeLevel !== null &&
                        segment.segmentType === "class" &&
                        segment.filters?.okul === normalizedSchool &&
                        segment.filters?.sinif === gradeLevel
                ),
            (segment) =>
                Boolean(
                    normalizedSchool &&
                        segment.segmentType === "school" &&
                        segment.filters?.okul === normalizedSchool
                ),
            (segment) =>
                Boolean(
                    normalizedCity &&
                        segment.segmentType === "city" &&
                        segment.filters?.il === normalizedCity
                ),
            (segment) => segment.segmentType === "global",
        ];

        for (const predicate of predicates) {
            const segment = seasonSegments.find(predicate);
            if (!segment) continue;
            const entry = segment.topPlayers.find(player => player.uid === currentUser.uid);
            if (entry) {
                return { segment, entry };
            }
        }

        for (const segment of seasonSegments) {
            const entry = segment.topPlayers.find(player => player.uid === currentUser.uid);
            if (entry) {
                return { segment, entry };
            }
        }

        return null;
    }, [currentUser?.uid, seasonSegments, okul, il, sinif]);

    const targetedPracticeMissions = useMemo(
        () =>
            activeMissions.filter(
                mission =>
                    mission.targetType === "kazanimPractice" &&
                    (mission.status === "pending" || mission.status === "completed")
            ),
        [activeMissions]
    );

    const standardMissions = useMemo(
        () => activeMissions.filter(mission => mission.targetType !== 'kazanimPractice'),
        [activeMissions]
    );

    const todayKey = new Date().toISOString().split("T")[0];
    const currentWeekKey = getIsoWeekKey();
    const aiCoachLimits = userData?.aiCoachLimits;
    const normalizedDailyCount =
        aiCoachLimits && aiCoachLimits.dailyWindow === todayKey ? aiCoachLimits.dailyCount ?? 0 : 0;
    const normalizedWeeklyCount =
        aiCoachLimits && aiCoachLimits.weeklyWindow === currentWeekKey ? aiCoachLimits.weeklyCount ?? 0 : 0;
    const dailyLocked = normalizedDailyCount >= DAILY_ANALYSIS_LIMIT;
    const weeklyLocked = normalizedWeeklyCount >= WEEKLY_ANALYSIS_LIMIT;
    const analysisLockReason = dailyLocked
        ? "Bugünlük analiz hakkını kullandın. 24 saat sonra tekrar deneyebilirsin."
        : weeklyLocked
            ? "Bu hafta 3 analiz sınırına ulaştın. Yeni haklar pazartesi yenilenir."
            : null;
    const canRunAnalysis = !analysisLockReason;

    const handleGeneratorRedirect = async (target: HardestKazanim) => {
        const meta = findKazanimMeta(target.id, { label: target.label, subjectId: target.subjectId });
        if (!meta) {
            showToast("Bu kazanım için müfredat bilgisi bulunamadı.", "error");
            return;
        }
        setGeneratorLoadingId(target.id);

        try {
            await handleSubjectSelect(meta.subjectId);
            updateSetting("grade", meta.grade);
            updateSetting("topic", meta.topic);
            updateSetting("kazanimId", target.id);
            updateSetting("difficulty", derivePracticeDifficulty(target.successRate));
            setGeneratorPrefill({
                subjectId: meta.subjectId,
                grade: meta.grade,
                topic: meta.topic,
                kazanimId: target.id,
                kazanimText: meta.text,
            });
            navigate("/ogretmen-paneli");
        } catch (error) {
            console.error("Failed to prepare generator redirect:", error);
            showToast("Soru Atölyesi açılırken bir hata oluştu.", "error");
        } finally {
            setGeneratorLoadingId(null);
        }
    };

    const handlePracticeMissionRedirect = useCallback((mission: MissionInstance) => {
        const config = mission.practiceConfig;
        if (!config) return;
        handleGeneratorRedirect({
            id: config.kazanimId,
            label: config.kazanimLabel || config.kazanimId,
            total: config.minQuestions,
            correct: mission.practiceStats?.correct ?? 0,
            successRate: mission.practiceStats?.attempts
                ? (mission.practiceStats.correct / mission.practiceStats.attempts) * 100
                : 0,
            subjectId: config.subjectId,
        });
    }, [handleGeneratorRedirect]);

    const handleHistorySelect = (entry: AiCoachReportRecord) => {
        setAiFeedback(entry.report);
        setSelectedReportId(entry.id);
        setIsAwaitingHistorySync(false);
        setLastAnalysisTimestamp(null);
    };

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError("");
        setAiFeedback(null);
        try {
            const historySlice = answerHistory.slice(-100);
            const performanceSnapshots = buildPerformanceSnapshots(historySlice);
            const previousSuccessRate =
                performanceSnapshots.length > 1
                    ? performanceSnapshots[performanceSnapshots.length - 2].successRate
                    : null;

            const feedback = await analyzePerformanceWithAI(historySlice, allKazanims, {
                performanceSnapshots,
                previousSuccessRate,
                userId: currentUser?.uid,
            });
            setAiFeedback(feedback);
            setIsAwaitingHistorySync(true);
            setLastAnalysisTimestamp(Date.now());
            setSelectedReportId(null);
            setHistoryError("");
        } catch (err: any) {
            setError(err.message || "Analiz sırasında bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    }, [answerHistory, allKazanims, currentUser?.uid]);

    useEffect(() => {
        if (
            isGuest ||
            !currentUser ||
            hasAutoTriggeredAnalysis ||
            isHistoryLoading ||
            isLoading ||
            reportHistory.length > 0 ||
            answerHistory.length < 5 ||
            allKazanims.length === 0
        ) {
            return;
        }
        setHasAutoTriggeredAnalysis(true);
        void handleAnalysis();
    }, [
        isGuest,
        currentUser,
        hasAutoTriggeredAnalysis,
        isHistoryLoading,
        isLoading,
        reportHistory.length,
        answerHistory.length,
        allKazanims.length,
        handleAnalysis,
    ]);

    return (
        <>
            <div
                className="w-full h-full overflow-y-auto flex flex-col items-center px-4 pb-6 sm:px-6 sm:pb-8"
                style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
            >
                <button onClick={() => navigate(-1)} className="back-button-yellow">
                    &lt; Geri
                </button>

                <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
                    <header className="flex flex-col items-center text-center mt-8 sm:mt-12">
                        <img
                            src={photoURL || `https://i.pravatar.cc/150?u=${displayName}`}
                            alt={displayName}
                            className="w-32 h-32 rounded-full mb-4 border-4 border-slate-600 object-cover shadow-lg"
                        />
                        <h1 className="text-4xl font-extrabold text-slate-100">{displayName}</h1>
                        <p className="text-lg text-slate-400">Yapay Zeka Koçu</p>
                    </header>

                    <div className="w-full flex justify-center px-1">
                        <CreditResourceStrip
                            credits={aiCredits}
                            duelTickets={duelTickets}
                            isCompact={false}
                            onActionClick={handleOpenPurchase}
                            className="mx-auto w-full max-w-3xl"
                        />
                    </div>

                    <div className="space-y-4">
                        {playerSeasonSnapshot && (
                            <div className="bg-slate-800/60 border border-violet-700 rounded-2xl p-4 shadow-lg">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-widest text-violet-300 mb-1">
                                            Aktif Sıralaman
                                        </p>
                                        <p className="text-lg font-semibold text-slate-100">
                                            {playerSeasonSnapshot.segment.label}
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            Bu tabloda {playerSeasonSnapshot.entry.rank}. sıradasın · Sezon puanın{" "}
                                            {playerSeasonSnapshot.entry.seasonScore}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                                        <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center">
                                            <p className="text-xs text-slate-400">Beceri</p>
                                            <p className="text-xl font-bold text-yellow-300">
                                                {playerSeasonSnapshot.entry.skillPoints}
                                            </p>
                                        </div>
                                        <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center">
                                            <p className="text-xs text-slate-400">Katılım</p>
                                            <p className="text-xl font-bold text-emerald-300">
                                                {playerSeasonSnapshot.entry.participationPoints}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <p className="text-xs text-slate-400">
                                        Liderle arandaki farkı kapatmak için düzenli düello ve soru çözümlerine devam et.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/liderlik-tablosu")}
                                        className="px-4 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-500 text-white text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-300"
                                    >
                                        Liderlik Tablosunu Aç
                                    </button>
                                </div>
                            </div>
                        )}

                        {!playerSeasonSnapshot && (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Sezon Durumu</p>
                                    <p className="text-sm text-slate-300">
                                        {isSeasonLoading
                                            ? "Sezon sıralaman yükleniyor..."
                                            : seasonError
                                                ? `Sezon verileri alınamadı: ${seasonError}`
                                                : "Henüz sezon tablosunda görünmüyorsun. Birkaç düello veya pratik çözerek puan toplamaya başla!"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate("/liderlik-tablosu")}
                                    className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition"
                                >
                                    Liderliği İncele
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="order-2 bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-6 lg:order-1">
                            <h2 className="text-2xl font-bold text-violet-300">Genel İstatistikler</h2>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-4xl font-bold text-teal-400">{stats.totalAnswered}</p>
                                    <p className="text-sm text-slate-400">Toplam Cevap</p>
                                </div>
                                <div>
                                    <p className="text-4xl font-bold text-green-400">{stats.correctAnswers}</p>
                                    <p className="text-sm text-slate-400">Doğru Cevap</p>
                                </div>
                                <div>
                                    <p className="text-4xl font-bold text-yellow-400">{stats.successRate.toFixed(0)}%</p>
                                    <p className="text-sm text-slate-400">Başarı Oranı</p>
                                </div>
                            </div>

                            <hr className="border-slate-700" />

                            <h3 className="text-xl font-bold text-violet-300">Derslere Göre Başarı</h3>
                            {stats.bySubject.length > 0 ? (
                                <BarChart data={stats.bySubject} />
                            ) : (
                                <p className="text-slate-400 text-center py-4">
                                    Grafik için yeterli veri yok. Biraz soru çözmeye ne dersin?
                                </p>
                            )}

                            <div className="mt-6">
                                <h3 className="text-xl font-bold text-rose-300">Zayıf Kazanımlar Zinciri</h3>
                                {targetedPracticeMissions.length > 0 ? (
                                    <ul className="mt-3 space-y-3">
                                        {targetedPracticeMissions.map(mission => {
                                            const missionTarget =
                                                mission.practiceConfig?.minQuestions ??
                                                mission.progress?.target ??
                                                10;
                                            const attempts = mission.practiceStats?.attempts ?? 0;
                        const correct = mission.practiceStats?.correct ?? 0;
                                            const accuracy = attempts > 0 ? (correct / attempts) * 100 : 0;
                                            const accuracyLabel = Number.isFinite(accuracy) ? accuracy.toFixed(0) : "0";
                                            const progressPercent =
                                                missionTarget > 0 ? Math.min((attempts / missionTarget) * 100, 100) : 0;
                                            const dueLabel = formatTimeRemaining(mission.practiceConfig?.dueAt ?? mission.expiresAt);
                                            const isCompletedChain = mission.status === "completed";
                                            const isClaiming = claimingMissionId === mission.id;
                                            return (
                                                <li
                                                    key={mission.id}
                                                    className={`p-4 rounded-2xl border ${
                                                        isCompletedChain
                                                            ? "border-emerald-500/50 bg-emerald-500/5"
                                                            : "border-rose-500/40 bg-rose-500/5"
                                                    } transition`}
                                                >
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                                                                Kazanım Zinciri
                                                            </p>
                                                            <h4 className="text-lg font-semibold text-slate-100">
                                                                {mission.practiceConfig?.kazanimLabel || mission.title}
                                                            </h4>
                                                            <p className="text-xs text-slate-400 mt-1">
                                                                Gereken: {missionTarget} farklı soru · Min %{mission.practiceConfig?.minAccuracy ?? 60} başarı
                                                            </p>
                                                            {dueLabel && (
                                                                <p className="text-xs text-amber-300 mt-1">
                                                                    Son tarih: {dueLabel}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-slate-400">Ödül</p>
                                                            <p className="text-xl font-bold text-amber-200">
                                                                {mission.rewardPoints}💎
                                                            </p>
                                                            <p
                                                                className={`text-xs font-semibold ${
                                                                    isCompletedChain ? "text-emerald-300" : "text-rose-300"
                                                                }`}
                                                            >
                                                                {isCompletedChain ? "Zincir hazır" : "Pratik bekleniyor"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3">
                                                        <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                                                            <span>İlerleme: {attempts}/{missionTarget}</span>
                                                            <span>Başarı: %{accuracyLabel}</span>
                                                        </div>
                                                        <div className="w-full bg-slate-900/40 rounded-full h-2.5">
                                                            <div
                                                                className={`h-2.5 rounded-full transition-all duration-300 ${
                                                                    isCompletedChain ? "bg-emerald-400" : "bg-rose-400"
                                                                }`}
                                                                style={{ width: `${progressPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                                        {isCompletedChain ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleClaimMission(mission.id)}
                                                                disabled={isClaiming}
                                                                className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
                                                            >
                                                                {isClaiming ? "Alınıyor..." : "Ödülü Al"}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePracticeMissionRedirect(mission)}
                                                                className="flex-1 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition"
                                                            >
                                                                Hemen Çöz
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className="mt-3 space-y-3">
                                        <p className="text-slate-400 text-sm">
                                            AI Koç analizi sonrasında zayıf kazanımlar burada listelenir. Şimdilik istatistiklerine göre öncelik sıralaması:
                                        </p>
                                        {stats.worstKazanims.length > 0 ? (
                                            <ul className="space-y-3">
                                                {stats.worstKazanims.map(item => {
                                                    const accuracy = item.successRate.toFixed(1);
                                                    const meta = findKazanimMeta(item.id, {
                                                        label: item.label,
                                                        subjectId: item.subjectId,
                                                    });
                                                    const subjectLabel = meta
                                                        ? (subjectNames[meta.subjectId] || meta.subjectId)
                                                        : (item.subjectId ? (subjectNames[item.subjectId] || item.subjectId) : null);
                                                    const isGeneratorLoading = generatorLoadingId === item.id;

                                                    return (
                                                        <li
                                                            key={item.id}
                                                            className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 flex flex-col gap-1.5"
                                                        >
                                                            <span className="font-semibold text-slate-100">
                                                                {item.label && item.label !== item.id
                                                                    ? `${item.id} - ${item.label}`
                                                                    : item.id}
                                                            </span>
                                                            {meta && (
                                                                <span className="text-xs text-slate-400">
                                                                    {subjectLabel} · {meta.topic}
                                                                </span>
                                                            )}
                                                            <span className="text-sm text-slate-300">
                                                                Başarı: %{accuracy} · Deneme: {item.correct}/{item.total}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleGeneratorRedirect(item)}
                                                                disabled={isGeneratorLoading}
                                                                className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 disabled:cursor-not-allowed text-white text-sm font-medium transition"
                                                            >
                                                                {isGeneratorLoading ? "Yükleniyor..." : "Hemen Çöz"}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <p className="text-slate-400 text-center py-4">
                                                Henüz yeterli veri yok. Soru çöz, analiz edelim!
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="order-1 bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-6 lg:order-2">
                            <h2 className="flex items-center gap-2 text-2xl font-bold text-cyan-300">
                                <AiBadge size="lg" className="drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                <span>Koçum</span>
                            </h2>
                            {!isGuest && (
                                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                                    <span className="px-2 py-1 rounded-full border border-slate-600 bg-slate-900/40">
                                        Günlük analiz: {normalizedDailyCount}/{DAILY_ANALYSIS_LIMIT}
                                    </span>
                                    <span className="px-2 py-1 rounded-full border border-slate-600 bg-slate-900/40">
                                        Haftalık analiz: {normalizedWeeklyCount}/{WEEKLY_ANALYSIS_LIMIT}
                                    </span>
                                </div>
                            )}
                            
                            {isGuest ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-400 mb-4">
                                        AI Koç özelliğini kullanmak için giriş yapmalısın.
                                    </p>
                                </div>
                            ) : answerHistory.length < 5 ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-400 mb-2">
                                        AI Koç analizin için en az 5 soru çözmelisin.
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        Şu ana kadar {answerHistory.length} soru çözdün.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {reportHistory.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs text-slate-400 mb-2">Analiz Geçmişi:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {reportHistory.map((entry) => (
                                                    <button
                                                        key={entry.id}
                                                        type="button"
                                                        onClick={() => handleHistorySelect(entry)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                            selectedReportId === entry.id
                                                                ? "bg-cyan-600 text-white"
                                                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                                        }`}
                                                    >
                                                        {formatHistoryDate(entry.generatedAt ?? entry.createdAt)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {isLoading || isAwaitingHistorySync ? (
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <LoadingSpinner size="lg" />
                                            <p className="mt-4 text-slate-300">
                                                {isAwaitingHistorySync
                                                    ? "Analiz kaydediliyor..."
                                                    : "Performansın analiz ediliyor..."}
                                            </p>
                                        </div>
                                    ) : error || historyError ? (
                                        <div className="text-center py-4">
                                            <p className="text-rose-400 mb-4">{error || historyError}</p>
                                            <Button
                                                onClick={handleAnalysis}
                                                variant="primary"
                                                disabled={!canRunAnalysis || isLoading}
                                            >
                                                Tekrar Dene
                                            </Button>
                                        </div>
                                    ) : aiFeedback ? (
                                        <div className="space-y-4">
                                            <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 p-4 rounded-xl border border-cyan-700/50">
                                                <h3 className="text-lg font-bold text-cyan-200 mb-2">
                                                    Genel Değerlendirme
                                                </h3>
                                                <p className="text-slate-200 text-sm leading-relaxed">
                                                    {aiFeedback.generalSummary}
                                                </p>
                                            </div>

                                            {aiFeedback.strengths && aiFeedback.strengths.length > 0 && (
                                                <div>
                                                    <h4 className="text-lg font-semibold text-emerald-300 mb-3">
                                                        💪 Güçlü Yönlerin
                                                    </h4>
                                                    {renderHighlightCards(aiFeedback.strengths, "strength")}
                                                </div>
                                            )}

                                            {aiFeedback.focusAreas && aiFeedback.focusAreas.length > 0 && (
                                                <div>
                                                    <h4 className="text-lg font-semibold text-amber-300 mb-3">
                                                        🎯 Gelişim Alanların
                                                    </h4>
                                                    {renderHighlightCards(aiFeedback.focusAreas, "focus")}
                                                </div>
                                            )}

                                            {aiFeedback.actionPlan && aiFeedback.actionPlan.length > 0 && (
                                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-600">
                                                    <h4 className="text-lg font-semibold text-violet-300 mb-2">
                                                        📋 Aksiyon Planı
                                                    </h4>
                                                    <div className="space-y-4">
                                                        {aiFeedback.actionPlan.map((item, idx) => (
                                                            <div key={idx} className="space-y-2">
                                                                <h5 className="font-semibold text-slate-200">
                                                                    {item.title}
                                                                </h5>
                                                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                                                                    {item.steps.map((step, stepIdx) => (
                                                                        <li key={stepIdx}>{step}</li>
                                                                    ))}
                                                                </ul>
                                                                <p className="text-xs text-emerald-400 italic">
                                                                    💡 {item.expectedBenefit}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <Button
                                                onClick={handleAnalysis}
                                                variant="primary"
                                                className="w-full"
                                                disabled={!canRunAnalysis || isLoading}
                                            >
                                                Yeni Analiz Yap
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-slate-400 mb-4">
                                                Performansını analiz etmek için hazırım!
                                            </p>
                                            <Button
                                                onClick={handleAnalysis}
                                                variant="primary"
                                                disabled={!canRunAnalysis || isLoading}
                                            >
                                                Analiz Başlat
                                            </Button>
                                        </div>
                                    )}
                                    {analysisLockReason && answerHistory.length >= 5 && (
                                        <p className="text-xs text-amber-300 text-center mt-2">
                                            {analysisLockReason}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {!isGuest && activeMissions.length > 0 && (
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4">
                            <h2 className="text-2xl font-bold text-amber-300">🎯 Aktif Görevler</h2>
                            
                            {missionsLoading ? (
                                <div className="flex justify-center py-8">
                                    <LoadingSpinner size="lg" />
                                </div>
                            ) : missionError ? (
                                <p className="text-rose-400 text-center py-4">{missionError}</p>
                            ) : (
                                <div className="space-y-6">
                                    {standardMissions.length > 0 ? (
                                        <div>
                                            <h3 className="text-lg font-semibold text-amber-300 mb-3">
                                                📋 Diğer Görevler
                                            </h3>
                                            <div className="space-y-3">
                                                {standardMissions.map((mission) => {
                                                    const isCompleted = mission.status === "completed";
                                                    const isClaiming = claimingMissionId === mission.id;
                                                    const progress = mission.progress?.current || 0;
                                                    const target = mission.progress?.target || 1;

                                                    return (
                                                        <div
                                                            key={mission.id}
                                                            className="bg-slate-900/40 p-4 rounded-xl border border-slate-600"
                                                        >
                                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                                <div className="flex-1">
                                                                    <h4 className="font-semibold text-slate-100">
                                                                        {mission.title}
                                                                    </h4>
                                                                    <p className="text-sm text-slate-300 mt-1">
                                                                        {mission.description}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-lg font-bold text-amber-300">
                                                                        {mission.rewardPoints}💎
                                                                    </p>
                                                                    {isCompleted && (
                                                                        <span className="text-xs text-emerald-400">
                                                                            Tamamlandı!
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                             
                                                            {target > 1 && (
                                                                <div className="mt-3">
                                                                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                                                        <span>İlerleme: {progress}/{target}</span>
                                                                        <span>{((progress / target) * 100).toFixed(0)}%</span>
                                                                    </div>
                                                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                                                        <div
                                                                            className="bg-gradient-to-r from-amber-500 to-yellow-500 h-2 rounded-full transition-all"
                                                                            style={{
                                                                                width: `${Math.min((progress / target) * 100, 100)}%`,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {isCompleted && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleClaimMission(mission.id)}
                                                                    disabled={isClaiming}
                                                                    className="mt-3 w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
                                                                >
                                                                    {isClaiming ? "Alınıyor..." : "Ödülü Al"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-center text-slate-400 text-sm">
                                            Şu anda başka görev bulunmuyor.
                                        </p>
                                    )}
                                </div>

                            )}
                        </div>
                    )}
                </div>
            </div>

            <CreditPurchaseSheet
                isOpen={isPurchaseOpen}
                onClose={handleClosePurchase}
                packages={creditPackages}
                currentCredits={aiCredits}
            />
        </>
    );
};

export default ProfileScreen;
