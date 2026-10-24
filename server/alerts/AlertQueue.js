import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

export const ALERT_KINDS = ['follow', 'raid', 'sub', 'giftsub', 'cheer'];
// Au-delà, les plus anciennes alertes en attente sont abandonnées (vague de bots…).
const MAX_PENDING = 500;

/**
 * File d'attente des alertes, tenue par le serveur pour que tous les overlays (OBS, aperçu)
 * affichent la même alerte au même moment, et que le panneau puisse la piloter.
 *
 * Un type en pause dans les réglages garde ses alertes (tests compris) en attente sans les
 * afficher, jusqu'à sa reprise ou leur retrait.
 * Émet 'show' (alerte), 'hide' (), et 'change' (state()) à chaque évolution.
 */
export class AlertQueue extends EventEmitter {
    #pending = [];
    #current = null;
    #timer = null;
    #getTiming;
    #isPaused;

    // getTiming(alert) → { displayMs, durationMs } : durée de la bannière, et durée pendant
    // laquelle l'alerte occupe la file (son compris, au moins displayMs).
    // isPaused(kind) : type en pause dans les réglages.
    constructor(getTiming, isPaused) {
        super();
        this.#getTiming = getTiming;
        this.#isPaused = isPaused;
    }

    push(alert) {
        this.#pending.push({ id: randomUUID(), receivedAt: Date.now(), ...alert });
        if (this.#pending.length > MAX_PENDING) this.#pending.splice(0, this.#pending.length - MAX_PENDING);
        this.#showNext();
        this.#changed();
    }

    // Retire une alerte en attente, ou interrompt celle affichée.
    remove(id) {
        if (this.#current?.id === id) return this.skip();
        const before = this.#pending.length;
        this.#pending = this.#pending.filter(alert => alert.id !== id);
        if (this.#pending.length !== before) this.#changed();
    }

    // Vide les alertes en attente d'un type (ou toutes).
    clear(kind = null) {
        this.#pending = kind ? this.#pending.filter(alert => alert.kind !== kind) : [];
        this.#changed();
    }

    skip() {
        if (!this.#current) return;
        this.#hideCurrent();
        this.#showNext();
        this.#changed();
    }

    // À appeler quand les réglages changent : un type qui sort de pause reprend son affichage.
    refresh() {
        this.#showNext();
        this.#changed();
    }

    state() {
        return { current: this.#current, pending: this.#pending, paused: ALERT_KINDS.filter(kind => this.#isPaused(kind)) };
    }

    stop() {
        clearTimeout(this.#timer);
    }

    #showNext() {
        if (this.#current) return;
        const index = this.#pending.findIndex(alert => !this.#isPaused(alert.kind));
        if (index < 0) return;

        const [alert] = this.#pending.splice(index, 1);
        const { displayMs, durationMs } = this.#getTiming(alert);
        this.#current = { ...alert, shownAt: Date.now(), displayMs, durationMs };
        this.emit('show', this.#current);
        this.#timer = setTimeout(() => {
            this.#hideCurrent();
            this.#showNext();
            this.#changed();
        }, durationMs);
    }

    #hideCurrent() {
        clearTimeout(this.#timer);
        this.#current = null;
        this.emit('hide');
    }

    #changed() {
        this.emit('change', this.state());
    }
}
