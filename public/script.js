/**
 * EcoTrack - Full-Stack Client Logic
 */
const form = document.getElementById('footprint-form');
const FACTORS = { Transport: 0.21, Food: 2.5, Energy: 0.385 };
let logs = [];
let chart = null;

// NEW: Global Headers for Auth
const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
});

const socket = io(); 

socket.on('new-tip', (data) => {
    document.getElementById('personalized-tip').innerText = data.msg;
});

async function loadInsights() {
    const userId = localStorage.getItem('userId');
    const res = await fetch(`/api/logs/insights/${userId}`, { headers: getAuthHeaders() });
    const data = await res.json();
    
    document.getElementById('personalized-tip').innerText = data.tip;
    document.getElementById('weekly-goal').innerText = data.weeklyGoal;
    
    // Update progress bar vs current total
    const currentTotal = parseFloat(document.getElementById('total-co2').innerText);
    const progressBar = document.getElementById('goal-progress');
    progressBar.max = data.weeklyGoal * 1.5; // Scale for UI
    progressBar.value = currentTotal;
}

// 1. Initialization
async function init() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'auth.html';
        return;
    }

    if (window.lucide) window.lucide.createIcons();
    
    await loadDashboardData();
}

// 2. Fetch Data from Node.js Server
async function loadDashboardData() {
    const userId = localStorage.getItem('userId');
    
    try {
        // Fetch User Logs
        const logRes = await fetch(`/api/logs/${userId}`, { headers: getAuthHeaders() });
        logs = await logRes.json();

        // Fetch Community Stats (● Calculate and display average emission level)
        const statsRes = await fetch('/api/logs/stats/community', { headers: getAuthHeaders() });
        const stats = await statsRes.json();

        renderLogs();
        updateTotal();
        updateChart(stats.average); // Pass community avg to chart
        renderLeaderboard(stats.leaderboard);
        
        // Update Streak Display
        document.getElementById('user-streak').innerText = localStorage.getItem('streak') || 0;
    } catch (err) {
        console.error("Error loading dashboard:", err);
    }
}

// 3. Save to MongoDB (replaces localStorage.setItem)
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
        unit: document.getElementById('unit-hint').innerText
    };

    const response = await fetch('/api/logs', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newEntry)
    });

    const result = await response.json();
    if (result.success) {
        localStorage.setItem('streak', result.streak); // Update local streak
        await loadDashboardData(); // Refresh UI
        form.reset();
    }
});

// 4. Update Chart with Community Comparison
function updateChart(communityAvg) {
    const ctx = document.getElementById('footprintChart').getContext('2d');
    const totals = { Transport: 0, Food: 0, Energy: 0 };
    logs.forEach(log => totals[log.category] += log.co2);

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'bar', // Changed to Bar for better comparison
        data: {
            labels: ['Your Footprint', 'Community Avg'],
            datasets: [{
                label: 'kg CO2',
                data: [
                    Object.values(totals).reduce((a, b) => a + b, 0), 
                    communityAvg
                ],
                backgroundColor: ['#40916c', '#ff9f1c']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function logout() {
    localStorage.clear();
    window.location.href = 'auth.html';
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
    document.getElementById('total-co2').innerText = total.toFixed(2);
}

function renderLeaderboard(data) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = data.map((user, index) => `
        <li class="leaderboard-item">
            <span class="rank">#${index + 1}</span>
            <span class="name">${user.username}</span>
            <span class="score">${user.total.toFixed(1)} kg</span>
        </li>
    `).join('');
}

function filterLogs(category, btn) {
    // Update active button UI
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filtered = category === 'All' ? logs : logs.filter(l => l.category === category);
    renderFilteredLogs(filtered);
}

async function deleteLog(id) {
    if (!confirm('Are you sure?')) return;
    // In a real app, you'd call: await fetch(`/api/logs/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    // For now, let's refresh the data:
    await loadDashboardData();
}

function renderFilteredLogs(filteredData) {
    const logBody = document.getElementById('log-body');
    logBody.innerHTML = filteredData.map(log => `
        <tr>
            <td>${new Date(log.date).toLocaleDateString()}</td>
            <td><span class="badge badge-${log.category.toLowerCase()}">${log.category}</span></td>
            <td>${log.amount} ${log.unit.split(' ')[0]}</td>
            <td>${log.co2.toFixed(2)}</td>
            <td><button class="delete-btn" onclick="deleteLog('${log._id}')">Delete</button></td>
        </tr>
    `).join('');
}

document.addEventListener('DOMContentLoaded', init);