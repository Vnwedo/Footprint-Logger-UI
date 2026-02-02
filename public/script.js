/**
 * EcoTrack - Full-Stack Client Logic (Insight Engine Enabled)
 */
const form = document.getElementById('footprint-form');
const FACTORS = { Transport: 0.21, Food: 2.5, Energy: 0.385 };
let logs = [];
let chart = null;

const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
});

// --- WEBSOCKETS ---
const socket = io(); 

socket.on('new-tip', (data) => {
    const tipContainer = document.getElementById('personalized-tip');
    if (tipContainer) {
        tipContainer.innerText = data.msg;
    }
});

// --- INSIGHT ENGINE ---
async function loadInsights() {
    const userId = localStorage.getItem('userId');
    try {
        const res = await fetch(`/api/logs/insights/${userId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        
        document.getElementById('personalized-tip').innerText = data.tip;
        document.getElementById('weekly-goal').innerText = data.weeklyGoal;
        
        // Calculate progress vs current total
        const currentTotal = logs.reduce((sum, log) => sum + log.co2, 0);
        const progressBar = document.getElementById('goal-progress');
        if (progressBar) {
            progressBar.max = Math.max(data.weeklyGoal, currentTotal); // Ensure bar doesn't break if over goal
            progressBar.value = currentTotal;
        }
    } catch (err) {
        console.error("Insight Engine Error:", err);
    }
}

// --- CORE FUNCTIONS ---
async function init() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'auth.html';
        return;
    }

    if (window.lucide) window.lucide.createIcons();
    
    await loadDashboardData(); // Load logs first
    await loadInsights();      // Then calculate insights based on those logs
}

async function loadDashboardData() {
    const userId = localStorage.getItem('userId');
    try {
        const logRes = await fetch(`/api/logs/${userId}`, { headers: getAuthHeaders() });
        logs = await logRes.json();

        const statsRes = await fetch('/api/logs/stats/community', { headers: getAuthHeaders() });
        const stats = await statsRes.json();

        renderLogs();
        updateTotal();
        updateChart(stats.avgCO2 || 0); 
        renderLeaderboard(stats.leaderboard || []);
        
        document.getElementById('user-streak').innerText = localStorage.getItem('streak') || 0;
    } catch (err) {
        console.error("Error loading dashboard:", err);
    }
}

// --- FORM SUBMISSION ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const co2 = amount * FACTORS[category];

    const newEntry = {
        userId: localStorage.getItem('userId'),
        category,
        amount,
        co2,
        unit: document.getElementById('unit-hint')?.innerText || 'units'
    };

    const response = await fetch('/api/logs', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newEntry)
    });

    const result = await response.json();
    if (response.ok) {
        localStorage.setItem('streak', result.streak);
        await loadDashboardData(); 
        await loadInsights(); // REFRESH INSIGHTS ON SUBMIT
        form.reset();
    }
});

// --- UI RENDERING ---
function updateChart(communityAvg) {
    const ctx = document.getElementById('footprintChart').getContext('2d');
    const myTotal = logs.reduce((sum, log) => sum + log.co2, 0);

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Your Footprint', 'Community Avg'],
            datasets: [{
                label: 'kg CO2',
                data: [myTotal, communityAvg],
                backgroundColor: ['#40916c', '#ff9f1c']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderLogs() {
    const logBody = document.getElementById('log-body');
    if (logs.length === 0) {
        logBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No logs found</td></tr>';
        return;
    }
    logBody.innerHTML = logs.map(log => `
        <tr>
            <td>${new Date(log.date).toLocaleDateString()}</td>
            <td><span class="badge badge-${log.category.toLowerCase()}">${log.category}</span></td>
            <td>${log.amount} ${log.unit.split(' ')[0]}</td>
            <td>${log.co2.toFixed(2)}</td>
            <td><button class="delete-btn" onclick="deleteLog('${log._id}')">Delete</button></td>
        </tr>
    `).join('');
}

function updateTotal() {
    const total = logs.reduce((sum, log) => sum + log.co2, 0);
    const totalEl = document.getElementById('total-co2');
    if (totalEl) totalEl.innerText = total.toFixed(2);
}

function renderLeaderboard(data) {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = data.map((user, index) => `
        <li class="leaderboard-item">
            <span class="rank">#${index + 1}</span>
            <span class="name">${user.username}</span>
            <span class="score">${user.totalEmissions.toFixed(1)} kg</span>
        </li>
    `).join('');
}

function logout() {
    localStorage.clear();
    window.location.href = 'auth.html';
}

document.addEventListener('DOMContentLoaded', init);