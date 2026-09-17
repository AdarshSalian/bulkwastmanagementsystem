// Mobile Driver App API Service
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

export const setAuthToken = (token) => {
  authToken = token;
};

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
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

export const mobileApi = {
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
    } catch (err) {
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

  async getMe() {
    const res = await fetch(`${currentHost}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async getAssignedRequests() {
    try {
      const res = await fetch(`${currentHost}/requests`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch assigned requests');
      return res.json();
    } catch (err) {
      console.warn('getAssignedRequests error:', err.message);
      return [];
    }
  },

  async getVehicles() {
    try {
      const res = await fetch(`${currentHost}/vehicles`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      return res.json();
    } catch (err) {
      console.warn('getVehicles error:', err.message);
      return [];
    }
  },

  async startTrip(requestId) {
    const res = await fetch(`${currentHost}/requests/${requestId}/start-trip`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to start trip');
    return data;
  },

  async updateVehicleLocation(vehicleId, lat, lng) {
    try {
      const res = await fetch(`${currentHost}/vehicles/${vehicleId}/location`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ lat, lng })
      });
      if (!res.ok) throw new Error('Failed to update live GPS location');
      return res.json();
    } catch (err) {
      console.warn('Location sync failed:', err.message);
      return { lat, lng };
    }
  },

  async collectWaste(requestId, weight, wasteType, extraData = {}) {
    const res = await fetch(`${currentHost}/requests/${requestId}/collect`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ weight, wasteType, ...extraData })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to log collection');
    return data;
  },

  async getPlants() {
    try {
      const res = await fetch(`${currentHost}/plants`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch processing plants');
      return res.json();
    } catch (err) {
      console.warn('getPlants error:', err.message);
      return [];
    }
  },

  async recordPlantDelivery(plantId, deliveryData) {
    const res = await fetch(`${currentHost}/plants/${plantId}/deliveries`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(deliveryData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to log plant delivery');
    return data;
  },

  async getDriverLeaves() {
    try {
      const res = await fetch(`${currentHost}/driver/leaves`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch leaves');
      return res.json();
    } catch (err) {
      console.warn('getDriverLeaves error:', err.message);
      return [];
    }
  },

  async getNotifications() {
    try {
      const res = await fetch(`${currentHost}/notifications`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    } catch (err) {
      console.warn('getNotifications error:', err.message);
      return [];
    }
  },

  async markNotificationsRead() {
    try {
      await fetch(`${currentHost}/notifications/read-all`, { method: 'POST', headers: getHeaders() });
    } catch {}
  }
};
