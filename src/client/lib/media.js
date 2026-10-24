// Passe les images d'emotes et de badges par le cache local du serveur HUD :
// chaque image n'est téléchargée qu'une fois depuis les CDN.
export const cachedMedia = url => `/media?u=${encodeURIComponent(url)}`;
