/**
 * EcoTrack - Carbon Footprint Logic
 */

// 1. Configuration & Data Structures
const FACTORS = {
    Transport: 0.21, // kg CO2 per km
    Food: 2.5,      // kg CO2 per high-impact meal
    Energy: 0.385    // kg CO2 per kWh
};

const UNITS = {
    Transport: 'Kilometers (km)',
    Food: 'Number of Meals',
    Energy: 'Kilowatt-hours (kWh)'
};

// State management
let logs = JSON.parse(localStorage.getItem('ecoLogs')) || [];
let chart = null;
let currentFilter = 'All';

// DOM Elements
const form = document.getElementById('footprint-form');
const categorySelect = document.getElementById('category');
const amountInput = document.getElementById('amount');
const unitHint = document.getElementById('unit-hint');
const logBody = document.getElementById('log-body');
const emptyMsg = document.getElementById('empty-msg');
const totalDisplay = document.getElementById('total-co2');

// 2. Initialization
function init() {
    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    renderLogs();
    updateChart();
    updateTotal();
}

// 3. Event Listeners
categorySelect.addEventListener('change', () => {
    const cat = categorySelect.value;
    unitHint.innerText = `Typical unit: ${UNITS[cat]}`;
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const category = categorySelect.value;
    const amount = parseFloat(amountInput.value);
    const co2 = parseFloat((amount * FACTORS[category]).toFixed(2));

    const entry = {
        id: Date.now(),
        category,
        amount,
        co2,
        unit: UNITS[category].split(' ')[0],
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };

    logs.unshift(entry);
    saveAndRefresh();
    form.reset();
    unitHint.innerText = "Select a category to see units";
});

// 4. Core Functions
function deleteLog(id) {
    logs = logs.filter(log => log.id !== id);
    saveAndRefresh();
}

function saveAndRefresh() {
    localStorage.setItem('ecoLogs', JSON.stringify(logs));
    renderLogs();
    updateTotal();
    updateChart();
}

function filterLogs(category, btn) {
    currentFilter = category;
    
    // Update UI buttons
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    renderLogs();
}

function renderLogs() {
    const displayData = currentFilter === 'All' 
        ? logs 
        : logs.filter(l => l.category === currentFilter);

    if (displayData.length === 0) {
        logBody.innerHTML = '';
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';
    logBody.innerHTML = displayData.map(log => `
        <tr>
            <td>${log.date}</td>
            <td><span class="badge badge-${log.category.toLowerCase()}">${log.category}</span></td>
            <td>${log.amount} <small>${log.unit}</small></td>
            <td><strong>${log.co2.toFixed(2)}</strong></td>
            <td>
                <button onclick="deleteLog(${log.id})" class="delete-btn">
                     Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function updateTotal() {
    const total = logs.reduce((sum, log) => sum + log.co2, 0);
    totalDisplay.innerText = total.toFixed(2);
}

function updateChart() {
    const canvas = document.getElementById('footprintChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const totals = { Transport: 0, Food: 0, Energy: 0 };
    
    logs.forEach(log => totals[log.category] += log.co2);

    if (chart) chart.destroy();

    const hasData = Object.values(totals).some(v => v > 0);

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(totals),
            datasets: [{
                data: hasData ? Object.values(totals) : [1],
                backgroundColor: hasData ? ['#40916c', '#ff9f1c', '#3498db'] : ['#eeeeee'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 20 }
                },
                tooltip: {
                    enabled: hasData
                }
            },
            cutout: '70%'
        }
    });
}

// Start the app
window.onload = init;