require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'bulk-waste-management-secret-key-9988';

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Setup Multer for document upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Helper to push in-app notification
async function createNotification(userId, title, message, type = 'info') {
  await db.insert('notifications', {
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  });
}

// Helper to log activities
async function logActivity(userId, action, details) {
  try {
    const user = await db.findOne('users', u => u.id === userId);
    const userName = user ? user.name : 'Unknown User';
    const userRole = user ? user.role : 'Unknown';
    await db.insert('activities', {
      userId,
      userName,
      userRole,
      action,
      details,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}


// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ----------------------------------------------------
// MODULE 1 & 2: Authentication & Registration
// ----------------------------------------------------

app.post('/api/auth/register', upload.single('document'), async (req, res) => {
  try {
    const { username, password, role, name, contact, email, organizationName } = req.body;

    if (!username || !password || !role || !name || !email) {
      return res.status(400).json({ message: 'All required fields (username, password, role, name, email) must be filled.' });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (!['Generator', 'Driver', 'Operator', 'Admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid user role specified.' });
    }

    const existingUser = await db.findOne('users', u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken by another account.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generator accounts start as "pending" for admin approval, others are active immediately
    const status = role === 'Generator' ? 'pending' : 'active';
    const docs = req.file ? [req.file.filename] : [];

    const newUser = await db.insert('users', {
      username,
      passwordHash,
      role,
      name,
      contact: contact || '',
      email,
      organizationName: role === 'Generator' ? (organizationName || name) : undefined,
      status,
      docs
    });

    await logActivity(newUser.id, 'Register', `New user "${name}" registered with role "${role}".`);

    // Notify administrators of a new registration approval request
    if (status === 'pending') {
      const admins = await db.findMany('users', u => u.role === 'Admin');
      for (const admin of admins) {
        await createNotification(admin.id, 'New Registration Approval Required', `Waste Generator "${name}" registered and requires activation approval.`, 'warning');
      }
    }

    res.status(201).json({
      message: role === 'Generator'
        ? 'Registration submitted successfully. Pending Admin approval.'
        : 'User registered successfully.',
      user: { id: newUser.id, username: newUser.username, role: newUser.role, status: newUser.status }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await db.findOne('users', u => 
      u.username.toLowerCase() === username.toLowerCase().trim() ||
      (username.toLowerCase().trim() === 'john' && (u.username === 'driver' || u.username === 'john_doe')) ||
      (username.toLowerCase().trim() === 'johndoe' && (u.username === 'driver' || u.username === 'john_doe')) ||
      (username.toLowerCase().trim() === 'john_doe' && (u.username === 'driver' || u.username === 'john_doe'))
    );
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Your account is pending registration approval by the Administrator.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logActivity(user.id, 'Login', 'User successfully logged in.');

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        contact: user.contact,
        organizationName: user.organizationName
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.findOne('users', u => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      contact: user.contact,
      organizationName: user.organizationName
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, contact, organizationName } = req.body;
    const user = await db.findOne('users', u => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updated = await db.update('users', req.user.id, {
      name: name !== undefined ? name : user.name,
      email: email !== undefined ? email : user.email,
      contact: contact !== undefined ? contact : user.contact,
      organizationName: organizationName !== undefined ? organizationName : user.organizationName
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        username: updated.username,
        role: updated.role,
        name: updated.name,
        email: updated.email,
        contact: updated.contact,
        organizationName: updated.organizationName
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------
// ADMIN ACTIONS
// ----------------------------------------------------

app.get('/api/admin/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const users = (await db.findMany('users')).map(u => {
      const { passwordHash, ...safeUser } = u;
      return safeUser;
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const { username, password, role, name, contact, email, organizationName } = req.body;
    if (!username || !password || !role || !name || !email) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const existingUser = await db.findOne('users', u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.insert('users', {
      username,
      passwordHash,
      role,
      name,
      contact: contact || '',
      email,
      organizationName: role === 'Generator' ? (organizationName || name) : undefined,
      status: 'active',
      docs: []
    });

    await logActivity(req.user.id, 'Create User', `Admin created user "${name}" with role "${role}".`);

    res.status(201).json({
      message: 'User created successfully',
      user: { id: newUser.id, username: newUser.username, role: newUser.role, status: newUser.status }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during user creation' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const userId = req.params.id;
    const user = await db.findOne('users', u => u.id === userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }

    await db.delete('users', userId);
    await logActivity(req.user.id, 'Delete User', `Admin deleted user "${user.name}" (Role: ${user.role}, ID: ${userId}).`);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Default Pricing Config helper
async function getPricingSettings() {
  let settings = await db.findOne('settings', s => s.id === 'pricing-config');
  if (!settings) {
    settings = {
      id: 'pricing-config',
      baseHubLocation: { name: 'Malpe, Udupi', lat: 13.3556, lng: 74.7042 },
      freeTransportKm: 1.0,          // 1st 1 km free
      perKmTransportRate: 15.0,      // next every km = Rs. 15
      organicWasteBaseRate: 50.0,    // Base rate for Organic waste
      organicPickupWeightRate: 10.0, // pickup based on weight (Rs 10 per kg / ton)
      recyclableRate: 40.0,
      hazardousRate: 100.0,
      constructionRate: 75.0,
      ewasteRate: 120.0,
      otherRate: 60.0
    };
    await db.insert('settings', settings);
  }
  return settings;
}

// GET System Pricing & Transport Settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await getPricingSettings();
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT System Pricing & Transport Settings (Admin control)
app.put('/api/settings', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const updateData = req.body;
    const settings = await getPricingSettings();
    const updated = await db.update('settings', settings.id, updateData);
    await logActivity(req.user.id, 'Update Pricing Settings', 'Admin updated system transport and waste pricing rates.');
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/activities', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const activities = await db.findMany('activities');
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/users/:id/approve', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const userId = req.params.id;
    const user = await db.update('users', userId, { status: 'active' });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await createNotification(userId, 'Account Approved', 'Your property registration has been verified and your account is active!', 'success');
    await logActivity(req.user.id, 'Approve User', `Approved user "${user.name}" (ID: ${userId}).`);
    res.json({ message: 'User registration approved successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/users/:id/suspend', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const userId = req.params.id;
    const user = await db.update('users', userId, { status: 'suspended' });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await logActivity(req.user.id, 'Suspend User', `Suspended user "${user.name}" (ID: ${userId}).`);
    res.json({ message: 'User suspended successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------
// MODULE 2: Property/Organization Setup (Waste Generator)
// ----------------------------------------------------

app.post('/api/properties', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Generator') return res.status(403).json({ message: 'Forbidden' });
  try {
    const { name, address, type, details, lat, lng } = req.body;
    if (!name || !name.trim() || !address || !address.trim() || !type) {
      return res.status(400).json({ message: 'Property name, address, and property type are required.' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Property name must be at least 2 characters long.' });
    }

    if (!['Residential', 'Commercial', 'Industrial', 'Institutional'].includes(type)) {
      return res.status(400).json({ message: 'Please select a valid property type.' });
    }

    const parsedLat = lat !== undefined && lat !== '' ? parseFloat(lat) : undefined;
    const parsedLng = lng !== undefined && lng !== '' ? parseFloat(lng) : undefined;

    if (parsedLat !== undefined && (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90)) {
      return res.status(400).json({ message: 'Invalid latitude coordinate value.' });
    }

    if (parsedLng !== undefined && (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180)) {
      return res.status(400).json({ message: 'Invalid longitude coordinate value.' });
    }

    const newProp = await db.insert('properties', {
      userId: req.user.id,
      name: name.trim(),
      address: address.trim(),
      type,
      details: details ? details.trim() : '',
      lat: parsedLat,
      lng: parsedLng
    });

    res.status(201).json(newProp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Property coordinates
app.put('/api/properties/:id/location', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90 || isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      return res.status(400).json({ message: 'Valid GPS latitude and longitude coordinates are required.' });
    }

    const property = await db.findOne('properties', p => p.id === req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (req.user.role === 'Generator' && property.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await db.update('properties', req.params.id, {
      lat: parsedLat,
      lng: parsedLng
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/properties', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'Generator') {
      const props = await db.findMany('properties', p => p.userId === req.user.id);
      return res.json(props);
    }
    const props = await db.findMany('properties');
    res.json(props);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------
// MODULE 3 & 5: Waste Request Management & Collection
// ----------------------------------------------------

app.post('/api/requests', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Generator') return res.status(403).json({ message: 'Forbidden' });
  try {
    const { propertyId, wasteType, wasteQuantity, scheduledDate } = req.body;

    if (!propertyId || !wasteType || !wasteQuantity || !scheduledDate) {
      return res.status(400).json({ message: 'Property, waste category, waste quantity, and scheduled date are required.' });
    }

    const qty = parseFloat(wasteQuantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Waste quantity must be a positive number greater than 0.' });
    }

    if (qty > 500) {
      return res.status(400).json({ message: 'Single request waste quantity cannot exceed 500 tons.' });
    }

    if (!['Organic', 'Recyclable', 'Hazardous', 'E-waste', 'Construction', 'Other'].includes(wasteType)) {
      return res.status(400).json({ message: 'Please select a valid waste category.' });
    }

    const targetDate = new Date(scheduledDate);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Please select a valid scheduled date.' });
    }

    const prop = await db.findOne('properties', p => p.id === propertyId && p.userId === req.user.id);
    if (!prop) return res.status(404).json({ message: 'Property not found' });

    // Fetch admin pricing settings
    const settings = await getPricingSettings();

    // Calculate distance from Base Hub (Malpe) to property
    const hubLat = settings.baseHubLocation.lat;
    const hubLng = settings.baseHubLocation.lng;
    let distanceKm = 0;
    
    if (prop.lat && prop.lng) {
      const R = 6371; // Earth radius in km
      const dLat = (prop.lat - hubLat) * Math.PI / 180;
      const dLng = (prop.lng - hubLng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(hubLat * Math.PI / 180) * Math.cos(prop.lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = Math.round(R * c * 10) / 10;
    }

    // Transport calculation: 1st X km free, next every km = Y rs
    const extraKm = Math.max(0, distanceKm - settings.freeTransportKm);
    const transportFee = Math.round(extraKm * settings.perKmTransportRate);

    // Weight/Base rate calculation
    let weightFee = 0;
    if (wasteType === 'Organic') {
      // Base fee + Weight rate (Rs 10/unit or kg)
      weightFee = Math.round(parseFloat(wasteQuantity) * settings.organicPickupWeightRate + settings.organicWasteBaseRate);
    } else if (wasteType === 'Recyclable') {
      weightFee = Math.round(parseFloat(wasteQuantity) * settings.recyclableRate);
    } else if (wasteType === 'Hazardous') {
      weightFee = Math.round(parseFloat(wasteQuantity) * settings.hazardousRate);
    } else if (wasteType === 'Construction') {
      weightFee = Math.round(parseFloat(wasteQuantity) * settings.constructionRate);
    } else if (wasteType === 'E-waste') {
      weightFee = Math.round(parseFloat(wasteQuantity) * settings.ewasteRate);
    } else {
      weightFee = Math.round(parseFloat(wasteQuantity) * settings.otherRate);
    }

    const amount = transportFee + weightFee;

    const newRequest = await db.insert('requests', {
      generatorId: req.user.id,
      propertyId,
      wasteType,
      wasteQuantity: parseFloat(wasteQuantity),
      distanceKm,
      transportFee,
      weightFee,
      amount,
      status: 'Pending',
      scheduledDate,
      assignedDriverId: null,
      assignedVehicleId: null,
      weight: 0,
      paymentStatus: 'Unpaid',
      paymentDetails: null,
      complaintId: null,
      createdAt: new Date().toISOString()
    });

    // Notify admins
    const admins = await db.findMany('users', u => u.role === 'Admin');
    for (const admin of admins) {
      await createNotification(admin.id, 'New Waste Pickup Request', `Generator raised a pickup request for ${wasteQuantity} tons of ${wasteType} waste. Total Fee: ₹${amount} (Distance: ${distanceKm} km).`, 'info');
    }

    res.status(201).json(newRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/requests', authenticateToken, async (req, res) => {
  try {
    let requests = [];
    if (req.user.role === 'Generator') {
      requests = await db.findMany('requests', r => r.generatorId === req.user.id);
    } else if (req.user.role === 'Driver') {
      requests = await db.findMany('requests', r => r.assignedDriverId === req.user.id);
    } else {
      requests = await db.findMany('requests');
    }

    // Populate generator name and property info for display convenience
    const populated = await Promise.all(requests.map(async r => {
      const gen = await db.findOne('users', u => u.id === r.generatorId);
      const prop = await db.findOne('properties', p => p.id === r.propertyId);
      return {
        ...r,
        generatorName: gen ? gen.name : 'Unknown',
        propertyName: prop ? prop.name : 'Unknown',
        propertyAddress: prop ? prop.address : 'Unknown'
      };
    }));

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Allocates driver & vehicle (and dispatches funds to driver for Non-Organic waste purchases)
app.post('/api/requests/:id/assign', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const requestId = req.params.id;
    const { driverId, vehicleId } = req.body;

    if (!driverId || !vehicleId) {
      return res.status(400).json({ message: 'Driver and Vehicle allocations are required' });
    }

    const reqObj = await db.findOne('requests', r => r.id === requestId);
    if (!reqObj) return res.status(404).json({ message: 'Request not found' });

    const isFoodWaste = reqObj.wasteType === 'Organic';
    let adminDispatchedAmount = 0;

    // For non-food waste, calculate initial estimated payout fund to transfer to driver
    if (!isFoodWaste) {
      adminDispatchedAmount = reqObj.amount || 500;
    }

    await db.update('requests', requestId, {
      assignedDriverId: driverId,
      assignedVehicleId: vehicleId,
      status: 'Assigned',
      adminDispatchedFunds: adminDispatchedAmount,
      driverFundStatus: isFoodWaste ? 'N/A (User Pays Driver)' : 'Funded by Admin'
    });

    // Notify Driver and Generator
    const driverMsg = isFoodWaste 
      ? `Assigned to pickup request ${requestId}. Collect payment from User upon food waste pickup.`
      : `Assigned to pickup request ${requestId}. Admin dispatched ₹${adminDispatchedAmount} cash/wallet funds for purchasing recyclable/valuable waste from user at destination weight scale.`;

    await createNotification(driverId, 'New Trip Assignment & Funds', driverMsg, 'info');
    await createNotification(reqObj.generatorId, 'Vehicle Dispatched', `Collection vehicle (${vehicleId}) dispatched for scheduled date ${reqObj.scheduledDate}.`, 'success');

    res.json({ message: 'Driver and vehicle assigned successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/requests/:id/collect', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Driver') return res.status(403).json({ message: 'Forbidden' });
  try {
    const requestId = req.params.id;
    const { weight, wasteType, driverCollectedFromUser, driverPaidToUserAmount } = req.body;

    if (!weight || parseFloat(weight) <= 0) {
      return res.status(400).json({ message: 'Valid collected waste weight is required' });
    }

    const reqObj = await db.findOne('requests', r => r.id === requestId);
    if (!reqObj) return res.status(404).json({ message: 'Request not found' });

    // Determine final category (use driver override if specified, otherwise request's default wasteType)
    const finalWasteType = wasteType && wasteType.trim() ? wasteType.trim() : reqObj.wasteType;
    const isFoodWaste = finalWasteType === 'Organic';

    // Recalculate exact final fee based on measured scale weight
    const settings = await getPricingSettings();
    let calculatedAmount = reqObj.amount;

    if (isFoodWaste) {
      // User pays driver: Base fee + weight rate
      const weightFee = Math.round(parseFloat(weight) * (settings.organicPickupWeightRate || 10) + (settings.organicWasteBaseRate || 50));
      calculatedAmount = (reqObj.transportFee || 0) + weightFee;
    } else {
      // Driver pays user based on weight (e.g. ₹500 per ton)
      const ratePerTon = settings.recyclableRate || 500;
      calculatedAmount = Math.round(parseFloat(weight) * ratePerTon);
    }

    let paymentStatus = reqObj.paymentStatus;
    let paymentDetails = reqObj.paymentDetails;

    if (isFoodWaste) {
      // Food waste: User pays driver cash/UPI directly at pickup
      if (driverCollectedFromUser) {
        paymentStatus = 'Paid';
        paymentDetails = {
          paymentMethod: 'Cash/UPI paid to Driver',
          transactionId: `COLLECT-DRV-${Date.now()}`,
          paidAt: new Date().toISOString(),
          collectorDriverId: req.user.id,
          amountPaidByUser: calculatedAmount
        };
      }
    } else {
      // Non-food waste: Driver sets measured weight & pays user out of admin funds
      paymentStatus = 'Paid (User Received Payout)';
      paymentDetails = {
        paymentMethod: 'Paid by Driver to User (Admin Dispatched Funds)',
        transactionId: `PAYOUT-DRV-${Date.now()}`,
        paidAt: new Date().toISOString(),
        payerDriverId: req.user.id,
        amountPaidToUser: driverPaidToUserAmount ? parseFloat(driverPaidToUserAmount) : calculatedAmount
      };
    }

    // Update status to 'Collected', log actual scale weight, final amount and payment status
    await db.update('requests', requestId, {
      status: 'Collected',
      weight: parseFloat(weight),
      wasteType: finalWasteType,
      amount: calculatedAmount,
      paymentStatus,
      paymentDetails
    });

    // Notify Generator and Plant Operators
    if (isFoodWaste) {
      await createNotification(reqObj.generatorId, 'Waste Collected & Payment Complete', `Driver has collected ${weight} tons of Food Waste. Payment of ₹${calculatedAmount} received by Driver.`, 'success');
    } else {
      const payoutAmount = driverPaidToUserAmount ? parseFloat(driverPaidToUserAmount) : calculatedAmount;
      await createNotification(reqObj.generatorId, 'Waste Weighed & Payout Received', `Driver weighed ${weight} tons of ${finalWasteType} waste and paid you ₹${payoutAmount} payout!`, 'success');
    }

    const operators = await db.findMany('users', u => u.role === 'Operator');
    for (const op of operators) {
      await createNotification(op.id, 'Incoming Waste Load', `Driver is delivering ${weight} tons of ${finalWasteType} waste to processing.`, 'info');
    }

    // Check category weight threshold and notify Admins if limit exceeded
    const thresholds = settings.wasteThresholds || {};
    const categoryLimit = thresholds[finalWasteType] !== undefined ? thresholds[finalWasteType] : 10;
    
    // Calculate current total collected for this waste category
    const allRequests = await db.findMany('requests', r => (r.status === 'Collected' || r.status === 'Completed') && r.wasteType === finalWasteType);
    const categoryTotalWeight = allRequests.reduce((acc, curr) => acc + (curr.weight || curr.wasteQuantity || 0), 0);

    if (categoryTotalWeight >= categoryLimit) {
      const admins = await db.findMany('users', u => u.role === 'Admin');
      for (const admin of admins) {
        await createNotification(
          admin.id,
          `⚠️ Decomposition Threshold Alert: ${finalWasteType} Waste`,
          `Total ${finalWasteType} waste accumulated has reached ${categoryTotalWeight.toFixed(1)} Tons, exceeding the set limit of ${categoryLimit} Tons. Please initiate decomposition & processing immediately!`,
          'warning'
        );
      }
    }

    res.json({ message: 'Waste collection recorded and updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------
// MODULE 4: Vehicle & Transport Management
// ----------------------------------------------------

app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const vehicles = await db.findMany('vehicles');
    const populated = await Promise.all(vehicles.map(async v => {
      const driver = await db.findOne('users', u => u.id === v.driverId);
      return {
        ...v,
        driverName: driver ? driver.name : 'Unassigned'
      };
    }));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/vehicles', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const { licensePlate, type, capacity, driverId } = req.body;

    if (!licensePlate || !licensePlate.trim() || !type || !capacity) {
      return res.status(400).json({ message: 'License plate, vehicle type, and capacity are required.' });
    }

    const cap = parseFloat(capacity);
    if (isNaN(cap) || cap <= 0) {
      return res.status(400).json({ message: 'Vehicle capacity must be a positive number.' });
    }

    const existingVeh = await db.findOne('vehicles', v => v.licensePlate.toLowerCase() === licensePlate.trim().toLowerCase());
    if (existingVeh) {
      return res.status(400).json({ message: 'A vehicle with this license plate already exists.' });
    }

    const newVehicle = await db.insert('vehicles', {
      licensePlate: licensePlate.trim().toUpperCase(),
      type,
      capacity: cap,
      status: 'Active',
      driverId: driverId || null
    });

    await logActivity(req.user.id, 'Create Vehicle', `Admin added vehicle "${licensePlate}" (Type: ${type}, Capacity: ${capacity}t).`);

    res.status(201).json(newVehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mock GPS tracking route coordinates for visual mapping
app.get('/api/vehicles/:id/track', authenticateToken, async (req, res) => {
  try {
    const vehicle = await db.findOne('vehicles', v => v.id === req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // Create simulated routes
    const time = Date.now() / 10000;
    const lat = 12.9716 + 0.015 * Math.sin(time);
    const lng = 77.5946 + 0.015 * Math.cos(time);

    res.json({
      vehicleId: vehicle.id,
      licensePlate: vehicle.licensePlate,
      latitude: lat,
      longitude: lng,
      speed: '25 km/h',
      heading: 'North-East',
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update vehicle live GPS location (Driver endpoint)
app.put('/api/vehicles/:id/location', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const vehicle = await db.findOne('vehicles', v => v.id === req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    if (req.user.role === 'Driver' && vehicle.driverId !== req.user.id) {
      return res.status(403).json({ message: 'Vehicle not assigned to you' });
    }

    const updated = await db.update('vehicles', req.params.id, {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      lastUpdated: new Date().toISOString()
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------
// MODULE 6 & 7: Waste Processing & Plant Management
// ----------------------------------------------------

app.get('/api/plants', authenticateToken, async (req, res) => {
  try {
    res.json(await db.findMany('plants'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/plants', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const { name, location, capacity, type } = req.body;

    if (!name || !name.trim() || !location || !location.trim() || !capacity || !type) {
      return res.status(400).json({ message: 'Plant name, location, capacity, and type are required.' });
    }

    const cap = parseFloat(capacity);
    if (isNaN(cap) || cap <= 0) {
      return res.status(400).json({ message: 'Plant capacity must be a positive number greater than 0.' });
    }

    const newPlant = await db.insert('plants', {
      name: name.trim(),
      location: location.trim(),
      capacity: cap,
      currentLoad: 0.0,
      type,
      status: 'Active'
    });

    await logActivity(req.user.id, 'Create Plant', `Admin added processing plant "${name}" (Type: ${type}, Capacity: ${capacity}t).`);

    res.status(201).json(newPlant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Plant Operator receives waste load from driver and creates Segregation/Recycling records
app.post('/api/plants/:plantId/deliveries', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Operator') return res.status(403).json({ message: 'Forbidden' });
  try {
    const plantId = req.params.plantId;
    const { requestId, organicWeight, recyclableWeight, residualWeight } = req.body;

    if (!requestId || organicWeight === undefined || recyclableWeight === undefined || residualWeight === undefined) {
      return res.status(400).json({ message: 'Required details missing' });
    }

    const reqObj = await db.findOne('requests', r => r.id === requestId);
    if (!reqObj) return res.status(404).json({ message: 'Request not found' });

    const plant = await db.findOne('plants', p => p.id === plantId);
    if (!plant) return res.status(404).json({ message: 'Processing plant not found' });

    const totalWeight = parseFloat(organicWeight) + parseFloat(recyclableWeight) + parseFloat(residualWeight);

    // Check if plant capacity is exceeded
    if (plant.currentLoad + totalWeight > plant.capacity) {
      return res.status(400).json({ message: `Delivery exceeds plant available capacity. Max remaining is ${plant.capacity - plant.currentLoad} tons.` });
    }

    // Update Plant current Load
    await db.update('plants', plantId, {
      currentLoad: Math.round((plant.currentLoad + totalWeight) * 100) / 100
    });

    // Create Delivery Dump record
    const delivery = await db.insert('plantDeliveries', {
      requestId,
      plantId,
      driverId: reqObj.assignedDriverId,
      weight: totalWeight,
      status: 'Completed',
      segregationInfo: {
        organicWeight: parseFloat(organicWeight),
        recyclableWeight: parseFloat(recyclableWeight),
        residualWeight: parseFloat(residualWeight)
      },
      recyclingTally: parseFloat(recyclableWeight),
      approvedByOperator: req.user.id,
      approvedAt: new Date().toISOString()
    });

    // Update Request status to "Completed"
    await db.update('requests', requestId, {
      status: 'Completed'
    });

    // Notify Generator
    await createNotification(
      reqObj.generatorId,
      'Waste Recycled',
      `Your request ${requestId} has been processed at ${plant.name}. Segregated ${recyclableWeight} tons of recyclable waste!`,
      'success'
    );

    res.status(201).json({ message: 'Delivery recorded, waste segregated, and request completed.', delivery });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/plants/deliveries', authenticateToken, async (req, res) => {
  try {
    const deliveries = await db.findMany('plantDeliveries');
    const populated = await Promise.all(deliveries.map(async d => {
      const plant = await db.findOne('plants', p => p.id === d.plantId);
      const reqObj = await db.findOne('requests', r => r.id === d.requestId);
      const driver = await db.findOne('users', u => u.id === d.driverId);
      return {
        ...d,
        plantName: plant ? plant.name : 'Unknown',
        wasteType: reqObj ? reqObj.wasteType : 'Unknown',
        driverName: driver ? driver.name : 'Unknown'
      };
    }));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------
// MODULE 8: Billing & Payments (Razorpay Simulator)
// ----------------------------------------------------

app.post('/api/payments/:requestId/pay', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Generator') return res.status(403).json({ message: 'Forbidden' });
  try {
    const requestId = req.params.requestId;
    const { paymentMethod, transactionId } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

    const reqObj = await db.findOne('requests', r => r.id === requestId && r.generatorId === req.user.id);
    if (!reqObj) return res.status(404).json({ message: 'Request not found' });

    if (reqObj.paymentStatus === 'Paid') {
      return res.status(400).json({ message: 'Request has already been paid' });
    }

    // Record payment in the database
    const updatedReq = await db.update('requests', requestId, {
      paymentStatus: 'Paid',
      paymentDetails: {
        paymentMethod,
        transactionId: transactionId || `pay_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        paidAt: new Date().toISOString()
      }
    });

    // Notify user and admins
    await createNotification(req.user.id, 'Payment Received', `Your payment of ₹${reqObj.amount} was received via Razorpay (Key: rzp_test_SC7GZQVzAK7jRK). Invoice generated.`, 'success');

    const admins = await db.findMany('users', u => u.role === 'Admin');
    for (const admin of admins) {
      await createNotification(admin.id, 'Revenue Collected', `Generator paid ₹${reqObj.amount} via Razorpay for request ${requestId}.`, 'info');
    }

    res.json({ message: 'Payment successful', request: updatedReq });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------
// MODULE 9: Complaints & Tickets
// ----------------------------------------------------

app.post('/api/complaints', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Generator') return res.status(403).json({ message: 'Forbidden' });
  try {
    const { requestId, title, description } = req.body;

    if (!requestId || !title || !title.trim() || !description || !description.trim()) {
      return res.status(400).json({ message: 'Request ID, ticket title, and detailed description are required.' });
    }

    if (title.trim().length < 3) {
      return res.status(400).json({ message: 'Complaint title must be at least 3 characters long.' });
    }

    if (description.trim().length < 5) {
      return res.status(400).json({ message: 'Detailed description must be at least 5 characters long.' });
    }

    const reqObj = await db.findOne('requests', r => r.id === requestId && r.generatorId === req.user.id);
    if (!reqObj) return res.status(404).json({ message: 'Selected pickup request not found under your account.' });

    const complaint = await db.insert('complaints', {
      generatorId: req.user.id,
      requestId,
      title: title.trim(),
      description: description.trim(),
      status: 'Open',
      resolutionText: '',
      createdAt: new Date().toISOString()
    });

    // Update request object association
    await db.update('requests', requestId, { complaintId: complaint.id });

    // Notify admins
    const admins = await db.findMany('users', u => u.role === 'Admin');
    for (const admin of admins) {
      await createNotification(admin.id, 'New Complaint Ticket Raised', `Generator raised complaint on request ${requestId}: "${title}"`, 'warning');
    }

    res.status(201).json(complaint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/complaints', authenticateToken, async (req, res) => {
  try {
    let complaints = [];
    if (req.user.role === 'Generator') {
      complaints = await db.findMany('complaints', c => c.generatorId === req.user.id);
    } else {
      complaints = await db.findMany('complaints');
    }

    // Populate generator name
    const populated = await Promise.all(complaints.map(async c => {
      const gen = await db.findOne('users', u => u.id === c.generatorId);
      return {
        ...c,
        generatorName: gen ? gen.name : 'Unknown'
      };
    }));

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/complaints/:id/resolve', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const complaintId = req.params.id;
    const { resolutionText } = req.body;

    if (!resolutionText) {
      return res.status(400).json({ message: 'Resolution message is required' });
    }

    const comp = await db.findOne('complaints', c => c.id === complaintId);
    if (!comp) return res.status(404).json({ message: 'Complaint not found' });

    await db.update('complaints', complaintId, {
      status: 'Resolved',
      resolutionText
    });

    await createNotification(comp.generatorId, 'Complaint Resolved', `Support Ticket "${comp.title}" has been marked as resolved: "${resolutionText}"`, 'success');

    res.json({ message: 'Complaint ticket updated and resolved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------
// MODULE 10: Driver Leave Management
// ----------------------------------------------------

// Driver submits leave request with reason & optional prescription document
app.post('/api/driver/leaves', authenticateToken, upload.single('prescription'), async (req, res) => {
  if (req.user.role !== 'Driver') return res.status(403).json({ message: 'Forbidden' });
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Start date, end date, and reason are required for leave submission.' });
    }

    const prescriptionDoc = req.file ? req.file.filename : null;
    if (leaveType === 'Medical' && !prescriptionDoc) {
      return res.status(400).json({ message: 'Medical leave requires a medical prescription document attachment.' });
    }

    const driverUser = await db.findOne('users', u => u.id === req.user.id);
    const newLeave = await db.insert('driverLeaves', {
      driverId: req.user.id,
      driverName: driverUser ? driverUser.name : 'Driver',
      leaveType: leaveType || 'Casual',
      startDate,
      endDate,
      reason,
      prescriptionDoc,
      status: 'Pending',
      submittedAt: new Date().toISOString()
    });

    // Notify Admins
    const admins = await db.findMany('users', u => u.role === 'Admin');
    for (const admin of admins) {
      await createNotification(admin.id, 'New Driver Leave Request', `Driver ${driverUser ? driverUser.name : 'John'} submitted a ${leaveType || 'Casual'} leave request (${startDate} to ${endDate}) for approval.`, 'warning');
    }

    res.status(201).json({ message: 'Leave request submitted successfully. Awaiting Admin approval.', leave: newLeave });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leaves (Drivers see their own; Admins see all)
app.get('/api/driver/leaves', authenticateToken, async (req, res) => {
  try {
    let leaves = [];
    if (req.user.role === 'Admin') {
      leaves = (await db.findMany('driverLeaves')) || [];
    } else if (req.user.role === 'Driver') {
      leaves = (await db.findMany('driverLeaves', l => l.driverId === req.user.id)) || [];
    } else {
      return res.json([]);
    }
    leaves.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    res.json(leaves);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// Admin approves or rejects driver leave request
app.post('/api/admin/leaves/:id/review', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const leaveId = req.params.id;
    const { status, adminComment } = req.body; // status: 'Approved' | 'Rejected'

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (Approved/Rejected) is required' });
    }

    const leave = await db.findOne('driverLeaves', l => l.id === leaveId);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    const updatedLeave = await db.update('driverLeaves', leaveId, {
      status,
      adminComment: adminComment || '',
      reviewedAt: new Date().toISOString()
    });

    // Notify Driver
    await createNotification(
      leave.driverId, 
      `Leave Request ${status}`, 
      `Your leave application from ${leave.startDate} to ${leave.endDate} has been ${status.toLowerCase()} by Admin.${adminComment ? ` Remark: ${adminComment}` : ''}`, 
      status === 'Approved' ? 'success' : 'danger'
    );

    res.json({ message: `Leave request marked as ${status}`, leave: updatedLeave });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------
// MODULE 11: In-App Alerts & Notifications
// ----------------------------------------------------

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifs = await db.findMany('notifications', n => n.userId === req.user.id);
    // Sort descending by date
    notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(notifs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const notifs = await db.findMany('notifications', n => n.userId === req.user.id);
    for (const n of notifs) {
      await db.update('notifications', n.id, { read: true });
    }
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------
// MODULE 12: Analytics & Reporting
// ----------------------------------------------------

app.get('/api/analytics/summary', authenticateToken, async (req, res) => {
  try {
    // Collect system summaries for admins
    const requests = await db.findMany('requests');
    const plants = await db.findMany('plants');
    const vehicles = await db.findMany('vehicles');
    const deliveries = await db.findMany('plantDeliveries');

    const totalWasteCollected = requests
      .filter(r => r.status === 'Completed' || r.status === 'Collected')
      .reduce((sum, r) => sum + (r.weight || r.wasteQuantity), 0);

    const totalRevenue = requests
      .filter(r => r.paymentStatus === 'Paid')
      .reduce((sum, r) => sum + r.amount, 0);

    const pendingRequests = requests.filter(r => r.status === 'Pending').length;
    const activeVehicles = vehicles.filter(v => v.status === 'Active').length;

    // Monthly stats mockup for charts
    const monthlyStats = [
      { name: 'Jan', waste: 24, revenue: 1200 },
      { name: 'Feb', waste: 30, revenue: 1500 },
      { name: 'Mar', waste: 45, revenue: 2200 },
      { name: 'Apr', waste: 50, revenue: 2500 },
      { name: 'May', waste: 65, revenue: 3200 },
      { name: 'Jun', waste: Math.round(totalWasteCollected * 10) / 10, revenue: totalRevenue }
    ];

    // Plant capacity rates
    const plantCapacityRates = plants.map(p => ({
      name: p.name,
      capacity: p.capacity,
      currentLoad: p.currentLoad,
      percent: Math.round((p.currentLoad / p.capacity) * 100)
    }));

    // Segregation percentages
    let totalOrganic = 0;
    let totalRecyclable = 0;
    let totalResidual = 0;
    deliveries.forEach(d => {
      if (d.segregationInfo) {
        totalOrganic += d.segregationInfo.organicWeight || 0;
        totalRecyclable += d.segregationInfo.recyclableWeight || 0;
        totalResidual += d.segregationInfo.residualWeight || 0;
      }
    });

    const segregationStats = [
      { name: 'Organic', value: parseFloat(totalOrganic.toFixed(2)) },
      { name: 'Recyclable', value: parseFloat(totalRecyclable.toFixed(2)) },
      { name: 'Residual/Landfill', value: parseFloat(totalResidual.toFixed(2)) }
    ];

    res.json({
      metrics: {
        totalWasteCollected: Math.round(totalWasteCollected * 10) / 10,
        totalRevenue,
        pendingRequests,
        activeVehicles
      },
      monthlyStats,
      plantCapacityRates,
      segregationStats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----------------------------------------------------
// MODULE 13: OLX Marketplace (Items & Listings)
// ----------------------------------------------------

// Get all listed items (Public or Authenticated)
app.get('/api/marketplace/items', async (req, res) => {
  try {
    let items = (await db.findMany('marketplaceItems')) || [];
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// Add new marketplace item (Admin only)
app.post('/api/marketplace/items', authenticateToken, upload.single('image'), async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Forbidden: Only administrators can list items on the OLX Marketplace.' });
  }
  try {
    const { title, category, price, location, condition, description, contactPhone } = req.body;

    if (!title || !title.trim() || !category || !price || !location || !location.trim()) {
      return res.status(400).json({ message: 'Title, category, price, and location are required.' });
    }

    const itemPrice = parseFloat(price);
    if (isNaN(itemPrice) || itemPrice < 0) {
      return res.status(400).json({ message: 'Price must be a valid non-negative number.' });
    }

    const imageUrl = req.file 
      ? `http://localhost:5000/uploads/${req.file.filename}` 
      : (req.body.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60');

    const newItem = await db.insert('marketplaceItems', {
      sellerId: req.user.id,
      sellerName: req.user.name || 'Admin Seller',
      sellerRole: req.user.role,
      title: title.trim(),
      category: category || 'Electronics',
      price: itemPrice,
      location: location.trim(),
      condition: condition || 'Used - Like New',
      description: description ? description.trim() : 'No additional description provided.',
      contactPhone: contactPhone ? contactPhone.trim() : '+91 9876543210',
      imageUrl,
      status: 'Available',
      createdAt: new Date().toISOString()
    });

    await logActivity(req.user.id, 'Create Marketplace Item', `Listed item "${title}" for ₹${itemPrice} in category ${category}.`);

    res.status(201).json({ message: 'Item listed successfully on Marketplace!', item: newItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete/Remove marketplace item (Admin or Seller)
app.delete('/api/marketplace/items/:id', authenticateToken, async (req, res) => {
  try {
    const itemId = req.params.id;
    const item = await db.findOne('marketplaceItems', i => i.id === itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (req.user.role !== 'Admin' && item.sellerId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.delete('marketplaceItems', itemId);
    res.json({ message: 'Item removed from Marketplace.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Server Initialization
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Bulk Waste API server is running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
