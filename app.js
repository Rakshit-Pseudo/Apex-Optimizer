// DOM Elements
const toggle = document.getElementById("modeToggle");
const body = document.body;
const modeTitle = document.getElementById("modeTitle");
const modeDescription = document.getElementById("modeDescription");
const optimizeBtn = document.getElementById("optimizeBtn");
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

// Hardware monitoring simulation
let hardwareData = {
    cpu: 45,
    ram: 62,
    gpu: 38,
    disk: 55
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

// Simulate hardware monitoring
function updateHardwareMetrics() {
    // Simulate realistic fluctuations
    hardwareData.cpu = Math.max(10, Math.min(95, hardwareData.cpu + (Math.random() - 0.5) * 8));
    hardwareData.ram = Math.max(20, Math.min(90, hardwareData.ram + (Math.random() - 0.5) * 6));
    hardwareData.gpu = Math.max(5, Math.min(85, hardwareData.gpu + (Math.random() - 0.5) * 10));
    hardwareData.disk = Math.max(15, Math.min(80, hardwareData.disk + (Math.random() - 0.5) * 4));

    // Update UI
    cpuPercent.textContent = Math.round(hardwareData.cpu) + '%';
    ramPercent.textContent = Math.round(hardwareData.ram) + '%';
    gpuPercent.textContent = Math.round(hardwareData.gpu) + '%';
    diskPercent.textContent = Math.round(hardwareData.disk) + '%';

    // Update circular progress
    const progressElements = document.querySelectorAll('.circular-progress');
    updateCircularProgress(progressElements[0], hardwareData.cpu);
    updateCircularProgress(progressElements[1], hardwareData.ram);
    updateCircularProgress(progressElements[2], hardwareData.gpu);
    updateCircularProgress(progressElements[3], hardwareData.disk);
}

// Mode toggle with animation
toggle.addEventListener("change", () => {
    if (toggle.checked) {
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
});

// Optimization process
async function optimizeSystem() {
    if (isOptimizing) return;
    
    isOptimizing = true;
    optimizeBtn.disabled = true;
    optimizeBtn.classList.add('loading');
    optimizationStatus.classList.add('active');
    optimizationStatus.innerHTML = '';

    const steps = isGamingMode ? [
        { text: "Terminating background processes...", duration: 1200, processes: 15, memory: 450 },
        { text: "Clearing system cache...", duration: 1000, processes: 8, memory: 320 },
        { text: "Optimizing CPU priority...", duration: 1100, processes: 12, memory: 0 },
        { text: "Freeing up RAM...", duration: 1300, processes: 20, memory: 680 },
        { text: "Disabling unnecessary services...", duration: 1000, processes: 18, memory: 520 },
        { text: "Boosting GPU performance...", duration: 1200, processes: 10, memory: 280 },
        { text: "Defragmenting disk cache...", duration: 1100, processes: 6, memory: 150 },
        { text: "Optimizing network settings...", duration: 900, processes: 5, memory: 90 },
        { text: "System optimization complete!", duration: 800, processes: 0, memory: 0 }
    ] : [
        { text: "Clearing temporary files...", duration: 1000, processes: 8, memory: 220 },
        { text: "Optimizing memory usage...", duration: 1200, processes: 12, memory: 380 },
        { text: "Cleaning system cache...", duration: 1000, processes: 10, memory: 290 },
        { text: "Closing idle processes...", duration: 1100, processes: 15, memory: 450 },
        { text: "System optimization complete!", duration: 800, processes: 0, memory: 0 }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepElement = document.createElement('div');
        stepElement.className = 'optimization-step';
        stepElement.textContent = step.text;
        optimizationStatus.appendChild(stepElement);

        // Reduce hardware usage during optimization
        if (i < steps.length - 1) {
            hardwareData.cpu = Math.max(15, hardwareData.cpu - (isGamingMode ? 8 : 5));
            hardwareData.ram = Math.max(20, hardwareData.ram - (isGamingMode ? 10 : 6));
            hardwareData.gpu = Math.max(10, hardwareData.gpu - (isGamingMode ? 7 : 4));
            hardwareData.disk = Math.max(15, hardwareData.disk - (isGamingMode ? 6 : 4));
            updateHardwareMetrics();
        }

        // Update stats
        if (step.processes > 0) {
            totalProcesses += step.processes;
            totalMemoryFreed += step.memory;
            
            const startProc = totalProcesses - step.processes;
            const startMem = totalMemoryFreed - step.memory;
            
            animateNumber(processCount, startProc, totalProcesses, step.duration);
            animateNumber(memoryFreed, startMem, totalMemoryFreed, step.duration, ' MB');
        }

        await new Promise(resolve => setTimeout(resolve, step.duration));

        // Mark step as complete
        stepElement.classList.add('complete');
        
        // Remove loading spinner from last completed step
        if (i === steps.length - 1) {
            setTimeout(() => {
                optimizationStatus.classList.remove('active');
            }, 500);
        }
    }

    // Final optimization - reduce hardware usage significantly
    hardwareData.cpu = Math.max(12, hardwareData.cpu - (isGamingMode ? 15 : 10));
    hardwareData.ram = Math.max(18, hardwareData.ram - (isGamingMode ? 20 : 12));
    hardwareData.gpu = Math.max(8, hardwareData.gpu - (isGamingMode ? 12 : 8));
    hardwareData.disk = Math.max(12, hardwareData.disk - (isGamingMode ? 10 : 8));
    updateHardwareMetrics();

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