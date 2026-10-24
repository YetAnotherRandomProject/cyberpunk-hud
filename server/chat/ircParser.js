const TAG_ESCAPES = { ':': ';', s: ' ', '\\': '\\', r: '\r', n: '\n' };

function unescapeTagValue(value) {
    return value.replace(/\\(.)/g, (_, c) => TAG_ESCAPES[c] ?? c);
}

/**
 * Découpe une ligne IRC (avec les tags IRCv3 de Twitch) :
 * "@a=1;b=2 :nick!user@host PRIVMSG #chan :texte"
 * → { tags: { a: '1', b: '2' }, prefix: 'nick!user@host', command: 'PRIVMSG', params: ['#chan', 'texte'] }
 */
export function parseIrcLine(line) {
    let rest = line;
    const tags = {};

    if (rest.startsWith('@')) {
        const end = rest.indexOf(' ');
        for (const pair of rest.slice(1, end).split(';')) {
            const eq = pair.indexOf('=');
            if (eq === -1) tags[pair] = '';
            else tags[pair.slice(0, eq)] = unescapeTagValue(pair.slice(eq + 1));
        }
        rest = rest.slice(end + 1);
    }

    let prefix = null;
    if (rest.startsWith(':')) {
        const end = rest.indexOf(' ');
        prefix = rest.slice(1, end);
        rest = rest.slice(end + 1);
    }

    const trailingAt = rest.indexOf(' :');
    const head = trailingAt === -1 ? rest : rest.slice(0, trailingAt);
    const [command, ...params] = head.split(' ').filter(Boolean);
    if (trailingAt !== -1) params.push(rest.slice(trailingAt + 2));

    return { tags, prefix, command, params };
}

export function nickFromPrefix(prefix) {
    return prefix ? prefix.split('!')[0] : null;
}
