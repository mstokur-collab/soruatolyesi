import * as admin from 'firebase-admin';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export type MissionFrequency = 'daily' | 'weekly' | 'seasonal' | 'dynamic';
export type MissionTargetType =
    | 'duelWins'
    | 'questionsSolved'
    | 'practiceSessions'
    | 'aiAnalysis'
    | 'lessonCompleted'
    | 'kazanimPractice';

export interface MissionPracticeConfig {
    kazanimId: string;
    kazanimLabel?: string;
    subjectId?: string;
    minQuestions: number;
    minAccuracy: number;
    dueAt?: string;
}

interface MissionPracticeStats {
    attempts: number;
    correct: number;
    uniqueQuestionIds: string[];
    firstAttemptAt?: string;
    lastAttemptAt?: string;
}

export interface MissionDefinition {
    id: string;
    title: string;
    description: string;
    frequency: MissionFrequency;
    rewardPoints: number;
    target: number;
    targetType: MissionTargetType;
    expiresInHours?: number;
    filters?: {
        segmentType?: string;
        il?: string;
        okul?: string;
        sinif?: number;
    };
    isActive?: boolean;
    practiceConfig?: MissionPracticeConfig;
}

export interface MissionInstance {
    missionId: string;
    title: string;
    description: string;
    frequency: MissionFrequency;
    targetType: MissionTargetType;
    rewardPoints: number;
    status: 'pending' | 'completed' | 'claimed' | 'expired';
    progress: {
        current: number;
        target: number;
        lastUpdatedAt: string;
    };
    assignedAt: string;
    assignedDate: string;
    assignmentKey: string;
    expiresAt?: string;
    completedAt?: string;
    expiredAt?: string;
    analysisTriggeredAt?: string;
    analysisChainId?: string;
    practiceConfig?: MissionPracticeConfig;
    practiceConfigKazanimId?: string | null;
    practiceStats?: MissionPracticeStats;
}

export const getActiveMissionDefinitions = async (
    frequency: MissionFrequency
): Promise<MissionDefinition[]> => {
    const snapshot = await admin
        .firestore()
        .collection('missions')
        .where('frequency', '==', frequency)
        .where('isActive', '==', true)
        .get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...(doc.data() as Omit<MissionDefinition, 'id'>),
    }));
};

export const buildMissionInstance = (
    mission: MissionDefinition,
    assignedDate: string,
    overrides?: Partial<MissionDefinition>
): MissionInstance => {
    const assignedAt = new Date().toISOString();
    const merged = { ...mission, ...overrides };
    const expiresAt = merged.expiresInHours
        ? new Date(Date.now() + merged.expiresInHours * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return {
        missionId: merged.id,
        title: merged.title,
        description: merged.description,
        frequency: merged.frequency,
        targetType: merged.targetType,
        rewardPoints: merged.rewardPoints,
        status: 'pending',
        progress: {
            current: 0,
            target: merged.target,
            lastUpdatedAt: assignedAt,
        },
        assignedAt,
        assignedDate,
        assignmentKey: `${assignedDate}:${merged.id}`,
        expiresAt,
        practiceConfig: merged.practiceConfig,
        practiceConfigKazanimId: merged.practiceConfig?.kazanimId ?? null,
        practiceStats: merged.practiceConfig
            ? { attempts: 0, correct: 0, uniqueQuestionIds: [] }
            : undefined,
    };
};

interface WeakKazanimStat {
    id: string;
    label: string;
    subjectId?: string;
}

export const createTargetedPracticeMissions = async (
    userId: string,
    weakest: WeakKazanimStat[],
    options?: { questionTarget?: number; accuracyTarget?: number; expiresInHours?: number; rewardPoints?: number }
) => {
    if (!weakest.length) return;
    const rewardPoints = options?.rewardPoints ?? 250;
    const minQuestions = options?.questionTarget ?? 10;
    const minAccuracy = options?.accuracyTarget ?? 60;
    const expiresInHours = options?.expiresInHours ?? 48;

    const assignedDate = new Date().toISOString().split('T')[0];
    const userRef = admin.firestore().collection('users').doc(userId);
    const missionsRef = userRef.collection('activeMissions');
    const batch = admin.firestore().batch();

    for (const stat of weakest) {
        const existingSnapshot = await missionsRef
            .where('targetType', '==', 'kazanimPractice')
            .where('practiceConfigKazanimId', '==', stat.id)
            .where('status', '==', 'pending')
            .get();

        existingSnapshot.forEach((doc) => {
            batch.update(doc.ref, {
                status: 'expired',
                expiredAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });

        const missionId = `practice-${stat.id}-${Date.now().toString(36)}`;
        const chainId = `${missionId}-chain`;
        const instance = buildMissionInstance(
            {
                id: missionId,
                title: `${stat.label} kazanımını güçlendir`,
                description: `${stat.label} için ${minQuestions} soru çöz ve en az %${minAccuracy} doğruluk yakala.`,
                frequency: 'dynamic',
                rewardPoints,
                target: minQuestions,
                targetType: 'kazanimPractice',
                expiresInHours,
                practiceConfig: {
                    kazanimId: stat.id,
                    kazanimLabel: stat.label,
                    subjectId: stat.subjectId,
                    minQuestions,
                    minAccuracy,
                    dueAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
                },
            },
            assignedDate,
            {
                id: missionId,
            }
        );

        const docRef = missionsRef.doc(missionId);
        batch.set(docRef, {
            ...instance,
            analysisChainId: chainId,
            analysisTriggeredAt: instance.assignedAt,
        });
    }

    await batch.commit();
};

// Helper constant for daily mission limit
export const DAILY_MISSION_ASSIGN_LIMIT = 3;

/**
 * Assigns daily missions for a single user
 * Checks what missions the user already has for today and fills in the gaps
 */
export const assignDailyMissionsForUser = async (
    userId: string,
    missions: MissionDefinition[],
    todayKey: string
): Promise<number> => {
    const userRef = admin.firestore().collection('users').doc(userId);
    const activeRef = userRef.collection('activeMissions');

    const existingSnapshot = await activeRef
        .where('frequency', '==', 'daily')
        .where('assignedDate', '==', todayKey)
        .get();

    const alreadyAssigned = new Set(existingSnapshot.docs.map((doc) => doc.data().missionId as string));

    if (existingSnapshot.size >= DAILY_MISSION_ASSIGN_LIMIT) {
        return 0;
    }

    const available = missions.filter((mission) => !alreadyAssigned.has(mission.id));
    if (!available.length) {
        return 0;
    }

    const toAssign = available.slice(0, DAILY_MISSION_ASSIGN_LIMIT - existingSnapshot.size);
    const batch = admin.firestore().batch();

    toAssign.forEach((mission) => {
        const instance = buildMissionInstance(mission, todayKey);
        const docRef = activeRef.doc(`${mission.id}-${todayKey}`);
        batch.set(docRef, instance);
    });

    await batch.commit();
    return toAssign.length;
};
