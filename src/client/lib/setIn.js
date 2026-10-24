// Copie immuable de `obj` avec `value` placée au chemin donné ('a.b.c' ou ['a', 'b', 'c']).
export function setIn(obj, path, value) {
    const [key, ...rest] = Array.isArray(path) ? path : path.split('.');
    return {
        ...obj,
        [key]: rest.length === 0 ? value : setIn(obj?.[key] ?? {}, rest, value)
    };
}
