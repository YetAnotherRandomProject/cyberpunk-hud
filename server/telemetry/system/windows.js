import { execFile } from 'node:child_process';

// Une ligne par processus ayant une fenêtre principale visible avec un titre.
const LIST_WINDOWS_SCRIPT = `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
@(Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } |
    ForEach-Object { [pscustomobject]@{ pid = $_.Id; name = $_.ProcessName; title = $_.MainWindowTitle } }) |
    ConvertTo-Json -Compress
`;

/**
 * Fenêtres ouvertes du PC : [{ pid, process, title }], `process` étant le nom
 * de l'exécutable (ex. « Cyberpunk2077.exe »).
 */
export function listOpenWindows() {
    if (process.platform !== 'win32') return Promise.resolve([]);

    return new Promise((resolve, reject) => {
        execFile(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-Command', LIST_WINDOWS_SCRIPT],
            { windowsHide: true, timeout: 10_000, maxBuffer: 4 * 1024 * 1024 },
            (err, stdout) => {
                if (err) return reject(new Error(`Liste des fenêtres impossible : ${err.message}`));
                try {
                    const parsed = stdout.trim() ? JSON.parse(stdout) : [];
                    const rows = Array.isArray(parsed) ? parsed : [parsed];
                    resolve(rows
                        .map(row => ({ pid: row.pid, process: `${row.name}.exe`, title: row.title }))
                        .sort((a, b) => a.process.localeCompare(b.process)));
                } catch (parseErr) {
                    reject(parseErr);
                }
            }
        );
    });
}
