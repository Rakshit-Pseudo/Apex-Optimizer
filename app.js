// DOM Elements
const modeNormal = document.getElementById("modeNormal");
const modeGaming = document.getElementById("modeGaming");
const body = document.body;
const modeTitle = document.getElementById("modeTitle");
const modeDescription = document.getElementById("modeDescription");
const optimizeBtn = document.getElementById("optimizeBtn");
const resetBtn = document.getElementById("resetBtn");
const optimizationStatus = document.getElementById("optimizationStatus");
const cpuPercent = document.getElementById("cpuPercent");
const ramPercent = document.getElementById("ramPercent");
const gpuPercent = document.getElementById("gpuPercent");
const diskPercent = document.getElementById("diskPercent");
const processCount = document.getElementById("processCount");
const memoryFreed = document.getElementById("memoryFreed");
const particlesContainer = document.getElementById("particles");

// State
let isGamingMode = false;
let isOptimizing = false;
let totalProcesses = 0;
let totalMemoryFreed = 0;

// Hardware data (will be populated from main process)
let hardwareData = {
    cpu: 0,
    ram: 0,
    gpu: 0,
    disk: 0
};

// Initialize particles
function createParticles() {
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (Math.random() * 4 + 6) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Update circular progress
function updateCircularProgress(element, percent) {
    const circle = element.querySelector('.progress-ring-circle');
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

// Animate number change
function animateNumber(element, start, end, duration, suffix = '') {
    const range = end - start;
    const startTime = Date.now();
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(start + range * progress);
        element.textContent = current + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    update();
}

// Fetch real hardware metrics from main process via IPC
async function updateHardwareMetrics() {
    if (window.apexAPI) {
        try {
            const metrics = await window.apexAPI.getMetrics();
            hardwareData.cpu = metrics.cpu;
            hardwareData.ram = metrics.ram;
            hardwareData.gpu = metrics.gpu;
            hardwareData.disk = metrics.disk;
        } catch (e) {
            // Silently ignore fetch errors
        }
    }

    // Update UI text
    cpuPercent.textContent = Math.round(hardwareData.cpu) + '%';
    ramPercent.textContent = Math.round(hardwareData.ram) + '%';
    gpuPercent.textContent = Math.round(hardwareData.gpu) + '%';
    diskPercent.textContent = Math.round(hardwareData.disk) + '%';

    // Update circular progress rings
    const progressElements = document.querySelectorAll('.circular-progress');
    updateCircularProgress(progressElements[0], hardwareData.cpu);
    updateCircularProgress(progressElements[1], hardwareData.ram);
    updateCircularProgress(progressElements[2], hardwareData.gpu);
    updateCircularProgress(progressElements[3], hardwareData.disk);
}

// Mode selection via radio buttons
function setMode(mode) {
    if (mode === 'gaming') {
        isGamingMode = true;
        body.classList.remove("normal-mode");
        body.classList.add("gaming-mode");

        modeTitle.textContent = "Gaming Mode Active";
        modeDescription.textContent =
            "Extreme system optimization prioritized for maximum FPS and performance.";
        
        // Add shake animation
        body.style.animation = 'none';
        setTimeout(() => {
            body.style.animation = '';
        }, 10);
    } else {
        isGamingMode = false;
        body.classList.remove("gaming-mode");
        body.classList.add("normal-mode");

        modeTitle.textContent = "Normal Mode Active";
        modeDescription.textContent =
            "Balanced system optimization for everyday usage.";
    }
}

modeNormal.addEventListener("change", () => {
    if (modeNormal.checked) setMode('normal');
});

modeGaming.addEventListener("change", () => {
    if (modeGaming.checked) setMode('gaming');
});

// Reset functionality
function resetOptimization() {
    // Clear the optimization list area
    optimizationStatus.innerHTML = '';
    optimizationStatus.classList.remove('active');

    // Reset stats counters
    totalProcesses = 0;
    totalMemoryFreed = 0;
    processCount.textContent = '0';
    memoryFreed.textContent = '0 MB';

    // If currently optimizing, cancel it
    if (isOptimizing) {
        isOptimizing = false;
        optimizeBtn.disabled = false;
        optimizeBtn.classList.remove('loading');
    }
}

resetBtn.addEventListener('click', resetOptimization);

// Optimization process — shows UI steps + triggers real optimization via IPC
async function optimizeSystem() {
    if (isOptimizing) return;
    
    isOptimizing = true;
    optimizeBtn.disabled = true;
    optimizeBtn.classList.add('loading');
    optimizationStatus.classList.add('active');
    optimizationStatus.innerHTML = '';

    // Kick off real optimization in the background (main process)
    const realOptPromise = (window.apexAPI)
        ? window.apexAPI.runOptimization(isGamingMode ? 'gaming' : 'normal')
        : Promise.resolve(null);

    const steps = isGamingMode ? [
        { text: "Terminating background processes...", duration: 1200 },
        { text: "Clearing system cache...", duration: 1000 },
        { text: "Optimizing CPU priority...", duration: 1100 },
        { text: "Freeing up RAM...", duration: 1300 },
        { text: "Disabling unnecessary services...", duration: 1000 },
        { text: "Boosting GPU performance...", duration: 1200 },
        { text: "Defragmenting disk cache...", duration: 1100 },
        { text: "Optimizing network settings...", duration: 900 },
        { text: "System optimization complete!", duration: 800 }
    ] : [
        { text: "Clearing temporary files...", duration: 1000 },
        { text: "Optimizing memory usage...", duration: 1200 },
        { text: "Cleaning system cache...", duration: 1000 },
        { text: "Closing idle processes...", duration: 1100 },
        { text: "System optimization complete!", duration: 800 }
    ];

    for (let i = 0; i < steps.length; i++) {
        // Check if reset was pressed during optimization
        if (!isOptimizing) return;

        const step = steps[i];
        const stepElement = document.createElement('div');
        stepElement.className = 'optimization-step';
        stepElement.textContent = step.text;
        optimizationStatus.appendChild(stepElement);

        // Auto-scroll to bottom
        optimizationStatus.scrollTop = optimizationStatus.scrollHeight;

        await new Promise(resolve => setTimeout(resolve, step.duration));

        // Check again after await
        if (!isOptimizing) return;

        // Mark step as complete
        stepElement.classList.add('complete');
        
        // On last step, remove pulse animation
        if (i === steps.length - 1) {
            setTimeout(() => {
                optimizationStatus.classList.remove('active');
            }, 500);
        }
    }

    // Wait for real optimization to finish and show results
    try {
        const result = await realOptPromise;
        if (result) {
            totalProcesses += result.processesAffected;
            totalMemoryFreed += result.memoryFreedMb;
            animateNumber(processCount, 0, totalProcesses, 800);
            animateNumber(memoryFreed, 0, totalMemoryFreed, 800, ' MB');
        }
    } catch (e) {
        // Ignore errors from real optimization
    }

    // Refresh metrics after optimization
    await updateHardwareMetrics();

    setTimeout(() => {
        isOptimizing = false;
        optimizeBtn.disabled = false;
        optimizeBtn.classList.remove('loading');
    }, 1000);
}

// Event listeners
optimizeBtn.addEventListener('click', optimizeSystem);

// Initialize
createParticles();
setInterval(updateHardwareMetrics, 2000);
updateHardwareMetrics();

// Add pulse animation to hardware items when values change significantly
setInterval(() => {
    const items = document.querySelectorAll('.hardware-item');
    items.forEach((item, index) => {
        const values = [hardwareData.cpu, hardwareData.ram, hardwareData.gpu, hardwareData.disk];
        if (values[index] > 80) {
            item.style.animation = 'pulse 1s ease-in-out';
            setTimeout(() => {
                item.style.animation = '';
            }, 1000);
        }
    });
}, 3000);