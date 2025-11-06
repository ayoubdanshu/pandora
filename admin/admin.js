// Admin JavaScript
// Always use relative paths for API endpoints
const API_BASE = '';

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

