// Admin JavaScript
// Use the same origin (server on port 3000) or specify the full URL
const API_BASE = window.location.origin.includes('3000') ? '' : 'http://localhost:3000';

function checkAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        'Content-Type': 'application/json'
    };
}

async function apiCall(endpoint, options = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers
        }
    });

    if (res.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html';
        return null;
    }

    return res;
}

// Logout
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUsername');
            window.location.href = 'login.html';
        });
    }
});

