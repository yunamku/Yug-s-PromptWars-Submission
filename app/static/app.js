// Feel FIFA Nexus Dashboard Controller - Vanilla JS (KITMAN Apple Minimalist UI)

// Global Variables
let telemetryData = null;
let currentView = 'core';
let radarAngle = 0;
let mousePos = { x: -100, y: -100 };
let lastAlertFetch = 0;

// Zone Coordinates for 400x400 canvas radar map (Scaled to fit larger radar size)
const zoneCoordinates = {
    "Gate A": { x: 200, y: 86, label: "GATE A (MAIN)" },
    "Gate B": { x: 297, y: 138, label: "GATE B (NORTH)" },
    "Gate C": { x: 103, y: 138, label: "GATE C (VIP)" },
    "Gate D": { x: 200, y: 314, label: "GATE D (SOUTH)" },
    "Section 102 (F&B)": { x: 262, y: 200, label: "SEC 102 (TACOS)" },
    "Section 204 (F&B)": { x: 138, y: 200, label: "SEC 204 (BAR)" },
    "Metro Stadium East": { x: 332, y: 262, label: "METRO EAST" },
    "Metro Stadium West": { x: 68, y: 262, label: "METRO WEST" }
};

// Colors for status levels - aligned with Apple's premium system
const statusColors = {
    critical: '#1D1D1F',     // Dark warning to stand out on yellow card
    heavy: '#0A84FF',        // Electric Blue
    normal: '#34C759',       // Apple Green
    clear: '#8E8E93',        // Apple Gray
    grid: 'rgba(0, 0, 0, 0.15)', // Darker translucent rings for yellow radar theme
    sweep: 'rgba(10, 132, 255, 0.12)'  // Electric Blue sweep
};

// Flag emoji mappings
const flagIcons = {
    "br": "🇧🇷",
    "hr": "🇭🇷",
    "de": "🇩🇪",
    "es": "🇪🇸",
    "mx": "🇲🇽",
    "ca": "🇨🇦",
    "us": "🇺🇸",
    "ar": "🇦🇷",
    "fr": "🇫🇷",
    "jp": "🇯🇵"
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initRadar();
    setupEventListeners();
    setupNavigation();
    
    // Initial fetch
    fetchTelemetry();
    fetchAlerts();
    
    // Start polling intervals
    setInterval(fetchTelemetry, 3000);   // Telemetry updates every 3s
    setInterval(fetchAlerts, 15000);     // KITMAN suggestions updates every 15s
});

