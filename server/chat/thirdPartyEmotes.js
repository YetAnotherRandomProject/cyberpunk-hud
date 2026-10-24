// Emotes des extensions 7TV, BetterTTV et FrankerFaceZ (API publiques, sans clé).
// Chaque fournisseur renvoie une liste [{ name, url, zeroWidth }].

// Drapeau 7TV « zero-width » : l'emote se superpose à la précédente au lieu de s'y ajouter.
const SEVENTV_ZERO_WIDTH = 1;

async function getJson(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    // 404 = la chaîne n'utilise pas ce fournisseur : ce n'est pas une erreur.
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${new URL(url).host} HTTP ${res.status}`);
    return res.json();
}

const absolute = url => (url.startsWith('//') ? `https:${url}` : url);

function fromSevenTv(emotes = []) {
    return emotes.map(emote => ({
        name: emote.name,
        url: absolute(`${emote.data.host.url}/2x.webp`),
        zeroWidth: Boolean(emote.flags & SEVENTV_ZERO_WIDTH)
    }));
}

function fromBttv(emotes = []) {
    return emotes.map(emote => ({
        name: emote.code,
        url: `https://cdn.betterttv.net/emote/${emote.id}/2x.webp`,
        zeroWidth: false
    }));
}

function fromFfzSets(sets = {}) {
    return Object.values(sets).flatMap(set => set.emoticons.map(emote => {
        const urls = emote.animated ?? emote.urls;
        return { name: emote.name, url: absolute(urls['2'] ?? urls['1']), zeroWidth: false };
    }));
}

export const PROVIDERS = {
    sevenTv: {
        global: async () => fromSevenTv((await getJson('https://7tv.io/v3/emote-sets/global'))?.emotes),
        channel: async roomId => fromSevenTv((await getJson(`https://7tv.io/v3/users/twitch/${roomId}`))?.emote_set?.emotes)
    },
    bttv: {
        global: async () => fromBttv(await getJson('https://api.betterttv.net/3/cached/emotes/global')),
        channel: async roomId => {
            const json = await getJson(`https://api.betterttv.net/3/cached/users/twitch/${roomId}`);
            return fromBttv([...(json?.channelEmotes ?? []), ...(json?.sharedEmotes ?? [])]);
        }
    },
    ffz: {
        global: async () => {
            const json = await getJson('https://api.frankerfacez.com/v1/set/global');
            const defaults = new Set((json?.default_sets ?? []).map(String));
            return fromFfzSets(Object.fromEntries(Object.entries(json?.sets ?? {}).filter(([id]) => defaults.has(id))));
        },
        channel: async roomId => fromFfzSets((await getJson(`https://api.frankerfacez.com/v1/room/id/${roomId}`))?.sets)
    }
};

// Durées de validité du cache : les emotes globales changent rarement.
const GLOBAL_TTL_MS = 24 * 60 * 60_000;
const CHANNEL_TTL_MS = 30 * 60_000;

// Ordre de priorité croissant en cas de nom identique : FFZ < BTTV < 7TV, et global < chaîne.
const PRIORITY = ['ffz', 'bttv', 'sevenTv'];

/**
 * Charge les emotes des fournisseurs activés pour une chaîne (identifiée par son
 * id Twitch). Un fournisseur indisponible est ignoré sans bloquer les autres.
 * Les listes passent par `cache` (JsonCache) pour ne pas les redemander à chaque fois.
 * Retourne une Map nom → { url, zeroWidth }.
 */
export async function loadThirdPartyEmotes(roomId, enabled, cache) {
    const providers = PRIORITY.filter(key => enabled[key]);
    const lists = await Promise.all(providers.flatMap(key => [
        cache.get(`emotes-${key}-global`, GLOBAL_TTL_MS, PROVIDERS[key].global).catch(err => warn(key, err)),
        cache.get(`emotes-${key}-${roomId}`, CHANNEL_TTL_MS, () => PROVIDERS[key].channel(roomId)).catch(err => warn(key, err))
    ]));

    // Globales d'abord, puis celles des chaînes, pour que ces dernières l'emportent.
    const globals = lists.filter((_, i) => i % 2 === 0);
    const channels = lists.filter((_, i) => i % 2 === 1);

    const emotes = new Map();
    for (const list of [...globals, ...channels]) {
        for (const emote of list ?? []) {
            emotes.set(emote.name, { url: emote.url, zeroWidth: emote.zeroWidth });
        }
    }
    return emotes;
}

function warn(provider, err) {
    console.warn(`[TCHAT] Emotes ${provider} indisponibles :`, err.message);
    return [];
}
