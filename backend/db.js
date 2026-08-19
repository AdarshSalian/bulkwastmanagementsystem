require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Determine Mode ───────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI;
const USE_MONGO = MONGO_URI && !MONGO_URI.includes('<username>') && !MONGO_URI.includes('<password>') && !MONGO_URI.includes('<cluster>');

// ─── JSON File Database (Fallback) ───────────────────────────────────────────

const DB_FILE = path.join(__dirname, 'data', 'db.json');

function ensureDirExists() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function getSeedData() {
  const salt = await bcrypt.genSalt(10);
  const hashAdmin = await bcrypt.hash('admin', salt);
  const hashPassword = await bcrypt.hash('password', salt);
  return {
    users: [
      { id: 'user-admin', username: 'admin', passwordHash: hashAdmin, role: 'Admin', name: 'System Administrator', contact: '+1 555-0100', email: 'admin@bulkways.com', status: 'active' },
      { id: 'user-generator', username: 'generator', passwordHash: hashPassword, role: 'Generator', name: 'Greenwood Residential Society', organizationName: 'Greenwood RWA', contact: '+1 555-0199', email: 'greenwood@society.com', status: 'active' },
      { id: 'user-generator2', username: 'pending_generator', passwordHash: hashPassword, role: 'Generator', name: 'Skyline Commercial Mall', organizationName: 'Skyline Properties', contact: '+1 555-0155', email: 'skyline@commercial.com', status: 'pending', docs: ['license.pdf'] },
      { id: 'user-driver', username: 'driver', passwordHash: hashPassword, role: 'Driver', name: 'John Doe (Transporter)', contact: '+1 555-0122', email: 'john.driver@bulkways.com', status: 'active' },
      { id: 'user-driver2', username: 'driver2', passwordHash: hashPassword, role: 'Driver', name: 'Jane Smith (Transporter)', contact: '+1 555-0123', email: 'jane.driver@bulkways.com', status: 'active' },
      { id: 'user-operator', username: 'operator', passwordHash: hashPassword, role: 'Operator', name: 'Alex Mercer (Operator)', contact: '+1 555-0188', email: 'alex.operator@bulkways.com', status: 'active' }
    ],
    properties: [{ id: 'prop-1', userId: 'user-generator', name: 'Greenwood Society Phase 1', address: '100 Green Avenue, Sector 4', type: 'Residential', details: '300 residential apartments' }],
    vehicles: [
      { id: 'veh-1', licensePlate: 'TRK-9844', type: 'Compactor', capacity: 10, status: 'Active', driverId: 'user-driver' },
      { id: 'veh-2', licensePlate: 'TRK-4422', type: 'Dumper', capacity: 15, status: 'Active', driverId: 'user-driver2' }
    ],
    plants: [
      { id: 'plant-1', name: 'Metro Eco Composting Plant', location: 'Industrial Area Phase 2', capacity: 50, currentLoad: 12.5, type: 'Composting', status: 'Active' },
      { id: 'plant-2', name: 'City Core Recycling & Segregation Hub', location: 'North Outer Ring Road', capacity: 80, currentLoad: 24.0, type: 'Recycling', status: 'Active' }
    ],
    requests: [
      { id: 'req-1', generatorId: 'user-generator', propertyId: 'prop-1', wasteType: 'Organic', wasteQuantity: 5.5, status: 'Completed', scheduledDate: '2026-06-20', assignedDriverId: 'user-driver', assignedVehicleId: 'veh-1', weight: 5.4, amount: 270, paymentStatus: 'Paid', paymentDetails: { paymentMethod: 'UPI', transactionId: 'pay_tx_123456', paidAt: '2026-06-20T10:30:00Z' }, complaintId: null, createdAt: '2026-06-18T09:00:00Z' },
      { id: 'req-2', generatorId: 'user-generator', propertyId: 'prop-1', wasteType: 'Recyclable', wasteQuantity: 3.0, status: 'Pending', scheduledDate: '2026-06-25', assignedDriverId: null, assignedVehicleId: null, weight: 0, amount: 150, paymentStatus: 'Unpaid', paymentDetails: null, complaintId: null, createdAt: '2026-06-23T14:30:00Z' }
    ],
    plantDeliveries: [{ id: 'del-1', requestId: 'req-1', plantId: 'plant-1', driverId: 'user-driver', weight: 5.4, status: 'Completed', segregationInfo: { organicWeight: 4.8, recyclableWeight: 0.4, residualWeight: 0.2 }, recyclingTally: 0.4, approvedByOperator: 'user-operator', approvedAt: '2026-06-20T12:00:00Z' }],
    complaints: [{ id: 'comp-1', generatorId: 'user-generator', requestId: 'req-1', title: 'Delayed Pickup Time', description: 'The driver arrived 2 hours later than the scheduled time window.', status: 'Resolved', resolutionText: 'Apologies for the delay. Traffic congestion on Route 4 caused the driver to fall behind.', createdAt: '2026-06-20T14:00:00Z' }],
    notifications: [{ id: 'notif-1', userId: 'user-generator', title: 'Pickup Completed', message: 'Your waste pickup request req-1 has been successfully completed.', type: 'success', read: false, createdAt: '2026-06-20T12:05:00Z' }],
    activities: []
  };
}