// Setup Clock
function initClock() {
    const clockEl = document.getElementById('clock-display');
    const updateTime = () => {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        clockEl.textContent = `${hrs}:${mins}:${secs}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// Sidebar View Navigation
function setupNavigation() {
    const views = ['core', 'roster', 'transit', 'accessibility', 'wayfinding', 'sustainability', 'matches', 'chat'];
    
    views.forEach(view => {
        const btn = document.getElementById(`menu-${view}`);
        if (!btn) return;
        
        btn.addEventListener('click', () => {
            currentView = view;
            
            // Toggle active styles on buttons using Apple standard gray/blue scheme
            views.forEach(v => {
                const b = document.getElementById(`menu-${v}`);
                b.className = "menu-tab-btn w-full flex items-center space-x-3 px-4 py-3.5 rounded-lg text-left text-slate-500 hover:text-[#0A84FF] hover:bg-[#0A84FF]/5 transition-all duration-200";
            });
            btn.className = "menu-tab-btn active-tab w-full flex items-center space-x-3 px-4 py-3.5 rounded-lg text-left text-[#0A84FF] bg-[#0A84FF]/10 transition-all duration-200";
            
            // Hide all view sheets
            views.forEach(v => {
                const sheet = document.getElementById(`view-${v}`);
                if (sheet) sheet.classList.add('hidden');
            });
            // Show target view sheet
            const activeSheet = document.getElementById(`view-${view}`);
            if (activeSheet) activeSheet.classList.remove('hidden');
            
            // Update Title Header label
            const headerLabel = document.getElementById('view-title-label');
            headerLabel.textContent = `${view.replace('-', ' ').toUpperCase()}`;
            
            appendLog(`[SYSTEM] Navigated view workspace segment to: ${view.toUpperCase()}`);
            
            if (view === 'chat') {
                setTimeout(() => {
                    const chatMsgs = document.getElementById('chat-messages');
                    chatMsgs.scrollTop = chatMsgs.scrollHeight;
                }, 50);
            }
        });
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Tabs Toggle shortcuts - adding null checks to prevent crashes!
    const tabAlerts = document.getElementById('tab-alerts');
    const tabChat = document.getElementById('tab-chat');

    if (tabAlerts) {
        tabAlerts.addEventListener('click', () => {
            const menuCore = document.getElementById('menu-core');
            if (menuCore) menuCore.click();
        });
    }

    if (tabChat) {
        tabChat.addEventListener('click', () => {
            const menuChat = document.getElementById('menu-chat');
            if (menuChat) menuChat.click();
        });
    }

    // Manual Poll Trigger
    const simBtn = document.getElementById('sim-control-btn');
    if (simBtn) {
        simBtn.addEventListener('click', () => {
            appendLog("[SYSTEM] Syncing sensor networks...");
            fetchTelemetry();
        });
    }

    // Refresh AI Alerts Trigger
    const refreshBtn = document.getElementById('refresh-alerts-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            appendLog("[KITMAN] Running resource re-allocation models...");
            fetchAlerts(true);
        });
    }

    // Chat Submission
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitChatMessage();
        });
    }

    // Quick Command Chips
    document.querySelectorAll('.quick-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            let queryText = btn.textContent.trim();
            if (queryText.includes("Busiest Gates")) {
                submitChatMessage("Which entrance gates have the highest queues and congestion?");
            } else if (queryText.includes("Transit status")) {
                submitChatMessage("Are there any delayed or crowded mass transit lines serving the stadium?");
            } else if (queryText.includes("Elevator status")) {
                submitChatMessage("Provide accessibility detour routing advice and lift statuses.");
            } else if (queryText.includes("Smart Bins")) {
                submitChatMessage("Which smart waste bins are full and require trash compactor clearing?");
            } else if (queryText.includes("Match Center")) {
                submitChatMessage("What is the current match schedule score board and minutes?");
            }
        });
    });

    // Modals submissions
    const incForm = document.getElementById('incident-form');
    if (incForm) {
        incForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitIncidentForm();
        });
    }

    const shiftForm = document.getElementById('shift-form');
    if (shiftForm) {
        shiftForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitShiftForm();
        });
    }
}

// Fetch Telemetry Data
async function fetchTelemetry() {
    const startTime = performance.now();
    try {
        const response = await fetch('/api/telemetry');
        if (!response.ok) throw new Error("Telemetry response failed");
        
        telemetryData = await response.json();
        
        // Calculate latency
        const latency = Math.round(performance.now() - startTime);
        const latVal = document.getElementById('latency-val');
        if (latVal) latVal.textContent = `LAG: ${latency} ms`;
        
        updateDashboardMetrics();
        updateZonesTable();
        updateTerminalLogs();
        populateModalDropdowns();
        
        // Render New Expanded Views
        renderTransitView();
        renderAccessibilityView();
        renderSustainabilityView();
        renderMatchCenterView();
        
    } catch (err) {
        console.error("Error fetching telemetry:", err);
        const latVal = document.getElementById('latency-val');
        if (latVal) latVal.textContent = "LAG: OFFLINE";
    }
}

// Update Top Dashboard Metric Cards
function updateDashboardMetrics() {
    if (!telemetryData) return;
    
    // Attendance
    const att = telemetryData.attendance;
    const cap = telemetryData.capacity;
    const attCount = document.getElementById('attendance-count');
    if (attCount) attCount.textContent = att.toLocaleString();
    
    const attBar = document.getElementById('attendance-bar');
    if (attBar) {
        const pct = (att / cap) * 100;
        attBar.style.width = `${pct}%`;
    }
    
    // Active Incidents
    const incCount = telemetryData.incidents.length;
    const incCountEl = document.getElementById('incidents-count');
    const incStatus = document.getElementById('incidents-status-lbl');
    const incDesc = document.getElementById('incidents-latest-desc');
    const incCard = document.getElementById('incidents-card');
    
    if (incCount > 0) {
        if (incCountEl) incCountEl.className = "px-2 py-0.5 bg-[#1D1D1F] text-[#FF3B30] border border-black rounded mr-2 font-mono font-bold";
        if (incStatus) {
            incStatus.className = "text-xs font-extrabold text-slate-950 tracking-wide";
            incStatus.textContent = `${incCount} ACTIVE INCIDENT${incCount > 1 ? 'S' : ''}`;
        }
        if (incDesc) {
            incDesc.className = "text-[11px] text-slate-955 mt-2 truncate font-extrabold";
            incDesc.textContent = telemetryData.incidents[0].description;
        }
        if (incCard) incCard.className = "incident-alerts-card bg-[#FF3B30] border-2 border-slate-950 rounded-2xl p-6 relative overflow-hidden transition-all duration-300 shadow-md";
    } else {
        if (incCountEl) incCountEl.className = "px-2 py-0.5 bg-[#1D1D1F] text-slate-100 border border-black rounded mr-2 font-mono";
        if (incStatus) {
            incStatus.className = "text-xs font-bold text-slate-950 uppercase tracking-wider";
            incStatus.textContent = "ALL NOMINAL";
        }
        if (incDesc) {
            incDesc.className = "text-[11px] text-slate-950 mt-2 truncate font-bold";
            incDesc.textContent = "No active events reported.";
        }
        if (incCard) incCard.className = "incident-alerts-card bg-[#FF3B30] border border-[#D32F2F] rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:shadow-md shadow-xs";
    }
    
    // Queue time and trends
    let sumQueue = 0;
    let countZones = 0;
    let highestQueueZone = null;
    let maxQueue = 0;
    
    for (let name in telemetryData.zones) {
        let q = telemetryData.zones[name].queue_time;
        sumQueue += q;
        countZones++;
        if (q > maxQueue) {
            maxQueue = q;
            highestQueueZone = name;
        }
    }
    
    const avgQueue = Math.round(sumQueue / countZones);
    const avgQEl = document.getElementById('avg-queue-time');
    if (avgQEl) avgQEl.textContent = avgQueue;
    
    const trendIcon = document.getElementById('queue-trend-icon');
    const trendDesc = document.getElementById('queue-trend-desc');
    if (trendIcon && trendDesc) {
        if (maxQueue > 25) {
            trendIcon.className = "fa-solid fa-circle-exclamation text-[#B91C1C] mr-1.5 animate-pulse";
            trendDesc.className = "text-[#B91C1C] font-bold";
            trendDesc.textContent = `Queue jam: ${highestQueueZone} (${maxQueue}m)`;
        } else {
            trendIcon.className = "fa-solid fa-check text-emerald-800 mr-1.5";
            trendDesc.className = "text-slate-900 font-semibold";
            trendDesc.textContent = "Nominal flows across gates";
        }
    }
    
    // Total staff count
    let totalStaff = 0;
    for (let name in telemetryData.zones) {
        totalStaff += telemetryData.zones[name].staff_count;
    }
    const staffEl = document.getElementById('total-staff-count');
    if (staffEl) staffEl.textContent = totalStaff;
}

// Update Detailed Zone Table
function updateZonesTable() {
    if (!telemetryData) return;
    
    const tbody = document.getElementById('zones-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    for (let name in telemetryData.zones) {
        const zone = telemetryData.zones[name];
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-100 transition-colors";
        
        let badgeClass = "status-badge-clear";
        let textClass = "text-slate-800";
        
        if (zone.status === 'Critical' || zone.status === 'Saturated') {
            badgeClass = "status-badge-critical";
            textClass = "text-[#B91C1C] font-bold";
        } else if (zone.status === 'Heavy' || zone.status === 'Busy') {
            badgeClass = "status-badge-heavy";
            textClass = "text-blue-700 font-bold";
        } else if (zone.status === 'Moderate' || zone.status === 'Normal') {
            badgeClass = "status-badge-normal";
            textClass = "text-emerald-850 font-bold";
        }
        
        let typeIcon = '<i class="fa-solid fa-door-open text-slate-800 mr-2"></i>';
        if (zone.type === 'food') {
            typeIcon = '<i class="fa-solid fa-utensils text-slate-800 mr-2"></i>';
        } else if (zone.type === 'metro') {
            typeIcon = '<i class="fa-solid fa-train text-slate-800 mr-2"></i>';
        }
        
        let incIcon = '';
        for (let inc of telemetryData.incidents) {
            if (name.includes(inc.zone) || inc.zone.includes(name)) {
                incIcon = `<span class="ml-1.5 text-red-500" title="${inc.description}"><i class="fa-solid fa-circle-exclamation animate-pulse"></i></span>`;
                break;
            }
        }
        
        tr.innerHTML = `
            <td class="py-4 px-6 font-semibold text-slate-800 flex items-center">
                ${typeIcon}
                <span>${zone.name}</span>
                ${incIcon}
            </td>
            <td class="py-4 px-2 text-slate-450 uppercase font-bold text-[10px] tracking-wider">${zone.type}</td>
            <td class="py-4 px-2 text-right ${textClass}">${zone.congestion}%</td>
            <td class="py-4 px-2 text-right font-semibold text-slate-800">${zone.queue_time}m</td>
            <td class="py-4 px-2 text-center">
                <div class="flex items-center justify-center space-x-1">
                    <button onclick="inlineAdjustStaff('${name}', -1)" class="w-6 h-6 border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-md flex items-center justify-center text-slate-700 transition-all font-semibold">-</button>
                    <span class="w-6 font-bold text-slate-800 text-center">${zone.staff_count}</span>
                    <button onclick="inlineAdjustStaff('${name}', 1)" class="w-6 h-6 border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-md flex items-center justify-center text-slate-700 transition-all font-semibold">+</button>
                </div>
            </td>
            <td class="py-4 px-2 text-center">
                <span class="px-2.5 py-0.5 text-[9px] rounded font-bold uppercase tracking-wider ${badgeClass}">${zone.status}</span>
            </td>
            <td class="py-4 px-6 text-center">
                <button onclick="openQuickShift('${name}')" class="font-semibold text-[10px] text-blue-600 hover:text-white border border-blue-200 hover:bg-blue-600 px-3 py-1 rounded-md transition-all">
                    SHIFT OUT
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// Render Transit Hub view
function renderTransitView() {
    if (!telemetryData) return;
    
    const tbody = document.getElementById('transit-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    for (let name in telemetryData.transit_lines) {
        const line = telemetryData.transit_lines[name];
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-100 transition-colors";
        
        let loadClass = "text-blue-600 font-bold";
        let statusBadge = "status-badge-normal";
        if (line.load > 85) {
            loadClass = "text-[#B91C1C] font-bold";
            statusBadge = "status-badge-critical animate-pulse";
        } else if (line.load > 65) {
            loadClass = "text-blue-700 font-bold";
            statusBadge = "status-badge-heavy";
        }
        
        let delayHtml = `<span class="text-slate-900 font-medium">On Time</span>`;
        if (line.delay > 0) {
            delayHtml = `<span class="text-[#B91C1C] font-bold">${line.delay}m delay</span>`;
        }
        
        tr.innerHTML = `
            <td class="py-4 px-6 font-bold text-slate-955">${name.toUpperCase()}</td>
            <td class="py-4 px-2 text-center font-bold text-slate-900">${line.interval} mins</td>
            <td class="py-4 px-2 text-center">${delayHtml}</td>
            <td class="py-4 px-2 text-right ${loadClass}">${line.load}%</td>
            <td class="py-4 px-5 text-center">
                <span class="px-2.5 py-0.5 text-[9px] rounded font-bold uppercase tracking-wider ${statusBadge}">${line.status}</span>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// Render Accessibility view
function renderAccessibilityView() {
    if (!telemetryData) return;
    
    for (let name in telemetryData.lifts) {
        const status = telemetryData.lifts[name];
        let elementId = "";
        if (name.includes("Elevator 1")) elementId = "lift-status-1";
        else if (name.includes("Elevator 2")) elementId = "lift-status-2";
        else if (name.includes("Elevator 3")) elementId = "lift-status-3";
        else if (name.includes("Elevator 4")) elementId = "lift-status-4";
        
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = status;
            if (status.toLowerCase() === 'nominal') {
                el.className = "text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded uppercase";
            } else {
                el.className = "text-xs font-semibold px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded uppercase animate-pulse";
            }
        }
    }
}

// Render Sustainability view
function renderSustainabilityView() {
    if (!telemetryData) return;
    
    const grid = document.getElementById('sustainability-bins-grid');
    if (grid) {
        grid.innerHTML = '';
        for (let name in telemetryData.smart_bins) {
            const val = telemetryData.smart_bins[name];
            const card = document.createElement('div');
            card.className = "glass-card rounded-2xl p-5 flex flex-col justify-between shadow-xs";
            
            let colorGrad = "from-blue-500 to-blue-600";
            let textClass = "text-blue-700 font-bold";
            if (val > 90) {
                colorGrad = "from-[#B91C1C] to-red-700";
                textClass = "text-[#B91C1C] font-extrabold animate-pulse";
            } else if (val > 75) {
                colorGrad = "from-blue-600 to-blue-700";
                textClass = "text-blue-700 font-bold";
            }
            
            card.innerHTML = `
                <span class="text-slate-950 font-bold text-[9px] uppercase tracking-wider">${name}</span>
                <div class="flex items-baseline justify-between mt-2">
                    <span class="text-lg font-bold text-slate-950">${val}%</span>
                    <span class="text-[8px] font-bold ${textClass}">FULL</span>
                </div>
                <div class="w-full bg-black/10 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div class="bg-gradient-to-r ${colorGrad} h-full" style="width: ${val}%"></div>
                </div>
            `;
            grid.appendChild(card);
        }
    }
    
    const tbody = document.getElementById('sustainability-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    for (let name in telemetryData.smart_bins) {
        const val = telemetryData.smart_bins[name];
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-100 transition-colors";
        
        let textClass = "text-blue-600 font-bold";
        let statusBadge = "status-badge-normal";
        let statusWord = "Nominal";
        
        if (val > 90) {
            textClass = "text-[#B91C1C] font-bold";
            statusBadge = "status-badge-critical animate-pulse";
            statusWord = "OVERFLOW";
        } else if (val > 75) {
            textClass = "text-blue-700 font-bold";
            statusBadge = "status-badge-heavy";
            statusWord = "FILL HIGH";
        }
        
        tr.innerHTML = `
            <td class="py-4 px-6 font-bold text-slate-955 uppercase">${name}</td>
            <td class="py-4 px-2 text-right ${textClass}">${val}%</td>
            <td class="py-4 px-2 text-center">
                <span class="px-2.5 py-0.5 text-[8px] rounded font-bold uppercase tracking-wider ${statusBadge}">${statusWord}</span>
            </td>
            <td class="py-4 px-6 text-center">
                <button onclick="dispatchCleanBin('${name}')" class="font-bold text-[10px] text-white bg-[#0A84FF] hover:bg-blue-700 border border-[#0A84FF]/20 px-3 py-1 rounded-md transition-all">
                    CLEAR
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// Render Match Center view
function renderMatchCenterView() {
    if (!telemetryData) return;
    
    const container = document.getElementById('match-fixtures-container');
    if (!container) return;
    container.innerHTML = '';
    
    const sortedMatches = [...telemetryData.matches].sort((a, b) => {
        const order = { "Live": 1, "Upcoming": 2, "Finished": 3 };
        return order[a.status] - order[b.status];
    });
    
    sortedMatches.forEach(match => {
        const card = document.createElement('div');
        card.className = "fixture-card rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs hover:shadow-md transition-all duration-200";
        
        let statusBadge = "text-slate-955 bg-black/10 border border-slate-900/20";
        let scoreColor = "text-slate-955 font-bold";
        let liveIndicator = '';
        
        if (match.status === 'Live') {
            statusBadge = "text-white bg-[#0A84FF] border border-[#0A84FF]/20 font-bold";
            scoreColor = "text-blue-700 font-extrabold";
            liveIndicator = `<span class="w-2.5 h-2.5 bg-red-650 rounded-full animate-ping mr-2"></span>`;
            
            const headerMatch = document.getElementById('header-match-phase');
            if (headerMatch) {
                headerMatch.textContent = `${match.team1.toUpperCase()} ${match.score1}-${match.score2} ${match.team2.toUpperCase()} (${match.minute}')`;
            }
        } else if (match.status === 'Finished') {
            statusBadge = "text-slate-800 bg-slate-100 border border-slate-200";
        } else {
            statusBadge = "text-white bg-blue-600 border border-blue-700 font-bold";
        }
        
        const f1 = flagIcons[match.team1_flag] || "";
        const f2 = flagIcons[match.team2_flag] || "";
        
        card.innerHTML = `
            <div class="flex items-center space-x-6">
                <div class="flex items-center space-x-3">
                    <span class="text-3xl">${f1}</span>
                    <span class="font-bold text-sm text-slate-955 uppercase tracking-wide w-24 text-right">${match.team1}</span>
                </div>
                <div class="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-lg font-bold font-mono tracking-widest ${scoreColor}">
                    ${match.score1} : ${match.score2}
                </div>
                <div class="flex items-center space-x-3">
                    <span class="font-bold text-sm text-slate-955 uppercase tracking-wide w-24 text-left">${match.team2}</span>
                    <span class="text-3xl">${f2}</span>
                </div>
            </div>

            <div class="text-center md:text-left flex flex-col justify-center max-w-sm">
                <span class="text-[9px] font-bold text-slate-950 uppercase tracking-widest">${match.group} // ${match.group === 'FINISHED' ? 'FINISHED' : match.group === 'LIVE' ? 'LIVE' : match.venue}</span>
                <p class="text-xs text-slate-900 mt-1.5 leading-relaxed font-bold italic">"${match.tactical_note}"</p>
            </div>

            <div class="flex items-center shrink-0">
                ${liveIndicator}
                <span class="px-3 py-1 text-[9px] rounded-full uppercase tracking-wider font-semibold ${statusBadge}">
                    ${match.status === 'Live' ? `${match.status} - ${match.minute}'` : match.status}
                </span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Update Console Logs
function updateTerminalLogs() {
    if (!telemetryData) return;
    const logEl = document.getElementById('terminal-log');
    if (!logEl) return;
    
    logEl.innerHTML = '';
    telemetryData.logs.forEach(log => {
        const div = document.createElement('div');
        div.className = "border-b border-slate-100 py-1.5 text-slate-800 font-medium";
        
        if (log.includes("[ALERT]") || log.includes("incident") || log.includes("Critical") || log.includes("[GOAL]")) {
            div.className = "border-b border-slate-100 py-1.5 text-[#B91C1C] font-bold";
        } else if (log.includes("[STAFF]") || log.includes("Shifted") || log.includes("Re-allocated") || log.includes("[GREEN]")) {
            div.className = "border-b border-slate-100 py-1.5 text-blue-600 font-bold";
        } else {
            div.className = "border-b border-slate-100 py-1.5 text-slate-800 font-semibold";
        }
        
        div.textContent = log;
        logEl.appendChild(div);
    });
    
    logEl.scrollTop = logEl.scrollHeight;
    
    const systemTicker = document.getElementById('system-ticker');
    if (systemTicker && telemetryData.logs.length > 0) {
        systemTicker.textContent = telemetryData.logs[telemetryData.logs.length - 1];
    }
}

// Populate Modals Dropdowns
function populateModalDropdowns() {
    if (!telemetryData) return;
    
    const sourceSelect = document.getElementById('shift-source-select');
    const targetSelect = document.getElementById('shift-target-select');
    if (!sourceSelect || !targetSelect) return;
    
    const currentSource = sourceSelect.value;
    const currentTarget = targetSelect.value;
    
    sourceSelect.innerHTML = '';
    targetSelect.innerHTML = '';
    
    for (let name in telemetryData.zones) {
        const zone = telemetryData.zones[name];
        
        const optSource = document.createElement('option');
        optSource.value = name;
        optSource.textContent = `${name.toUpperCase()} (STAFF: ${zone.staff_count})`;
        sourceSelect.appendChild(optSource);
        
        const optTarget = document.createElement('option');
        optTarget.value = name;
        optTarget.textContent = `${name.toUpperCase()} (CONG: ${zone.congestion}%)`;
        targetSelect.appendChild(optTarget);
    }
    
    if (currentSource) sourceSelect.value = currentSource;
    if (currentTarget) targetSelect.value = currentTarget;
}

// Fetch KITMAN AI Resource suggestions
async function fetchAlerts(force = false) {
    const now = Date.now();
    if (!force && (now - lastAlertFetch < 12000)) return;
    lastAlertFetch = now;
    
    const alertsContainer = document.getElementById('alerts-list');
    if (!alertsContainer) return;
    
    try {
        const response = await fetch('/api/alerts');
        if (!response.ok) throw new Error("Alerts query failed");
        
        const alerts = await response.json();
        alertsContainer.innerHTML = '';
        
        if (alerts.length === 0) {
            alertsContainer.innerHTML = `
                <div class="text-center py-10 text-slate-900 font-bold text-xs border border-[#D9A006] bg-[#F5C518] rounded-2xl p-6 shadow-xs">
                    <i class="fa-solid fa-circle-check text-emerald-800 text-lg mb-2.5 block"></i>
                    SQUAD POSITIONING NOMINAL. KITMAN SUGGESTS NO IMMEDIATE TACTICAL CHANGES.
                </div>
            `;
            return;
        }
        
        alerts.forEach(alert => {
            const card = document.createElement('div');
            
            let cardClass = "alert-card-ai";
            let badgeClass = "text-[#7C3AED] bg-[#7C3AED]/10 border border-[#7C3AED]/30 font-bold";
            
            if (alert.severity === 'High') {
                badgeClass = "text-white bg-[#1D1D1F] border border-black font-bold";
            }
            
            let actionHtml = '';
            if (alert.source_zone && alert.target_zone && alert.count > 0) {
                actionHtml = `
                    <div class="mt-4 pt-3.5 border-t border-[#7C3AED]/30 flex items-center justify-between">
                        <span class="text-[9px] text-[#7C3AED] font-bold uppercase tracking-wider">${alert.engine || 'KITMAN ANALYST'}</span>
                        <button onclick="executeAIShift('${alert.source_zone}', '${alert.target_zone}', ${alert.count})" class="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all shadow-xs">
                            Execute Shift
                        </button>
                    </div>
                `;
            } else {
                actionHtml = `
                    <div class="mt-4 pt-3.5 border-t border-[#7C3AED]/30 flex items-center justify-between text-[9px] text-[#7C3AED] font-bold uppercase tracking-wider">
                        <span>${alert.engine || 'Safety Dispatch'}</span>
                        <span class="text-[#B91C1C] font-bold uppercase">Incident Active</span>
                    </div>
                `;
            }
            
            card.className = `border p-6 rounded-2xl relative shadow-xs bg-[#F5C518] w-full break-words whitespace-normal ${cardClass}`;
            card.innerHTML = `
                <div class="flex items-start justify-between">
                    <h4 class="font-bold text-xs text-slate-955 flex items-center mr-2 uppercase tracking-wide">
                        <i class="fa-solid fa-circle-exclamation mr-2 text-[#7C3AED] text-xs"></i> ${alert.title.toUpperCase()}
                    </h4>
                    <span class="px-2.5 py-0.5 text-[8px] uppercase font-bold rounded-md shrink-0 ${badgeClass}">${alert.severity}</span>
                </div>
                <p class="text-slate-900 font-semibold text-xs mt-2.5 leading-relaxed break-words whitespace-normal w-full">${alert.description}</p>
                ${actionHtml}
            `;
            alertsContainer.appendChild(card);
        });
        
    } catch (err) {
        console.error("Error fetching AI alerts:", err);
        alertsContainer.innerHTML = `
            <div class="text-center py-6 text-red-500 font-bold text-xs border border-red-200 bg-red-50 rounded-2xl">
                <i class="fa-solid fa-triangle-exclamation text-lg mb-2 block text-red-500 animate-pulse"></i>
                COGNITIVE PIPELINE ERROR: ANALYST DISCONNECTED
            </div>
        `;
    }
}

// Execute AI suggested shift
async function executeAIShift(source, target, count) {
    appendLog(`[KITMAN] Authorizing shift re-allocation: Move ${count} staff from ${source} to ${target}...`);
    try {
        const response = await fetch('/api/shift', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_zone: source, to_zone: target, count: count })
        });
        const res = await response.json();
        
        if (!response.ok) {
            throw new Error(res.detail || "Shift command execution failed");
        }
        
        appendLog(`[SYSTEM] ${res.message}`);
        fetchTelemetry();
        setTimeout(() => fetchAlerts(true), 800);
    } catch (err) {
        appendLog(`[ERROR] Re-allocation Rejected: ${err.message}`);
    }
}

// Inline Adjust Staff Count
async function inlineAdjustStaff(zoneName, change) {
    if (change < 0) {
        openQuickShift(zoneName);
    } else {
        if (!telemetryData) return;
        let sourceName = null;
        let minCong = 100;
        
        for (let name in telemetryData.zones) {
            const z = telemetryData.zones[name];
            if (name !== zoneName && z.staff_count > 3 && z.congestion < minCong) {
                minCong = z.congestion;
                sourceName = name;
            }
        }
        
        if (!sourceName) {
            appendLog(`[ERROR] Balance aborted: No nodes have redundant staffing.`);
            return;
        }
        
        appendLog(`[SYSTEM] Pulling personnel from ${sourceName} to ${zoneName}...`);
        try {
            const response = await fetch('/api/shift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_zone: sourceName, to_zone: zoneName, count: 1 })
            });
            const res = await response.json();
            if (!response.ok) throw new Error(res.detail);
            
            appendLog(`[SYSTEM] Shift completed. Moved 1 staff member.`);
            fetchTelemetry();
            setTimeout(() => fetchAlerts(true), 800);
        } catch (err) {
            appendLog(`[ERROR] Re-allocation error: ${err.message}`);
        }
    }
}

// Chat functions
async function submitChatMessage(forcedText = "") {
    const chatInput = document.getElementById('chat-input');
    const queryText = forcedText || chatInput.value.trim();
    if (!queryText) return;
    
    if (!forcedText) chatInput.value = '';
    
    appendChatMessage("staff", queryText, "Operations Manager");
    
    const chatMessages = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'chat-typing-indicator';
    typingDiv.className = "flex items-start space-x-3 max-w-[90%]";
    typingDiv.innerHTML = `
        <div class="w-6 h-6 rounded bg-[#7C3AED] text-white flex items-center justify-center shrink-0 text-[10px] font-bold shadow-xs">K</div>
        <div class="chat-bubble-kitman rounded-lg p-3 text-slate-900 font-semibold text-xs shadow-xs border border-[#7C3AED]/20 bg-[#7C3AED]/5">
            <i class="fa-solid fa-spinner animate-spin mr-1.5 text-[#7C3AED]"></i> KITMAN is reviewing telemetry...
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: queryText })
        });
        
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) indicator.remove();
        
        if (!response.ok) throw new Error("Chat request failed");
        
        const res = await response.json();
        appendChatMessage("ai", res.reply, "KITMAN", res.engine);
    } catch (err) {
        console.error(err);
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) indicator.remove();
        appendChatMessage("ai", "⚠️ **System Communication Failure:** Failed to transmit query to KITMAN engine.", "KITMAN", "Error Mode");
    }
}

function appendChatMessage(sender, text, label, engine = "") {
    const chatMessages = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    
    let containerClass = "flex items-start space-x-3 max-w-[90%] self-end flex-row-reverse space-x-reverse ml-auto";
    let avatarHtml = `
        <div class="w-6 h-6 rounded border border-[#C79C00] bg-[#E6B500] flex items-center justify-center shrink-0 font-bold text-[10px] text-slate-900">
            M
        </div>
    `;
    let bubbleClass = "chat-bubble-staff";
    let textClass = "text-xs text-slate-900 font-medium";
    let titleColor = "text-slate-900 font-bold uppercase tracking-wider text-[8px]";
    let engineTag = "";
    
    if (sender === 'ai') {
        containerClass = "flex items-start space-x-3 max-w-[90%]";
        avatarHtml = `
            <div class="w-6 h-6 rounded bg-[#7C3AED] text-white flex items-center justify-center shrink-0 text-[10px] font-black italic shadow-xs">
                K
            </div>
        `;
        bubbleClass = "chat-bubble-kitman";
        textClass = "text-[12px] text-slate-955 font-bold";
        titleColor = "text-[#7C3AED] font-bold uppercase tracking-widest text-[9px]";
        if (engine) {
            engineTag = `<span class="text-[#7C3AED] font-bold text-[8px] ml-2 border border-[#7C3AED]/30 bg-[#7C3AED]/15 px-1 rounded-sm">${engine}</span>`;
        }
    }
    
    msgDiv.className = containerClass;
    msgDiv.innerHTML = `
        ${avatarHtml}
        <div class="${bubbleClass} rounded-lg p-3.5 relative select-text">
            <div class="mb-1 flex items-center justify-between text-[10px]">
                <span class="${titleColor}">${label}</span>
                ${engineTag}
            </div>
            <div class="${textClass}">${formatMarkdown(text)}</div>
        </div>
    `;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMarkdown(text) {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-950 font-bold">$1</strong>');
    text = text.replace(/^- (.*?)$/gm, '• $1');
    return text;
}

// Empty Bin API Call
async function dispatchCleanBin(binName) {
    appendLog(`[GREEN] Clearing compactor for ${binName}...`);
    try {
        const response = await fetch('/api/bin/empty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bin_name: binName })
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.detail);
        
        appendLog(`[GREEN] Success: ${res.message}`);
        fetchTelemetry();
        setTimeout(() => fetchAlerts(true), 800);
    } catch (err) {
        appendLog(`[ERROR] Janitorial dispatch failed: ${err.message}`);
    }
}

// Toggle Lift API Call
async function overrideLift(liftName, targetStatus) {
    appendLog(`[SYSTEM] Dispatching elevator override: set ${liftName} to ${targetStatus.toUpperCase()}...`);
    try {
        const response = await fetch('/api/lift/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lift_name: liftName, status: targetStatus })
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.detail);
        
        appendLog(`[SYSTEM] Success: ${res.message}`);
        fetchTelemetry();
        setTimeout(() => fetchAlerts(true), 800);
    } catch (err) {
        appendLog(`[ERROR] Lift override failed: ${err.message}`);
    }
}

// GENAI SPECIFIC HELPERS
async function triggerTransitAdvisor() {
    const out = document.getElementById('transit-advisor-output');
    if (!out) return;
    out.innerHTML = `
        <div class="text-center py-6 text-slate-450 animate-pulse">
            <i class="fa-solid fa-spinner animate-spin mr-1.5 text-blue-600"></i> Ingesting transit telemetry...
        </div>
    `;
    
    try {
        const prompt = "Draft transport egress holding instructions and transit coordination advices based on our current transit status: Metro lines loading, delays, and passenger bottlenecks.";
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });
        const res = await response.json();
        out.innerHTML = `
            <div class="p-4 bg-[#7C3AED]/5 border border-[#7C3AED]/20 rounded-xl text-slate-800 leading-relaxed text-xs">
                ${formatMarkdown(res.reply)}
            </div>
            <div class="text-[9px] font-mono text-[#7C3AED] uppercase tracking-widest text-right mt-1.5">Generated by KITMAN // ${res.engine}</div>
        `;
    } catch (err) {
        out.innerHTML = `<p class="text-red-500 font-bold">⚠️ Failure querying KITMAN: ${err.message}</p>`;
    }
}

async function triggerAccessibilityAdvisor() {
    const out = document.getElementById('accessibility-advisor-output');
    if (!out) return;
    out.innerHTML = `
        <div class="text-center py-6 text-slate-450 animate-pulse">
            <i class="fa-solid fa-spinner animate-spin mr-1.5 text-blue-600"></i> Analyzing wheelchair routing paths...
        </div>
    `;
    
    try {
        const prompt = "Elevator 3 (Section 102) is OFFLINE. Elevators 1, 2, 4 are NOMINAL. Ingest this and write a detailed, step-free wheelchair routing detour direction from Gate C to Section 102.";
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });
        const res = await response.json();
        out.innerHTML = `
            <div class="p-4 bg-[#7C3AED]/5 border border-[#7C3AED]/20 rounded-xl text-slate-800 leading-relaxed text-xs">
                ${formatMarkdown(res.reply)}
            </div>
            <div class="text-[9px] font-mono text-[#7C3AED] uppercase tracking-widest text-right mt-1.5">Generated by KITMAN // ${res.engine}</div>
        `;
    } catch (err) {
        out.innerHTML = `<p class="text-red-500 font-bold">⚠️ Failure querying KITMAN: ${err.message}</p>`;
    }
}

async function triggerWayfindingAdvisor() {
    const out = document.getElementById('wayfinding-advisor-output');
    const signboard = document.getElementById('signboard-mock-text');
    const selectedZone = document.getElementById('wayfinding-zone-select').value;
    if (!out) return;
    
    out.innerHTML = `
        <div class="text-center py-6 text-slate-450 animate-pulse">
            <i class="fa-solid fa-spinner animate-spin mr-1.5 text-blue-600"></i> Crafting signboard copy...
        </div>
    `;
    if (signboard) signboard.innerHTML = `<i class="fa-solid fa-spinner animate-spin text-blue-600 mr-1.5"></i> DISPATCHING...`;
    
    try {
        const prompt = `Generate a high-visibility, short, uppercase signboard routing message (max 60 characters) and a detailed multilingual explanation for fans trying to access: ${selectedZone} due to heavy congestion. Separate them with a line break or double slash.`;
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });
        const res = await response.json();
        
        let replyText = res.reply;
        let signText = `AVOID ${selectedZone.toUpperCase()} // USE SOUTH DETOUR`;
        
        const regex = /"([^"]*)"/g;
        let m = regex.exec(replyText);
        if (m) {
            signText = m[1].toUpperCase();
        } else if (replyText.includes("\n")) {
            signText = replyText.split("\n")[0].toUpperCase();
        } else if (replyText.length < 65) {
            signText = replyText.toUpperCase();
        }
        
        signText = signText.replace(/[#*"]/g, "").trim().substring(0, 65);
        if (signboard) signboard.textContent = signText;
        
        out.innerHTML = `
            <div class="p-4 bg-[#7C3AED]/5 border border-[#7C3AED]/20 rounded-xl text-slate-800 leading-relaxed text-xs">
                ${formatMarkdown(replyText)}
            </div>
            <div class="text-[9px] font-mono text-[#7C3AED] uppercase tracking-widest text-right mt-1.5">Generated by KITMAN // ${res.engine}</div>
        `;
    } catch (err) {
        if (signboard) signboard.textContent = "COMMUNICATION FAILURE";
        out.innerHTML = `<p class="text-red-500 font-bold">⚠️ Failure querying KITMAN: ${err.message}</p>`;
    }
}

async function triggerSustainabilityAdvisor() {
    const out = document.getElementById('sustainability-advisor-output');
    if (!out) return;
    out.innerHTML = `
        <div class="text-center py-6 text-slate-455 animate-pulse">
            <i class="fa-solid fa-spinner animate-spin mr-1.5 text-blue-600"></i> Running waste compacting analysis...
        </div>
    `;
    
    try {
        const prompt = "Audit our smart trash bins. Ingest their fill rates and suggest a janitorial dispatch schedule prioritizing the bins that exceed 80% capacity.";
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });
        const res = await response.json();
        out.innerHTML = `
            <div class="p-4 bg-[#7C3AED]/5 border border-[#7C3AED]/20 rounded-xl text-slate-800 leading-relaxed text-xs">
                ${formatMarkdown(res.reply)}
            </div>
            <div class="text-[9px] font-mono text-[#7C3AED] uppercase tracking-widest text-right mt-1.5">Generated by KITMAN // ${res.engine}</div>
        `;
    } catch (err) {
        out.innerHTML = `<p class="text-red-500 font-bold">⚠️ Failure querying KITMAN: ${err.message}</p>`;
    }
}

