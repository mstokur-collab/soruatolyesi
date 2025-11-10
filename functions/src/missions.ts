import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
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

export const DAILY_MISSION_ASSIGN_LIMIT = 3;

interface AssignDailyMissionOptions {
    dateKey?: string;
    limit?: number;
    missions?: MissionDefinition[];
}

export const assignDailyMissionsForUser = async (
    uid: string,
    options: AssignDailyMissionOptions = {}
): Promise<{ assigned: number }> => {
    if (!uid) {
        return { assigned: 0 };
    }

    try {
        const limit = Math.max(0, options.limit ?? DAILY_MISSION_ASSIGN_LIMIT);
        if (limit === 0) {
            return { assigned: 0 };
        }

        const dateKey = options.dateKey ?? new Date().toISOString().split('T')[0];
        const missions =
            options.missions && options.missions.length > 0
                ? options.missions
                : await getActiveMissionDefinitions('daily');

        if (!missions.length) {
            functions.logger.info('assignDailyMissionsForUser skipped (no missions)', { uid, dateKey });
            return { assigned: 0 };
        }

        const userRef = admin.firestore().collection('users').doc(uid);
        const activeRef = userRef.collection('activeMissions');

        const existingSnapshot = await activeRef
            .where('frequency', '==', 'daily')
            .where('assignedDate', '==', dateKey)
            .get();

        if (existingSnapshot.size >= limit) {
            functions.logger.debug('assignDailyMissionsForUser skipped (already at limit)', {
                uid,
                dateKey,
                existing: existingSnapshot.size,
                limit,
            });
            return { assigned: 0 };
        }

        const alreadyAssigned = new Set(existingSnapshot.docs.map((doc) => doc.data().missionId as string));
        const available = missions.filter((mission) => mission.isActive !== false && !alreadyAssigned.has(mission.id));
        if (!available.length) {
            functions.logger.debug('assignDailyMissionsForUser skipped (no available missions)', {
                uid,
                dateKey,
            });
            return { assigned: 0 };
        }

        const slotsRemaining = Math.max(0, limit - existingSnapshot.size);
        if (slotsRemaining === 0) {
            return { assigned: 0 };
        }

        const toAssign = available.slice(0, slotsRemaining);
        if (!toAssign.length) {
            return { assigned: 0 };
        }

        const batch = admin.firestore().batch();
        toAssign.forEach((mission) => {
            const instance = buildMissionInstance(mission, dateKey);
            const docRef = activeRef.doc(`${mission.id}-${dateKey}`);
            batch.set(docRef, instance);
        });
        await batch.commit();

        functions.logger.info('assignDailyMissionsForUser completed', {
            uid,
            dateKey,
            assigned: toAssign.length,
        });

        return { assigned: toAssign.length };
    } catch (error: any) {
        functions.logger.error('assignDailyMissionsForUser error', {
            uid,
            message: error?.message,
            stack: error?.stack,
        });
        throw error;
    }
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
    const instance: MissionInstance = {
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
        practiceConfigKazanimId: merged.practiceConfig?.kazanimId ?? null,
    };

    if (merged.practiceConfig) {
        instance.practiceConfig = merged.practiceConfig;
        instance.practiceStats = { attempts: 0, correct: 0, uniqueQuestionIds: [] };
    }

    return instance;
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
