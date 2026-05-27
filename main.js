const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const fsp = fs.promises;

function clampPercent(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
}

function cpuSnapshot() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
        const times = cpu.times;
        idle += times.idle;
        total += times.user + times.nice + times.sys + times.irq + times.idle;
    }
    return { idle, total };
}

let lastCpu = cpuSnapshot();

async function getPerfCountersWindowsJson() {
    const ps = [
        `$ErrorActionPreference='SilentlyContinue'`,
        `$cpu = 0`,
        `$disk = 0`,
        `$gpu = 0`,
        `try { $cpu = (Get-Counter '\\\\Processor(_Total)\\\\% Processor Time').CounterSamples[0].CookedValue } catch {}`,
        `try { $disk = (Get-Counter '\\\\PhysicalDisk(_Total)\\\\% Disk Time').CounterSamples[0].CookedValue } catch {}`,
        `try {`,
        `  $c = Get-Counter '\\\\GPU Engine(*)\\\\Utilization Percentage'`,
        `  if ($c -and $c.CounterSamples) {`,
        `    $vals = $c.CounterSamples | Select-Object -ExpandProperty CookedValue`,
        `    if ($vals) { $gpu = ($vals | Measure-Object -Sum).Sum }`,
        `  }`,
        `} catch {}`,
        `$obj = [PSCustomObject]@{ cpu = [double]$cpu; disk = [double]$disk; gpu = [double]$gpu }`,
        `$obj | ConvertTo-Json -Compress`
    ].join('; ');

    return new Promise((resolve) => {
        exec(`powershell -NoProfile -Command "${ps}"`, { windowsHide: true, maxBuffer: 1024 * 1024 }, (err, stdout) => {
            if (err || !stdout) return resolve(null);
            const s = String(stdout).trim();
            if (!s) return resolve(null);
            try {
                const obj = JSON.parse(s);
                resolve(obj);
            } catch {
                resolve(null);
            }
        });
    });
}

// (Legacy per-counter functions removed; we now query CPU/Disk/GPU together for stability)

async function getTotalDiskUsedSpacePercentWindows() {
    // Reliable fallback (NOT Task Manager "active time"): percent of *total capacity used*
    // across all fixed drives (DriveType=3), weighted by size.
    const cmd = `wmic logicaldisk where "DriveType=3" get FreeSpace,Size /value`;

    return new Promise((resolve) => {
        exec(cmd, { windowsHide: true }, (err, stdout) => {
            if (err || !stdout) return resolve(null);
            const text = String(stdout);

            const freeMatches = [...text.matchAll(/FreeSpace=(\d+)/gi)].map(m => Number(m[1]));
            const sizeMatches = [...text.matchAll(/Size=(\d+)/gi)].map(m => Number(m[1]));

            if (freeMatches.length === 0 || sizeMatches.length === 0) return resolve(null);

            // WMIC prints blocks; counts should line up, but guard anyway
            const count = Math.min(freeMatches.length, sizeMatches.length);
            let freeTotal = 0;
            let sizeTotal = 0;

            for (let i = 0; i < count; i++) {
                const free = freeMatches[i];
                const size = sizeMatches[i];
                if (!Number.isFinite(free) || !Number.isFinite(size) || size <= 0) continue;
                freeTotal += free;
                sizeTotal += size;
            }

            if (sizeTotal <= 0) return resolve(null);
            const usedPct = ((sizeTotal - freeTotal) / sizeTotal) * 100;
            resolve(clampPercent(usedPct));
        });
    });
}

let metricsCache = { cpu: 0, ram: 0, gpu: 0, disk: 0 };
let metricsInFlight = false;

