export function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function deepMerge(base, patch) {
    if (!isPlainObject(base) || !isPlainObject(patch)) return patch === undefined ? base : patch;
    const result = { ...base };
    for (const [key, value] of Object.entries(patch)) {
        result[key] = deepMerge(base[key], value);
    }
    return result;
}

// Reconstruit `input` en suivant la forme de `template` : seules les clés connues
// sont conservées, et chaque valeur doit avoir le même type que dans le modèle.
export function conformTo(template, input) {
    if (isPlainObject(template)) {
        const source = isPlainObject(input) ? input : {};
        return Object.fromEntries(
            Object.keys(template).map(key => [key, conformTo(template[key], source[key])])
        );
    }
    if (typeof template === 'number') {
        const n = typeof input === 'string' && input.trim() === '' ? NaN : Number(input);
        return input !== null && Number.isFinite(n) ? n : template;
    }
    return typeof input === typeof template ? input : template;
}