class JsonDatabase {
  constructor() { this.data = null; }

  async init() {
    ensureDirExists();
    if (!fs.existsSync(DB_FILE)) {
      console.log('Seeding initial JSON data...');
      const seed = await getSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
      this.data = seed;
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading DB file, re-seeding...', err);
        const seed = await getSeedData();
        fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
        this.data = seed;
      }
    }
  }

  save() { ensureDirExists(); fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2)); }

  getCollection(name) {
    if (!this.data) throw new Error('Database not initialized');
    if (!this.data[name]) this.data[name] = [];
    return this.data[name];
  }

  async insert(name, item) {
    const col = this.getCollection(name);
    const id = item.id || item._id || `${name.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newItem = { ...item, id };
    col.push(newItem);
    this.save();
    return newItem;
  }

  async update(name, id, updates) {
    const col = this.getCollection(name);
    const idx = col.findIndex(x => x.id === id);
    if (idx === -1) return null;
    col[idx] = { ...col[idx], ...updates };
    this.save();
    return col[idx];
  }

  async delete(name, id) {
    const col = this.getCollection(name);
    const idx = col.findIndex(x => x.id === id);
    if (idx === -1) return false;
    col.splice(idx, 1);
    this.save();
    return true;
  }

  async findOne(name, predicate) {
    const col = this.getCollection(name);
    if (!predicate) return col[0] || null;
    return col.find(predicate) || null;
  }

  async findMany(name, predicate) {
    const col = this.getCollection(name);
    if (!predicate) return [...col];
    return col.filter(predicate);
  }
}

// ─── MongoDB Database ─────────────────────────────────────────────────────────

const User = require('./models/User');
const Property = require('./models/Property');
const Vehicle = require('./models/Vehicle');
const Plant = require('./models/Plant');
const Request = require('./models/Request');
const PlantDelivery = require('./models/PlantDelivery');
const Complaint = require('./models/Complaint');
const Notification = require('./models/Notification');
const Activity = require('./models/Activity');

const MODELS = {
  users: User, properties: Property, vehicles: Vehicle, plants: Plant,
  requests: Request, plantDeliveries: PlantDelivery, complaints: Complaint,
  notifications: Notification, activities: Activity
};

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function seedIfEmpty(seedData) {
  for (const [col, docs] of Object.entries(seedData)) {
    const Model = MODELS[col];
    if (!Model || !docs.length) continue;
    const count = await Model.countDocuments();
    if (count === 0) {
      await Model.insertMany(docs);
      console.log(`  Seeded ${docs.length} doc(s) → '${col}'`);
    }
  }
}

class MongoDatabase {
  async init() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully.');
    const seed = await getSeedData();
    // Map id → _id for MongoDB seed
    for (const col of Object.keys(seed)) {
      seed[col] = seed[col].map(d => ({ ...d, _id: d.id || d._id }));
    }
    await seedIfEmpty(seed);
    console.log('Database initialisation complete.');
  }

  _model(name) {
    const M = MODELS[name];
    if (!M) throw new Error(`Unknown collection: ${name}`);
    return M;
  }

  async insert(name, item) {
    const M = this._model(name);
    const _id = item.id || item._id || generateId(name.slice(0, 3));
    const doc = await M.create({ ...item, _id });
    const obj = doc.toObject();
    obj.id = obj._id;
    return obj;
  }

  async update(name, id, updates) {
    const M = this._model(name);
    const doc = await M.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: false });
    if (!doc) return null;
    const obj = doc.toObject();
    obj.id = obj._id;
    return obj;
  }

  async delete(name, id) {
    const M = this._model(name);
    return !!(await M.findByIdAndDelete(id));
  }

  async findOne(name, predicate) {
    const M = this._model(name);
    const docs = (await M.find().lean()).map(d => ({ ...d, id: d._id }));
    return predicate ? (docs.find(predicate) || null) : (docs[0] || null);
  }

  async findMany(name, predicate) {
    const M = this._model(name);
    const docs = (await M.find().lean()).map(d => ({ ...d, id: d._id }));
    return predicate ? docs.filter(predicate) : docs;
  }
}

// ─── Export the right DB based on config ─────────────────────────────────────
const db = USE_MONGO ? new MongoDatabase() : new JsonDatabase();

if (!USE_MONGO) {
  console.log('ℹ️  MONGODB_URI not configured — using local JSON file database.');
  console.log('   To switch to MongoDB, update MONGODB_URI in backend/.env');
}

module.exports = db;
