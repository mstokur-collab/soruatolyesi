import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export type SegmentType = 'global' | 'city' | 'school' | 'class';

export interface LeaderboardEntry {
    uid: string;
    displayName: string;
    photoURL?: string;
    il?: string | null;
    okul?: string | null;
    sinif?: number | null;
    leaderboardScore: number;
    seasonScore: number;
    skillPoints: number;
    participationPoints: number;
    rank: number;
}

export interface SegmentSnapshot {
    docId: string;
    segmentType: SegmentType;
    segmentId: string;
    label: string;
    filters: {
        il?: string;
        okul?: string;
        sinif?: number;
    };
    entries: LeaderboardEntry[];
}

const MAX_SEGMENT_ENTRIES = 50;

const normalizeString = (value?: string | null): string | null => {
    if (!value || typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    return trimmed;
};

const slugify = (value: string): string => {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'unknown';
};

interface SegmentKey {
    segmentType: SegmentType;
    segmentId: string;
    label: string;
    filters: SegmentSnapshot['filters'];
}

const deriveSegmentKeys = (data: Record<string, any>): SegmentKey[] => {
    const keys: SegmentKey[] = [
        {
            segmentType: 'global',
            segmentId: 'global',
            label: 'Genel Liderlik',
            filters: {},
        },
    ];

    const normalizedIl = normalizeString(data.il);
    if (normalizedIl) {
        keys.push({
            segmentType: 'city',
            segmentId: `city-${slugify(normalizedIl)}`,
            label: `İl: ${normalizedIl}`,
            filters: { il: normalizedIl },
        });
    }

    const normalizedSchool = normalizeString(data.okul);
    if (normalizedSchool) {
        keys.push({
            segmentType: 'school',
            segmentId: `school-${slugify(normalizedSchool)}`,
            label: `Okul: ${normalizedSchool}`,
            filters: { okul: normalizedSchool },
        });

        const sinif = typeof data.sinif === 'number' ? data.sinif : null;
        if (sinif) {
            keys.push({
                segmentType: 'class',
                segmentId: `class-${slugify(normalizedSchool)}-${sinif}`,
                label: `${sinif}. Sınıf @ ${normalizedSchool}`,
                filters: { okul: normalizedSchool, sinif },
            });
        }
    }

    return keys;
};

const sortEntries = (entries: LeaderboardEntry[]): LeaderboardEntry[] => {
    return [...entries].sort((a, b) => {
        if (b.seasonScore !== a.seasonScore) {
            return b.seasonScore - a.seasonScore;
        }
        return b.leaderboardScore - a.leaderboardScore;
    }).map((entry, index) => ({
        ...entry,
        rank: index + 1,
    }));
};

const createEntryFromDoc = (doc: QueryDocumentSnapshot): LeaderboardEntry => {
    const data = doc.data() as Record<string, any>;
    return {
        uid: doc.id,
        displayName: data.displayName || 'İsimsiz Oyuncu',
        photoURL: data.photoURL || '',
        il: data.il ?? null,
        okul: data.okul ?? null,
        sinif: typeof data.sinif === 'number' ? data.sinif : null,
        leaderboardScore: Number(data.leaderboardScore) || 0,
        seasonScore: Number(data.seasonScore) || 0,
        skillPoints: Number(data.skillPoints) || 0,
        participationPoints: Number(data.participationPoints) || 0,
        rank: 0,
    };
};

export const buildSegmentSnapshots = (docs: QueryDocumentSnapshot[]): SegmentSnapshot[] => {
    const segmentMap = new Map<string, SegmentSnapshot>();

    docs.forEach((doc) => {
        const data = doc.data();
        if (!data) return;
        const entry = createEntryFromDoc(doc);
        const segments = deriveSegmentKeys(data);

        segments.forEach((segment) => {
            const key = `${segment.segmentType}:${segment.segmentId}`;
            if (!segmentMap.has(key)) {
                segmentMap.set(key, {
                    docId: segment.segmentId,
                    segmentType: segment.segmentType,
                    segmentId: segment.segmentId,
                    label: segment.label,
                    filters: segment.filters,
                    entries: [],
                });
            }
            const snapshot = segmentMap.get(key);
            if (snapshot) {
                snapshot.entries.push(entry);
            }
        });
    });

    return Array.from(segmentMap.values()).map((snapshot) => {
        const sorted = sortEntries(snapshot.entries).slice(0, MAX_SEGMENT_ENTRIES);
        return {
            ...snapshot,
            entries: sorted.map((entry, index) => ({
                ...entry,
                rank: index + 1,
            })),
        };
    });
};

export const getActiveSeasonId = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const quarter = Math.floor(month / 3) + 1;
    return `${year}-Q${quarter}`;
};
