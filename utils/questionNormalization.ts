const TURKISH_KEY = 'kazan\u0131mId';

const sanitizeKazanimId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.replace(/\.+$/, '');
};

export const normalizeQuestionRecord = <T extends Record<string, any>>(raw: T | null | undefined): (T & { kazanimId: string }) | null => {
    if (!raw || typeof raw !== 'object') return null;
    const asciiValue = sanitizeKazanimId((raw as any).kazanimId);
    const turkishValue = sanitizeKazanimId((raw as Record<string, unknown>)[TURKISH_KEY]);
    const kazanimId = asciiValue ?? turkishValue;

    if (!kazanimId) return null;

    return {
        ...raw,
        kazanimId,
    };
};
