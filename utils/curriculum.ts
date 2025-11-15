import type {
    AltKonu,
    Kazanim,
    LegacyOgrenmeAlani,
    LocalCurriculumState,
    OgrenmeAlani,
    SubjectCurriculum,
} from '../types';

const normalizeKey = (key: string): string =>
    key
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'I')
        .toLowerCase();

const sanitizeKazanimList = (value: unknown): Kazanim[] => {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const result: Kazanim[] = [];

    value.forEach((item: any) => {
        if (!item || typeof item !== 'object') return;
        const { id, text } = item as Partial<Kazanim>;
        if (typeof id !== 'string' || !id.trim()) return;
        if (typeof text !== 'string' || !text.trim()) return;
        const trimmedId = id.trim();
        if (seen.has(trimmedId)) return;
        seen.add(trimmedId);
        result.push({ id: trimmedId, text: text.trim() });
    });

    return result;
};

export const getKazanimlarFromAltKonu = (altKonu: AltKonu | Record<string, any>): Kazanim[] => {
    if (!altKonu || typeof altKonu !== 'object') return [];

    // Direct access if the data already follows the expected key.
    const direct = (altKonu as any).kazanimlar;
    const directList = sanitizeKazanimList(direct);
    if (directList.length > 0) {
        return directList;
    }

    // Handle historical data that may use Turkish characters or other variants for the key.
    const fallbackKey = Object.keys(altKonu).find((key) => normalizeKey(key) === 'kazanimlar');
    if (!fallbackKey) return [];

    return sanitizeKazanimList((altKonu as any)[fallbackKey]);
};

const sanitizeLearningArea = (area: LegacyOgrenmeAlani | OgrenmeAlani): OgrenmeAlani => {
    if (Array.isArray((area as OgrenmeAlani).kazanimlar)) {
        return {
            name: area.name,
            kazanimlar: sanitizeKazanimList((area as OgrenmeAlani).kazanimlar),
        };
    }

    const legacyArea = area as LegacyOgrenmeAlani;
    const normalized = Array.isArray(legacyArea.altKonular)
        ? legacyArea.altKonular.flatMap((altKonu) => getKazanimlarFromAltKonu(altKonu))
        : [];

    return {
        name: legacyArea.name,
        kazanimlar: sanitizeKazanimList(normalized),
    };
};

export const flattenLearningAreas = (
    areas: (LegacyOgrenmeAlani | OgrenmeAlani)[] | undefined
): OgrenmeAlani[] => {
    if (!Array.isArray(areas)) return [];
    return areas
        .map((area) => sanitizeLearningArea(area))
        .filter((area) => Boolean(area.name));
};

export const flattenLegacyCurriculum = (
    curriculum: Record<number, (LegacyOgrenmeAlani | OgrenmeAlani)[]>
): Record<number, OgrenmeAlani[]> => {
    const flattened: Record<number, OgrenmeAlani[]> = {};

    Object.entries(curriculum || {}).forEach(([gradeKey, areas]) => {
        const grade = Number(gradeKey);
        flattened[grade] = flattenLearningAreas(areas);
    });

    return flattened;
};

const cloneLearningAreas = (areas: OgrenmeAlani[] = []): OgrenmeAlani[] =>
    areas.map((area) => ({
        name: area.name,
        kazanimlar: Array.isArray(area.kazanimlar)
            ? area.kazanimlar.map((k) => ({ id: k.id, text: k.text }))
            : [],
    }));

export const cloneSubjectCurriculum = (subject?: SubjectCurriculum): SubjectCurriculum => {
    const cloned: SubjectCurriculum = {};
    Object.entries(subject || {}).forEach(([gradeKey, areas]) => {
        const grade = Number(gradeKey);
        if (Number.isNaN(grade) || !Array.isArray(areas)) {
            return;
        }
        cloned[grade] = cloneLearningAreas(areas);
    });
    return cloned;
};

export const mergeCurricula = (
    base: Record<string, SubjectCurriculum>,
    additions?: Record<string, SubjectCurriculum>
): Record<string, SubjectCurriculum> => {
    const merged: Record<string, SubjectCurriculum> = {};

    Object.entries(base || {}).forEach(([subjectId, subjectData]) => {
        merged[subjectId] = cloneSubjectCurriculum(subjectData);
    });

    Object.entries(additions || {}).forEach(([subjectId, subjectData]) => {
        if (!subjectData) return;
        const target = merged[subjectId] ?? (merged[subjectId] = {});
        Object.entries(subjectData).forEach(([gradeKey, areas]) => {
            const grade = Number(gradeKey);
            if (Number.isNaN(grade) || !Array.isArray(areas)) {
                return;
            }
            const existingAreas = target[grade] ?? (target[grade] = []);
            const areaMap = new Map(existingAreas.map((area) => [area.name, area]));

            areas.forEach((area) => {
                if (!area || typeof area.name !== 'string') return;
                const normalizedArea: OgrenmeAlani = {
                    name: area.name,
                    kazanimlar: Array.isArray(area.kazanimlar)
                        ? area.kazanimlar
                              .filter((k) => k && typeof k.id === 'string' && typeof k.text === 'string')
                              .map((k) => ({ id: k.id, text: k.text }))
                        : [],
                };
                const existing = areaMap.get(area.name);
                if (!existing) {
                    const clone = {
                        name: normalizedArea.name,
                        kazanimlar: normalizedArea.kazanimlar.map((k) => ({ id: k.id, text: k.text })),
                    };
                    existingAreas.push(clone);
                    areaMap.set(area.name, clone);
                } else {
                    const existingIds = new Set(existing.kazanimlar.map((k) => k.id));
                    normalizedArea.kazanimlar.forEach((k) => {
                        if (!k.id || existingIds.has(k.id)) return;
                        existing.kazanimlar.push({ id: k.id, text: k.text });
                        existingIds.add(k.id);
                    });
                }
            });
        });
    });

    return merged;
};

export const sanitizeLocalCurriculumState = (
    value?: Partial<LocalCurriculumState>
): LocalCurriculumState => {
    if (!value) {
        return { curriculum: {}, subjectNames: {} };
    }

    const safeCurriculum: Record<string, SubjectCurriculum> = {};
    Object.entries(value.curriculum || {}).forEach(([subjectId, subjectData]) => {
        if (!subjectData || typeof subjectData !== 'object') return;
        safeCurriculum[subjectId] = cloneSubjectCurriculum(subjectData as SubjectCurriculum);
    });

    const safeSubjectNames: Record<string, string> = {};
    Object.entries(value.subjectNames || {}).forEach(([subjectId, name]) => {
        if (typeof name === 'string' && name.trim()) {
            safeSubjectNames[subjectId] = name.trim();
        }
    });

    return {
        curriculum: safeCurriculum,
        subjectNames: safeSubjectNames,
    };
};

export const inferSubjectName = (subjectId: string): string =>
    subjectId
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

export const normalizeSubjectId = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