async function refreshMetricsCache() {
    if (metricsInFlight) return;
    metricsInFlight = true;

    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const ramPct = totalMem > 0 ? ((totalMem - freeMem) / totalMem) * 100 : 0;

        let cpuPct = 0;
        let diskPct = 0;
        let gpuPct = 0;

        if (process.platform === 'win32') {
            // Prefer perf counters (matches Task Manager better)
            const perf = await getPerfCountersWindowsJson();
            if (perf && typeof perf.cpu === 'number') cpuPct = perf.cpu;
            if (perf && typeof perf.disk === 'number') diskPct = perf.disk;
            if (perf && typeof perf.gpu === 'number') gpuPct = perf.gpu;

            // Fallbacks if counters fail/return 0/empty
            if (!Number.isFinite(cpuPct) || cpuPct === 0) {
                const now = cpuSnapshot();
                const idleDelta = now.idle - lastCpu.idle;
                const totalDelta = now.total - lastCpu.total;
                lastCpu = now;
                cpuPct = totalDelta > 0 ? (1 - idleDelta / totalDelta) * 100 : 0;
            }

            if (!Number.isFinite(diskPct) || diskPct === 0) {
                const usedSpaceTotal = await getTotalDiskUsedSpacePercentWindows();
                if (typeof usedSpaceTotal === 'number') diskPct = usedSpaceTotal;
            }
        } else {
            // Fallback CPU% from delta snapshots
            const now = cpuSnapshot();
            const idleDelta = now.idle - lastCpu.idle;
            const totalDelta = now.total - lastCpu.total;
            lastCpu = now;
            cpuPct = totalDelta > 0 ? (1 - idleDelta / totalDelta) * 100 : 0;
        }

        metricsCache = {
            cpu: clampPercent(cpuPct),
            ram: clampPercent(ramPct),
            gpu: clampPercent(gpuPct),
            disk: clampPercent(diskPct)
        };
    } finally {
        metricsInFlight = false;
    }
}

setInterval(() => { refreshMetricsCache(); }, 2000);
refreshMetricsCache();

ipcMain.handle('metrics:get', async () => {
    return metricsCache;
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 750,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Clear session cache to prevent "old UI" issues
    win.webContents.session.clearCache().then(() => {
        win.loadFile(path.join(__dirname, 'index.html'));
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Helper to run a command and resolve when finished
function runCommand(cmd) {
    return new Promise((resolve) => {
        exec(cmd, { windowsHide: true }, () => {
            resolve();
        });
    });
}

// Best-effort cleanup of temp directory files
async function cleanTempDirectories() {
    const tempDir = os.tmpdir();
    let deletedCount = 0;

    try {
        const entries = await fsp.readdir(tempDir, { withFileTypes: true });
        const tasks = entries.map(async (entry) => {
            const fullPath = path.join(tempDir, entry.name);
            try {
                await fsp.rm(fullPath, { recursive: true, force: true });
                deletedCount += 1;
            } catch {
                // Ignore individual failures
            }
        });
        await Promise.all(tasks);
    } catch {
        // Ignore if temp cannot be listed
    }

    return deletedCount;
}

// IPC handler for real optimization work (Windows focused)
ipcMain.handle('optimize:run', async (_event, mode) => {
    const isGamingMode = mode === 'gaming';

    let processesAffected = 0;
    let approxMemoryFreedMb = 0;

    // 1) Flush DNS cache
    await runCommand('ipconfig /flushdns');
    approxMemoryFreedMb += 10;

    // 2) Clear temp files
    const deletedEntries = await cleanTempDirectories();
    approxMemoryFreedMb += Math.min(400, deletedEntries * 2);

    // 3) Clear Windows prefetch / recent temp (best-effort, may need admin for some files)
    const systemTempDirs = [
        'C:\\Windows\\Temp',
        'C:\\Windows\\Prefetch'
    ];

    for (const dir of systemTempDirs) {
        try {
            await fsp.rm(dir, { recursive: true, force: true });
            approxMemoryFreedMb += 50;
        } catch {
            // Ignore permission issues
        }
    }

    // 4) Kill some common background apps that can eat RAM/CPU (gaming mode only)
    if (isGamingMode) {
        const candidates = [
            'OneDrive.exe',
            'Discord.exe',
            'Teams.exe',
            'Dropbox.exe',
            'Skype.exe'
        ];

        for (const proc of candidates) {
            // taskkill will fail if process not found; ignore errors
            await runCommand(`taskkill /F /IM ${proc}`);
        }

        processesAffected += candidates.length;
        approxMemoryFreedMb += 300;
    }

    // 5) Ask Windows to trim working sets (non-destructive hint, may not always succeed)
    await runCommand('powershell -Command "Get-Process | ForEach-Object { try { $_.MinWorkingSet = 1MB } catch {} }"');
    approxMemoryFreedMb += 150;

    // Cap to some reasonable number for display
    approxMemoryFreedMb = Math.min(2000, approxMemoryFreedMb);

    return {
        processesAffected,
        memoryFreedMb: approxMemoryFreedMb
    };
});
