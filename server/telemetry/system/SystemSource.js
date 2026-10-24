import os from 'node:os';

const BYTES_PER_GB = 1024 ** 3;

// Charge globale du PC (tous les processus, pas seulement OBS) : CPU % et RAM utilisée.
export class SystemSource {
    #state;
    #timer = null;
    #intervalSec = null;
    #lastCpu = readCpuTimes();

    constructor(state) {
        this.#state = state;
    }

    configure({ pollIntervalSec }) {
        if (this.#timer && pollIntervalSec === this.#intervalSec) return;
        this.#intervalSec = pollIntervalSec;
        clearInterval(this.#timer);
        this.#timer = setInterval(() => this.#poll(), Math.max(1, pollIntervalSec) * 1000);
        this.#poll();
    }

    stop() {
        clearInterval(this.#timer);
        this.#timer = null;
    }

    #poll() {
        const cpu = readCpuTimes();
        const total = cpu.total - this.#lastCpu.total;
        const idle = cpu.idle - this.#lastCpu.idle;
        this.#lastCpu = cpu;
        // Premier relevé (ou intervalle trop court) : pas encore de différence mesurable.
        if (total > 0) this.#state.setMetric('CPU', (1 - idle / total) * 100, '%', 1);

        const usedGb = (os.totalmem() - os.freemem()) / BYTES_PER_GB;
        this.#state.setMetric('RAM', usedGb, 'GB', 1);
        this.#state.commit();
    }
}

// Temps cumulés de tous les cœurs depuis le démarrage du PC.
function readCpuTimes() {
    let total = 0;
    let idle = 0;
    for (const { times } of os.cpus()) {
        total += times.user + times.nice + times.sys + times.idle + times.irq;
        idle += times.idle;
    }
    return { total, idle };
}