// Submit Incident via API
async function submitIncidentForm() {
    const zone = document.getElementById('inc-zone-select').value;
    const severity = document.getElementById('inc-severity-select').value;
    const description = document.getElementById('inc-desc').value;
    
    appendLog(`[SYSTEM] Dispatching emergency operational incident tag...`);
    try {
        const response = await fetch('/api/incident/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zone, severity, description })
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.detail || "Failed to trigger incident");
        
        appendLog(`[SYSTEM] Incident alert: '${res.incident.description}' in ${res.incident.zone}.`);
        toggleIncidentModal(false);
        fetchTelemetry();
        setTimeout(() => fetchAlerts(true), 800);
    } catch (err) {
        appendLog(`[ERROR] Incident dispatch aborted: ${err.message}`);
    }
}

// Submit Shift staff via API
async function submitShiftForm() {
    const from_zone = document.getElementById('shift-source-select').value;
    const to_zone = document.getElementById('shift-target-select').value;
    const count = parseInt(document.getElementById('shift-count-input').value);
    
    if (from_zone === to_zone) {
        appendLog(`[ERROR] Shift command error: Source and target segments match.`);
        return;
    }
    
    appendLog(`[SYSTEM] Dispatching re-allocation order: Move ${count} staff from ${from_zone} to ${to_zone}...`);
    try {
        const response = await fetch('/api/shift', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_zone, to_zone, count })
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.detail || "Shift failed");
        
        appendLog(`[SYSTEM] Shift executed: ${res.message}`);
        toggleShiftModal(false);
        fetchTelemetry();
        setTimeout(() => fetchAlerts(true), 800);
    } catch (err) {
        appendLog(`[ERROR] Command rejected: ${err.message}`);
    }
}

