const BASE_URL = typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  ? `http://${window.location.hostname}:5000/api`
  : 'http://localhost:5000/api';


function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth API
  async login(username, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Login failed');
    }
    return res.json();
  },

  async register(formData) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: formData // Multer multipart/form-data
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Registration failed');
    }
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async updateProfile(profileData) {
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to update profile');
    }
    return res.json();
  },

  // Admin Actions
  async getAdminUsers() {
    const res = await fetch(`${BASE_URL}/admin/users`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async createUser(user) {
    const res = await fetch(`${BASE_URL}/admin/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to create user');
    }
    return res.json();
  },

  async deleteUser(userId) {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to delete user');
    }
    return res.json();
  },

  async getActivities() {
    const res = await fetch(`${BASE_URL}/admin/activities`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch activities');
    return res.json();
  },

  async approveUser(userId) {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/approve`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to approve user');
    return res.json();
  },

  async suspendUser(userId) {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to suspend user');
    return res.json();
  },

  // Settings & Pricing Config API
  async getSettings() {
    const res = await fetch(`${BASE_URL}/settings`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settingsData) {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settingsData)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // Properties API
  async getProperties() {
    const res = await fetch(`${BASE_URL}/properties`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch properties');
    return res.json();
  },

  async createProperty(property) {
    const res = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(property)
    });
    if (!res.ok) throw new Error('Failed to create property');
    return res.json();
  },

  // Waste Requests API
  async getRequests() {
    const res = await fetch(`${BASE_URL}/requests`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json();
  },

  async createRequest(requestData) {
    const res = await fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(requestData)
    });
    if (!res.ok) throw new Error('Failed to create request');
    return res.json();
  },

  async assignRequest(requestId, driverId, vehicleId, dispatchedAmount) {
    const res = await fetch(`${BASE_URL}/requests/${requestId}/assign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ driverId, vehicleId, dispatchedAmount })
    });
    if (!res.ok) throw new Error('Failed to assign driver/vehicle');
    return res.json();
  },
  async startTrip(requestId) {
    const res = await fetch(`${BASE_URL}/requests/${requestId}/start-trip`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },


  async collectWaste(requestId, weight, wasteType, extraData = {}) {
    const res = await fetch(`${BASE_URL}/requests/${requestId}/collect`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ weight, wasteType, ...extraData })
    });
    if (!res.ok) throw new Error('Failed to log collection');
    return res.json();
  },

  // Vehicles API
  async getVehicles() {
    const res = await fetch(`${BASE_URL}/vehicles`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch vehicles');
    return res.json();
  },

  async createVehicle(vehicleData) {
    const res = await fetch(`${BASE_URL}/vehicles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(vehicleData)
    });
    if (!res.ok) throw new Error('Failed to create vehicle');
    return res.json();
  },

  async getVehicleTrack(vehicleId) {
    const res = await fetch(`${BASE_URL}/vehicles/${vehicleId}/track`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to track vehicle');
    return res.json();
  },

  async updatePropertyLocation(propertyId, lat, lng) {
    const res = await fetch(`${BASE_URL}/properties/${propertyId}/location`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ lat, lng })
    });
    if (!res.ok) throw new Error('Failed to update property location');
    return res.json();
  },

  async updateVehicleLocation(vehicleId, lat, lng) {
    const res = await fetch(`${BASE_URL}/vehicles/${vehicleId}/location`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ lat, lng })
    });
    if (!res.ok) throw new Error('Failed to update vehicle location');
    return res.json();
  },

  // Plants API
  async getPlants() {
    const res = await fetch(`${BASE_URL}/plants`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch plants');
    return res.json();
  },

  async createPlant(plantData) {
    const res = await fetch(`${BASE_URL}/plants`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(plantData)
    });
    if (!res.ok) throw new Error('Failed to create plant');
    return res.json();
  },

  async recordPlantDelivery(plantId, deliveryData) {
    const res = await fetch(`${BASE_URL}/plants/${plantId}/deliveries`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(deliveryData)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to record plant delivery');
    }
    return res.json();
  },

  async getPlantDeliveries() {
    const res = await fetch(`${BASE_URL}/plants/deliveries`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch deliveries');
    return res.json();
  },

  // Payments API
  async payRequest(requestId, paymentDetails) {
    const res = await fetch(`${BASE_URL}/payments/${requestId}/pay`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentDetails)
    });
    if (!res.ok) throw new Error('Failed to process payment');
    return res.json();
  },

  async getAdminPayments() {
    const res = await fetch(`${BASE_URL}/admin/payments`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch payments ledger');
    return res.json();
  },

  async getAdminDrivers() {
    const res = await fetch(`${BASE_URL}/admin/drivers`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch admin drivers management');
    return res.json();
  },

  // Complaints API
  async getComplaints() {
    const res = await fetch(`${BASE_URL}/complaints`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch complaints');
    return res.json();
  },

  async createComplaint(complaintData) {
    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(complaintData)
    });
    if (!res.ok) throw new Error('Failed to submit complaint');
    return res.json();
  },

  async resolveComplaint(complaintId, resolutionText) {
    const res = await fetch(`${BASE_URL}/complaints/${complaintId}/resolve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ resolutionText })
    });
    if (!res.ok) throw new Error('Failed to resolve complaint');
    return res.json();
  },

  // Notifications API
  async getNotifications() {
    const res = await fetch(`${BASE_URL}/notifications`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationsRead() {
    const res = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to read notifications');
    return res.json();
  },

  // Analytics API
  async getAnalyticsSummary() {
    const res = await fetch(`${BASE_URL}/analytics/summary`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Driver Leave Management API
  async submitDriverLeave(formData) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}/driver/leaves`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData // FormData with prescription file upload
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to submit leave request');
    }
    return res.json();
  },

  async getDriverLeaves() {
    const res = await fetch(`${BASE_URL}/driver/leaves`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch leaves');
    return res.json();
  },

  async reviewDriverLeave(leaveId, status, adminComment) {
    const res = await fetch(`${BASE_URL}/admin/leaves/${leaveId}/review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status, adminComment })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to review leave request');
    }
    return res.json();
  },

  // OLX Marketplace API
  async getMarketplaceItems() {
    const res = await fetch(`${BASE_URL}/marketplace/items`);
    if (!res.ok) throw new Error('Failed to fetch marketplace items');
    return res.json();
  },

  async createMarketplaceItem(formData) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}/marketplace/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData // FormData with image file
    });
    
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Server returned error status (${res.status}): ${text.substring(0, 100)}`);
    }

    if (!res.ok) {
      throw new Error(data.message || 'Failed to add marketplace item');
    }
    return data;
  },

  async deleteMarketplaceItem(itemId) {
    const res = await fetch(`${BASE_URL}/marketplace/items/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to remove item');
    return res.json();
  },

  async buyMarketplaceItem(itemId, paymentDetails) {
    const res = await fetch(`${BASE_URL}/marketplace/items/${itemId}/buy`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ paymentDetails })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to complete Razorpay purchase');
    }
    return res.json();
  }
};
