/**
 * Statistiques cumulées sur le live en cours : pic et moyenne de viewers,
 * followers gagnés. Repart de zéro à chaque nouveau live. Si l'application
 * démarre en plein live, les compteurs partent du moment du démarrage.
 */
export class StreamSession {
    #startedAt = null;
    #peak = 0;
    #sum = 0;
    #samples = 0;
    #followersAtStart = null;

    // Retourne les stats de session, ou null hors live.
    update(stream, followers) {
        if (!stream) {
            this.#reset(null);
            return null;
        }
        if (stream.startedAt !== this.#startedAt) this.#reset(stream.startedAt);
        if (this.#followersAtStart === null) this.#followersAtStart = followers;

        this.#peak = Math.max(this.#peak, stream.viewers);
        this.#sum += stream.viewers;
        this.#samples += 1;

        return {
            peakViewers: this.#peak,
            averageViewers: Math.round(this.#sum / this.#samples),
            followersGained: followers !== null && this.#followersAtStart !== null
                ? followers - this.#followersAtStart
                : null
        };
    }

    #reset(startedAt) {
        this.#startedAt = startedAt;
        this.#peak = 0;
        this.#sum = 0;
        this.#samples = 0;
        this.#followersAtStart = null;
    }
}
