type Serializable =
    | string
    | number
    | boolean
    | null
    | undefined
    | Serializable[]
    | { [key: string]: Serializable };

interface ReplacerOptions {
    space?: number | string;
}

/**
 * Güvenli JSON.stringify alternatifi.
 * - Döngüsel referansları tespit edip "[Circular]" olarak işaretler.
 * - File/Blob gibi serileşemeyen tarayıcı nesnelerini meta veriye indirger.
 */
export const safeStringify = (
    value: unknown,
    { space }: ReplacerOptions = {}
): string => {
    const seen = new WeakSet();

    const replacer = (_key: string, val: unknown): Serializable => {
        if (typeof val === 'object' && val !== null) {
            if (seen.has(val as object)) {
                return '[Circular]';
            }
            seen.add(val as object);

            if (val instanceof File) {
                return {
                    name: val.name,
                    type: val.type,
                    size: val.size,
                    lastModified: val.lastModified,
                };
            }

            if (val instanceof Blob) {
                return {
                    type: val.type,
                    size: val.size,
                };
            }

            if (val instanceof Date) {
                return (val as Date).toISOString();
            }
        }

        if (typeof val === 'function') {
            return `[Function ${val.name || 'anonymous'}]`;
        }

        return val as Serializable;
    };

    return JSON.stringify(value as Serializable, replacer, space);
};

export default safeStringify;
