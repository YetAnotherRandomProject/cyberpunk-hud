const GQL_URL = 'https://gql.twitch.tv/gql';
// Client-Id public utilisé par le site web de Twitch : aucune clé d'API à fournir.
const PUBLIC_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

const CHANNEL_QUERY = `query HudChannel($login: String!) {
    user(login: $login) {
        id
        displayName
        roles { isPartner isAffiliate }
        followers { totalCount }
        broadcastSettings { title language game { displayName } }
        stream { viewersCount createdAt }
    }
}`;

const FOLLOWERS_QUERY = `query HudFollowers($login: String!) {
    user(login: $login) { followers { totalCount } }
}`;

async function gql(query, login) {
    const res = await fetch(GQL_URL, {
        method: 'POST',
        headers: { 'Client-Id': PUBLIC_CLIENT_ID, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { login } }),
        signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json?.data?.user ?? null;
}

function broadcasterType(roles) {
    if (roles?.isPartner) return 'partner';
    if (roles?.isAffiliate) return 'affiliate';
    return null;
}

// Infos publiques d'une chaîne, au format commun aux deux clients Twitch.
export async function fetchPublicChannel(login) {
    const user = await gql(CHANNEL_QUERY, login);
    if (!user) return null;

    const settings = user.broadcastSettings;
    return {
        id: user.id,
        displayName: user.displayName,
        title: settings?.title || null,
        category: settings?.game?.displayName || null,
        language: settings?.language || null,
        broadcasterType: broadcasterType(user.roles),
        followers: user.followers?.totalCount ?? null,
        stream: user.stream
            ? { viewers: user.stream.viewersCount, startedAt: Date.parse(user.stream.createdAt) }
            : null
    };
}

export async function fetchPublicFollowerCount(login) {
    const user = await gql(FOLLOWERS_QUERY, login);
    return user?.followers?.totalCount ?? null;
}

const BADGES_QUERY = `query HudBadges($login: String!) {
    badges { setID version title imageURL(size: DOUBLE) }
    user(login: $login) { broadcastBadges { setID version title imageURL(size: DOUBLE) } }
}`;

// Badges globaux puis badges de la chaîne (qui remplacent les globaux de même clé).
export async function fetchPublicBadges(login) {
    const res = await fetch(GQL_URL, {
        method: 'POST',
        headers: { 'Client-Id': PUBLIC_CLIENT_ID, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: BADGES_QUERY, variables: { login } }),
        signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();

    const badges = new Map();
    for (const badge of [...(data?.badges ?? []), ...(data?.user?.broadcastBadges ?? [])]) {
        badges.set(`${badge.setID}/${badge.version}`, { title: badge.title, url: badge.imageURL });
    }
    return badges;
}
