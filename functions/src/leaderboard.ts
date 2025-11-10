const MAX_RECENT_ANSWERS = 250;
const MAX_RECENT_HIGH_SCORES = 20;
const SCORE_CAP = 9999;
const DAY_IN_MS = 86_400_000;
const SEASON_DECAY_PER_DAY = 0.985;

type DifficultyCode = 'kolay' | 'orta' | 'zor';

interface AnswerRecordLike {
    isCorrect?: boolean;
    answeredAt?: number | string | TimestampLike;
    difficulty?: DifficultyCode;
}

interface HighScoreLike {
    score?: number;
    date?: string | number | TimestampLike;
}

interface TimestampLike {
    seconds?: number;
    nanoseconds?: number;
    toMillis?: () => number;
}

export interface LeaderboardSnapshot {
    leaderboardScore: number;
    seasonScore: number;
    skillPoints: number;
    participationPoints: number;
}

interface DuelComponent {
    score: number;
    lastActivity: number | null;
}

interface SkillComponent {
    score: number;
    lastAnsweredAt: number | null;
}

interface ParticipationComponent {
    score: number;
    lastContributionAt: number | null;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const safeNumber = (value: unknown, fallback = 0): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const toMillis = (value: unknown): number | null => {
    if (!value) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    if (typeof value === 'object') {
        const candidate = value as TimestampLike;
        if (typeof candidate.toMillis === 'function') {
            try {
                return candidate.toMillis();
            } catch {
                return null;
            }
        }
        if (typeof candidate.seconds === 'number') {
            const millis = candidate.seconds * 1000;
            const nanos = Number(candidate.nanoseconds) || 0;
            return millis + nanos / 1_000_000;
        }
    }
    return null;
};

const difficultyWeights: Record<string, number> = {
    kolay: 1,
    orta: 1.35,
    zor: 1.7,
};

const computeDuelComponent = (userDoc: Record<string, any>): DuelComponent => {
    const duelWins = safeNumber(userDoc.duelWins);
    const duelLosses = safeNumber(userDoc.duelLosses);
    const totalDuels = Math.max(0, duelWins + duelLosses);
    const winRate = totalDuels > 0 ? duelWins / totalDuels : 0;
    const dominance = duelWins - duelLosses;

    const activityBoost = Math.log1p(totalDuels) * 90;
    const winRateBoost = winRate * 420;
    const dominanceBoost = dominance * 18;

    const duelScore = clamp(500 + activityBoost + winRateBoost + dominanceBoost, 0, 4000);

    const duelStats = userDoc.duelAnswerStats;
    let lastActivity: number | null = null;
    if (duelStats && typeof duelStats === 'object') {
        Object.values(duelStats).forEach((stat) => {
            if (stat && typeof stat === 'object') {
                const ts = toMillis((stat as any).updatedAt);
                if (ts) {
                    lastActivity = Math.max(lastActivity ?? 0, ts);
                }
            }
        });
    }

    return { score: duelScore, lastActivity };
};

const computeSkillComponent = (answerHistoryRaw: any): SkillComponent => {
    if (!Array.isArray(answerHistoryRaw) || answerHistoryRaw.length === 0) {
        return { score: 0, lastAnsweredAt: null };
    }

    const recentAnswers: AnswerRecordLike[] = answerHistoryRaw.slice(-MAX_RECENT_ANSWERS);
    let weightedScore = 0;
    let correctCount = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    let lastAnsweredAt: number | null = null;

    recentAnswers.forEach((record, index) => {
        if (!record) return;
        const weight = difficultyWeights[record.difficulty ?? ''] ?? 1;
        if (record.isCorrect) {
            correctCount += 1;
            currentStreak += 1;
            longestStreak = Math.max(longestStreak, currentStreak);
            weightedScore += 15 * weight;
        } else {
            currentStreak = 0;
            weightedScore -= 8 * weight;
        }
        // Slightly reward recency to keep players active
        const recencyFactor = (index + 1) / recentAnswers.length;
        weightedScore += recencyFactor * 4;
        const answeredAt = toMillis(record.answeredAt);
        if (answeredAt) {
            lastAnsweredAt = Math.max(lastAnsweredAt ?? 0, answeredAt);
        }
    });

    const totalAnswered = recentAnswers.length;
    const accuracy = totalAnswered > 0 ? correctCount / totalAnswered : 0;
    const accuracyBonus = accuracy * 320;
    const volumeBonus = Math.log1p(totalAnswered) * 35;
    const streakBonus = longestStreak * 4;

    const skillScore = clamp(200 + weightedScore + accuracyBonus + volumeBonus + streakBonus, 0, 3200);
    return { score: skillScore, lastAnsweredAt };
};

const computeParticipationComponent = (userDoc: Record<string, any>): ParticipationComponent => {
    const solvedCount = Array.isArray(userDoc.solvedQuestionIds) ? userDoc.solvedQuestionIds.length : 0;
    const documentLibrary = Array.isArray(userDoc.documentLibrary) ? userDoc.documentLibrary : [];
    const generatedExams = Array.isArray(userDoc.generatedExams) ? userDoc.generatedExams : [];
    const highScoresRaw = Array.isArray(userDoc.highScores) ? userDoc.highScores.slice(-MAX_RECENT_HIGH_SCORES) : [];
    const participationStats = userDoc.participationStats || {};

    const documentsContribution = Math.log1p(documentLibrary.length) * 18;
    const solvedContribution = Math.log1p(solvedCount) * 26;
    const examContribution = Math.log1p(generatedExams.length) * 40;

    const questionsCreated = safeNumber(participationStats.questionsCreated);
    const questionCreationContribution = Math.log1p(questionsCreated) * 34;

    const duelMatches = Math.max(0, safeNumber(userDoc.duelWins) + safeNumber(userDoc.duelLosses));
    const duelParticipationContribution = Math.log1p(duelMatches) * 22;

    const modePlaysRaw = participationStats.modePlays;
    let modeVarietyContribution = 0;
    let modeVolumeContribution = 0;

    let lastContributionAt: number | null = null;

    const pushTimestamp = (timestamp: number | null) => {
        if (timestamp) {
            lastContributionAt = Math.max(lastContributionAt ?? 0, timestamp);
        }
    };

    generatedExams.forEach((exam: any) => {
        pushTimestamp(toMillis(exam?.createdAt));
    });

    let highScoreQuality = 0;
    highScoresRaw.forEach((score: HighScoreLike) => {
        const numericScore = safeNumber(score.score);
        if (numericScore > 0) {
            highScoreQuality += Math.min(120, numericScore / 15);
        }
        pushTimestamp(toMillis(score.date));
    });

    documentLibrary.forEach((doc: any) => {
        pushTimestamp(toMillis(doc?.createdAt));
    });

    pushTimestamp(toMillis(participationStats.lastQuestionCreatedAt));

    if (modePlaysRaw && typeof modePlaysRaw === 'object') {
        const entries = Object.values(modePlaysRaw).filter(Boolean) as Array<Record<string, any>>;
        if (entries.length > 0) {
            modeVarietyContribution = Math.min(25 + entries.length * 18, 160);
            const totalSessions = entries.reduce((sum, entry) => sum + safeNumber(entry?.count), 0);
            modeVolumeContribution = Math.log1p(totalSessions) * 12;
            entries.forEach((entry) => {
                pushTimestamp(toMillis(entry?.lastPlayedAt));
            });
        }
    }

    pushTimestamp(toMillis(participationStats.lastModePlayedAt));

    const ticketBoost = Math.min(safeNumber(userDoc.duelTickets) * 5, 40);
    const creditPlanBoost = userDoc.creditPlan === 'pro' ? 60 : 0;
    const missionBonus = clamp(safeNumber(userDoc.missionPoints) || 0, 0, 500);

    const participationScore = clamp(
        documentsContribution +
            solvedContribution +
            examContribution +
            highScoreQuality +
            questionCreationContribution +
            modeVarietyContribution +
            modeVolumeContribution +
            duelParticipationContribution +
            ticketBoost +
            creditPlanBoost +
            missionBonus,
        0,
        2000
    );

    return {
        score: participationScore,
        lastContributionAt,
    };
};

const computeSeasonScore = (baseScore: number, participationScore: number, lastActivity: number | null): number => {
    if (!lastActivity) {
        return baseScore;
    }
    const now = Date.now();
    const daysIdle = Math.max(0, (now - lastActivity) / DAY_IN_MS);
    const decayFactor = Math.pow(SEASON_DECAY_PER_DAY, daysIdle);
    const participationPadding = Math.min(participationScore * 0.5, 400);
    return baseScore * decayFactor + participationPadding;
};

const mostRecentTimestamp = (candidates: Array<number | null | undefined>): number | null => {
    let latest: number | null = null;
    candidates.forEach((value) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            latest = Math.max(latest ?? 0, value);
        }
    });
    return latest;
};

export const computeLeaderboardSnapshot = (userDoc: Record<string, any>): LeaderboardSnapshot => {
    const duelComponent = computeDuelComponent(userDoc);
    const skillComponent = computeSkillComponent(userDoc.answerHistory);
    const participationComponent = computeParticipationComponent(userDoc);

    const combinedScore = clamp(
        duelComponent.score * 0.6 + skillComponent.score * 0.3 + participationComponent.score * 0.1,
        0,
        SCORE_CAP
    );

    const lastSeen = toMillis(userDoc.lastSeen);
    const lastActivity = mostRecentTimestamp([
        duelComponent.lastActivity,
        skillComponent.lastAnsweredAt,
        participationComponent.lastContributionAt,
        lastSeen,
    ]);

    const seasonScore = clamp(computeSeasonScore(combinedScore, participationComponent.score, lastActivity), 0, SCORE_CAP);

    return {
        leaderboardScore: Math.round(combinedScore),
        seasonScore: Math.round(seasonScore),
        skillPoints: Math.round(skillComponent.score),
        participationPoints: Math.round(participationComponent.score),
    };
};
