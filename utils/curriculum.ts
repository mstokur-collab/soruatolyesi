import type { AltKonu, Kazanim } from '../types';

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

