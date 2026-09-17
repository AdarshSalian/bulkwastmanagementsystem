// User Mobile App - API Service
let currentHost = 'http://192.168.68.100:5000/api';
let authToken = '';

export const candidateHosts = [
  'http://192.168.68.100:5000/api',
  'http://localhost:5000/api',
  'http://10.0.2.2:5000/api',
  'http://127.0.0.1:5000/api'
];

export const getBaseUrl = () => currentHost;

export const setServerHost = (hostUrl) => {
  if (!hostUrl) return currentHost;
  let clean = hostUrl.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }
  if (!clean.endsWith('/api')) {
    clean = clean.replace(/\/+$/, '') + '/api';
  }
  currentHost = clean;
  return currentHost;
};

export const setAuthToken = (token) => { authToken = token; };

const getHeaders = () => {
  const h = { 'Content-Type': 'application/json' };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return h;
};

export async function autoFindWorkingHost() {
  const hostsToTry = [currentHost, ...candidateHosts.filter(h => h !== currentHost)];
  for (const h of hostsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${h}/settings`, { headers: getHeaders(), signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok || res.status === 401 || res.status === 403) {
        currentHost = h;
        return h;
      }
    } catch (e) {}
  }
  return currentHost;
}

export const userApi = {
  async ping() {
    try {
      const host = await autoFindWorkingHost();
      const res = await fetch(`${host}/settings`, { headers: getHeaders() });
      return res.ok || res.status === 401 || res.status === 403;
    } catch {
      return false;
    }
  },

  async login(username, password) {
    let targetHost = currentHost;
    let res;
    try {
      res = await fetch(`${targetHost}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
    } catch (e) {
      targetHost = await autoFindWorkingHost();
      res = await fetch(`${targetHost}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    if (data.token) setAuthToken(data.token);
    return data;
  },

  async register(payload) {
    const res = await fetch(`${currentHost}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    return data;
  },

  async getMe() {
    const res = await fetch(`${currentHost}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async getMyRequests() {
    try {
      const res = await fetch(`${currentHost}/requests`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch requests');
      return res.json();
    } catch (e) { console.warn(e.message); return []; }
  },

  async submitRequest(payload) {
    const res = await fetch(`${currentHost}/requests`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to submit request');
    return data;
  },

  async getMyProperties() {
    try {
      const res = await fetch(`${currentHost}/properties`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    } catch (e) { console.warn(e.message); return []; }
  },

  async addProperty(payload) {
    const res = await fetch(`${currentHost}/properties`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to add property');
    return data;
  },

  async getMyPayments() {
    try {
      const res = await fetch(`${currentHost}/payments`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    } catch (e) { console.warn(e.message); return []; }
  },

  async payRequest(requestId, method) {
    const res = await fetch(`${currentHost}/payments/${requestId}/pay`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ paymentMethod: method })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Payment failed');
    return data;
  },

  async getNotifications() {
    try {
      const res = await fetch(`${currentHost}/notifications`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    } catch (e) { console.warn(e.message); return []; }
  },

  async markNotificationsRead() {
    try {
      await fetch(`${currentHost}/notifications/read-all`, { method: 'POST', headers: getHeaders() });
    } catch {}
  },

  async submitComplaint(payload) {
    const res = await fetch(`${currentHost}/complaints`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to submit complaint');
    return data;
  },

  async getMyComplaints() {
    try {
      const res = await fetch(`${currentHost}/complaints`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch complaints');
      return res.json();
    } catch (e) { console.warn(e.message); return []; }
  },

  async getTariffs() {
    try {
      const res = await fetch(`${currentHost}/tariffs`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch tariffs');
      return res.json();
    } catch (e) { console.warn(e.message); return []; }
  },

  async getMarketplaceItems() {
    try {
      const res = await fetch(`${currentHost}/marketplace/items`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch marketplace items');
      return res.json();
    } catch (e) { console.warn(e.message); return []; }
  },

  async createMarketplaceItem(payload) {
    const res = await fetch(`${currentHost}/marketplace/items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list marketplace item');
    return data;
  },

  async deleteMarketplaceItem(itemId) {
    const res = await fetch(`${currentHost}/marketplace/items/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete marketplace item');
    return data;
  },

  async buyMarketplaceItem(itemId, paymentDetails) {
    const res = await fetch(`${currentHost}/marketplace/items/${itemId}/buy`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ paymentDetails })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to complete Razorpay purchase');
    return data;
  }
};