// Modal Toggle utilities
function toggleIncidentModal(show) {
    const modal = document.getElementById('incident-modal');
    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
        const form = document.getElementById('incident-form');
        if (form) form.reset();
    }
}

function toggleShiftModal(show) {
    const modal = document.getElementById('shift-modal');
    if (show) {
        modal.classList.remove('hidden');
        populateModalDropdowns();
    } else {
        modal.classList.add('hidden');
        const form = document.getElementById('shift-form');
        if (form) form.reset();
    }
}

function openQuickShift(zoneName) {
    toggleShiftModal(true);
    const sourceSel = document.getElementById('shift-source-select');
    if (sourceSel) sourceSel.value = zoneName;
}

// CANVAS RADAR COMPONENT
function initRadar() {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
        mousePos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    });
    
    canvas.addEventListener('mouseleave', () => {
        mousePos = { x: -100, y: -100 };
        const hoverInfo = document.getElementById('radar-hover-info');
        if (hoverInfo) {
            hoverInfo.innerHTML = `<span class="text-[#F5C518]/70">SYS.READY // HOVER NODE TO INSPECT METRICS</span><span class="text-[#F5C518] font-bold uppercase tracking-wider text-[9px]">KITMAN tactical</span>`;
        }
    });
    
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        for (let name in zoneCoordinates) {
            const node = zoneCoordinates[name];
            const dist = Math.hypot(clickX - node.x, clickY - node.y);
            if (dist < 15) {
                appendLog(`[RADAR] Focused on segment: ${name}. Navigating to Squad Roster grid...`);
                const menuRoster = document.getElementById('menu-roster');
                if (menuRoster) menuRoster.click();
                openQuickShift(name);
                break;
            }
        }
    });

    function drawRadar() {
        // Draw card background matching navy theme
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const maxRadius = cx * 0.88; // Scale to maximize size while keeping padding for labels
        
        // Draw distinct darker radar circle disk for depth effect
        ctx.fillStyle = '#0B0F19';
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw gold boundary border
        ctx.strokeStyle = 'rgba(245, 197, 24, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Circular Grid Rings - Futuristic Dashes
        ctx.strokeStyle = 'rgba(245, 197, 24, 0.2)';
        ctx.lineWidth = 1;
        
        const rings = [0.25, 0.5, 0.75, 1.0];
        rings.forEach(r => {
            ctx.beginPath();
            ctx.setLineDash([4, 4]); // Dashed circle for high-tech blueprint feel
            ctx.arc(cx, cy, maxRadius * r, 0, Math.PI * 2);
            ctx.stroke();
            
            // Print ring distance label
            ctx.fillStyle = 'rgba(245, 197, 24, 0.45)';
            ctx.font = '7px "SFMono-Regular", Consolas, monospace';
            ctx.fillText(`${Math.round(r * 200)}m`, cx + 3, cy - maxRadius * r + 8);
        });
        ctx.setLineDash([]); // Reset dashed line
        
        // Crosshairs
        ctx.strokeStyle = 'rgba(245, 197, 24, 0.15)';
        ctx.beginPath();
        ctx.moveTo(cx - maxRadius, cy);
        ctx.lineTo(cx + maxRadius, cy);
        ctx.moveTo(cx, cy - maxRadius);
        ctx.lineTo(cx, cy + maxRadius);
        ctx.stroke();

        // Diagonal grid lines
        ctx.strokeStyle = 'rgba(245, 197, 24, 0.08)';
        ctx.beginPath();
        ctx.moveTo(cx - maxRadius * 0.7, cy - maxRadius * 0.7);
        ctx.lineTo(cx + maxRadius * 0.7, cy + maxRadius * 0.7);
        ctx.moveTo(cx - maxRadius * 0.7, cy + maxRadius * 0.7);
        ctx.lineTo(cx + maxRadius * 0.7, cy - maxRadius * 0.7);
        ctx.stroke();
        
        // Outer Compass Ring & Angle ticks
        ctx.strokeStyle = 'rgba(245, 197, 24, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(245, 197, 24, 0.25)';
        ctx.lineWidth = 1;
        for (let a = 0; a < 360; a += 10) {
            const angleRad = (a * Math.PI) / 180;
            const startDist = maxRadius - (a % 30 === 0 ? 8 : 4);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angleRad) * startDist, cy + Math.sin(angleRad) * startDist);
            ctx.lineTo(cx + Math.cos(angleRad) * maxRadius, cy + Math.sin(angleRad) * maxRadius);
            ctx.stroke();
        }
        
        // Rotate sweep - Yellow/Gold Sweep
        radarAngle = (radarAngle + 0.012) % (Math.PI * 2);
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(radarAngle);
        
        const sweepGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, maxRadius);
        sweepGrad.addColorStop(0, 'rgba(245, 197, 24, 0.25)'); // Glowing Yellow sweep
        sweepGrad.addColorStop(1, 'rgba(245, 197, 24, 0.0)');
        
        ctx.fillStyle = sweepGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, maxRadius, -0.4, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(245, 197, 24, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(maxRadius, 0);
        ctx.stroke();
        
        ctx.restore();
        
        // Draw Nodes
        for (let name in zoneCoordinates) {
            const coord = zoneCoordinates[name];
            let zData = telemetryData ? telemetryData.zones[name] : null;
            
            let color = '#8E8E93';
            let cong = 0;
            let status = 'Offline';
            let staff = 0;
            let queue = 0;
            
            if (zData) {
                cong = zData.congestion;
                status = zData.status;
                staff = zData.staff_count;
                queue = zData.queue_time;
                
                if (zData.congestion > 80) {
                    color = '#FF3B30'; // Critical Red
                } else if (zData.congestion > 60) {
                    color = '#FF9500'; // Heavy Orange/Yellow
                } else if (zData.congestion > 35) {
                    color = '#F5C518'; // Normal Yellow
                } else {
                    color = '#0A84FF'; // Clear Blue
                }
            }
            
            const dist = Math.hypot(mousePos.x - coord.x, mousePos.y - coord.y);
            let hoverNode = dist < 15;
            const pulse = 1.8 + Math.sin(Date.now() / 250 + (coord.x * coord.y)) * 1.2;
            
            // Draw futuristic target lock square on hover
            if (hoverNode) {
                ctx.strokeStyle = '#F5C518';
                ctx.lineWidth = 1;
                ctx.strokeRect(coord.x - 8, coord.y - 8, 16, 16);
                
                ctx.beginPath();
                ctx.moveTo(coord.x - 12, coord.y); ctx.lineTo(coord.x - 8, coord.y);
                ctx.moveTo(coord.x + 8, coord.y); ctx.lineTo(coord.x + 12, coord.y);
                ctx.moveTo(coord.x, coord.y - 12); ctx.lineTo(coord.x, coord.y - 8);
                ctx.moveTo(coord.x, coord.y + 8); ctx.lineTo(coord.x, coord.y + 12);
                ctx.stroke();
            }
            
            ctx.fillStyle = color;
            ctx.globalAlpha = hoverNode ? 0.4 : 0.15;
            ctx.beginPath();
            ctx.arc(coord.x, coord.y, 7 + (hoverNode ? 3.5 : pulse), 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(coord.x, coord.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = hoverNode ? '#F5C518' : '#E5E5EA';
            ctx.font = 'bold 11px "SFMono-Regular", Consolas, monospace';
            ctx.textAlign = coord.x > cx ? 'left' : 'right';
            const offset = coord.x > cx ? 10 : -10;
            ctx.fillText(coord.label, coord.x + offset, coord.y + 3);
            
            if (hoverNode && zData) {
                const hoverInfo = document.getElementById('radar-hover-info');
                if (hoverInfo) {
                    let textClass = "text-[#34C759] font-bold";
                    if (status === 'Critical' || status === 'Saturated') textClass = "text-[#FF3B30] font-bold";
                    else if (status === 'Heavy' || status === 'Busy') textClass = "text-[#FF9500] font-bold";
                    
                    hoverInfo.innerHTML = `
                        <span class="text-[#F5C518] font-bold text-[10px] tracking-wide font-mono">${coord.label}</span>
                        <span class="font-bold flex items-center space-x-3 text-[11px] text-slate-300 font-mono">
                            <span class="mr-2">CONG: <span class="${textClass}">${cong}%</span></span>
                            <span class="mr-2">QUEUE: <span class="${textClass}">${queue}m</span></span>
                            <span>STAFF: <span class="text-white font-bold">${staff}</span></span>
                        </span>
                    `;
                }
            }
        }
        
        requestAnimationFrame(drawRadar);
    }
    
    drawRadar();
}
