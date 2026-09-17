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
    activities: [],
    payments: [
      { id: 'pay-seed-1', requestId: 'req-1', timestamp: '2026-06-20T10:30:00Z', date: '2026-06-20', time: '10:30 AM', payerName: 'Greenwood Residential Society (Generator)', payerId: 'user-generator', payeeName: 'BulkWaste Management Hub', payeeId: 'user-admin', amount: 270, paymentMethod: 'UPI', transactionId: 'pay_tx_123456', transactionType: 'Food Waste Pickup Fee (User -> Admin)', wasteType: 'Organic', status: 'Paid' }
    ],
    marketplaceItems: [
      {
        id: 'item-mkt-1',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Industrial Waste Compactor & Baler Press Machine',
        category: 'Equipment',
        price: 45000,
        location: 'Malpe Industrial Area, Udupi',
        condition: 'Refurbished',
        description: 'Heavy duty 15-Ton hydraulic compactor press baler suitable for compressing cardboard, plastic bottles, and metal scrap. High efficiency electric motor.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T10:00:00.000Z'
      },
      {
        id: 'item-mkt-2',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Bulk Recyclable PET Bottle Bales (5 Tons Lot)',
        category: 'Recyclables',
        price: 18500,
        location: 'City Recycling Hub, North Ring Road',
        condition: 'Used - Like New',
        description: 'Bales of sorted, cleaned, and crushed clear transparent PET bottles. Ready for immediate transport to plastic processing plants.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T10:15:00.000Z'
      },
      {
        id: 'item-mkt-3',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Commercial Organic Waste Composter (100 Kg/Day)',
        category: 'Equipment',
        price: 65000,
        location: 'Manipal Campus Zone, Udupi',
        condition: 'Used - Like New',
        description: 'Automatic aerobic food waste composter with built-in shredder and bio-filter odor control system. Converts organic waste into compost in 24 hours.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T10:30:00.000Z'
      },
      {
        id: 'item-mkt-4',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Electric Cargo Loader 3-Wheeler Trike Vehicle',
        category: 'Vehicles',
        price: 38000,
        location: 'Brahmavar Highway Depot, Udupi',
        condition: 'Used - Good',
        description: 'Battery powered electric scrap & waste collection 3-wheeler with hydraulic drop-side open tipper bed. Range 90km per charge.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T10:45:00.000Z'
      },
      {
        id: 'item-mkt-5',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Scrap Heavy Copper & Aluminium Wire Lot (250 Kg)',
        category: 'Recyclables',
        price: 12000,
        location: 'Katapadi Scrap Yard, Udupi',
        condition: 'Used - Good',
        description: 'High purity stripped heavy copper wiring and industrial alloy extrusions. High grade material for foundry smelting or recycling.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T11:00:00.000Z'
      },
      {
        id: 'item-mkt-6',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Enterprise Server Racks & E-Waste Computer Lot',
        category: 'Electronics',
        price: 28000,
        location: 'Manipal IT Park, Udupi',
        condition: 'Refurbished',
        description: 'Dual Intel Xeon server rack units with power supply modules and network switches. Ideal for IT lab setups or electronic scrap recovery.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T11:15:00.000Z'
      },
      {
        id: 'item-mkt-7',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Heavy Duty Industrial Euro Hardwood Pallets (50 Pcs)',
        category: 'Furniture',
        price: 9500,
        location: 'Malpe Port Warehouse Hub, Udupi',
        condition: 'Used - Good',
        description: 'Standard 4-way entry solid oak & pine Euro pallets in sturdy reusable condition for logistics warehouse or rustic DIY furniture.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T11:30:00.000Z'
      },
      {
        id: 'item-mkt-8',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Stainless Steel Grade 304 Scrap Containers (4 Units)',
        category: 'Equipment',
        price: 22000,
        location: 'Kaup Industrial Zone, Udupi',
        condition: 'Used - Like New',
        description: '500-Liter heavy duty SS-304 mobile waste storage hoppers with heavy swivel casters and overhead crane hooks.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T11:45:00.000Z'
      },
      {
        id: 'item-mkt-9',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Commercial Solar Power Inverter & Deep Cycle Battery Bank (5 kVA)',
        category: 'Electronics',
        price: 32000,
        location: 'Brahmavar Green Energy Park, Udupi',
        condition: 'Used - Like New',
        description: 'Pure sine wave 5kVA hybrid solar inverter with 4 tubular 150Ah solar batteries in excellent functional health. Ideal for eco plant backup.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:00:00.000Z'
      },
      {
        id: 'item-mkt-10',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Crushed Glass Cullet & Bottle Scrap Lot (3 Tons)',
        category: 'Recyclables',
        price: 7500,
        location: 'Padubidri Recycling Yard, Udupi',
        condition: 'Brand New',
        description: 'Color-sorted flint and amber crushed glass cullet ready for furnace remelting or terrazzo abrasive aggregate manufacturing.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:05:00.000Z'
      },
      {
        id: 'item-mkt-11',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Heavy Duty Industrial Waste Tire & Rubber Shredder (5 HP)',
        category: 'Equipment',
        price: 55000,
        location: 'Malpe Industrial Phase 2, Udupi',
        condition: 'Refurbished',
        description: 'Dual shaft high-torque rotary rubber shredder machine for scrap tires, conveyor belts, and rigid plastics.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:10:00.000Z'
      },
      {
        id: 'item-mkt-12',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Upcycled Executive Ergonomic Mesh Office Chairs (Set of 6)',
        category: 'Furniture',
        price: 14000,
        location: 'Manipal Commercial Complex, Udupi',
        condition: 'Used - Like New',
        description: 'Commercial grade hydraulic height-adjustable swivel chairs with lumbar support and breathable mesh backrests.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1580481077197-2a44d5c328d7?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:15:00.000Z'
      },
      {
        id: 'item-mkt-13',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'E-Waste Laptop & IPS Display Computer Lot (15 Units)',
        category: 'Electronics',
        price: 35000,
        location: 'Manipal IT Park Building 3, Udupi',
        condition: 'Used - Good',
        description: 'Tested Core i5 business laptops and 24-inch full HD IPS monitors decommissioned from software firm. Great for refurbishment or precious metal scrap.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:20:00.000Z'
      },
      {
        id: 'item-mkt-14',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Compressed Corrugated Cardboard Scrap Bales (4 Tons)',
        category: 'Recyclables',
        price: 9800,
        location: 'Santhekatte Logistics Depot, Udupi',
        condition: 'Brand New',
        description: 'Clean, sorted corrugated OCC kraft cardboard paper baled and strapped with steel wire. Moisture-free warehouse stored.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:25:00.000Z'
      },
      {
        id: 'item-mkt-15',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Hydraulic Utility Tipper Tractor Trailer Attachment',
        category: 'Vehicles',
        price: 42000,
        location: 'Kalyanpura Agri & Transport Yard, Udupi',
        condition: 'Used - Good',
        description: '3-Ton hydraulic tipping agricultural and waste trailer with heavy duty leaf spring suspension and reinforced steel walls.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:30:00.000Z'
      },
      {
        id: 'item-mkt-16',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Heavy Duty Industrial Plastic HDPE Barrels (200L, 20 Pcs)',
        category: 'Equipment',
        price: 8000,
        location: 'Kaup Chemical Hub, Udupi',
        condition: 'Used - Like New',
        description: 'High density food grade polyethylene blue drums with air-tight locking ring lids. Cleaned and pressure tested.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:35:00.000Z'
      },
      {
        id: 'item-mkt-17',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Cast Iron Machinery Scrap & Engine Block Lot (1.5 Ton)',
        category: 'Recyclables',
        price: 26000,
        location: 'Katapadi Heavy Scrap Yard, Udupi',
        condition: 'Used - Good',
        description: 'Clean degreased cast iron vehicle engine blocks and industrial heavy machine housings. High quality heavy melting scrap (HMS-1).',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:40:00.000Z'
      },
      {
        id: 'item-mkt-18',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Commercial High-Pressure Fleet Washer Jet (250 Bar, 3-Phase)',
        category: 'Equipment',
        price: 19500,
        location: 'Malpe Fleet Maintenance Depot, Udupi',
        condition: 'Used - Like New',
        description: 'Industrial triplex ceramic plunger pressure washer with 15m steel braided hose and turbo nozzle for compactor truck sanitization.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:45:00.000Z'
      },
      {
        id: 'item-mkt-19',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Heavy Duty Modular Steel Pallet Racking Units (4 Bays)',
        category: 'Furniture',
        price: 16500,
        location: 'City Recycling Warehouse, North Outer Road',
        condition: 'Used - Good',
        description: 'Powder coated heavy gauge industrial upright beams and shelves. Max load capacity 2500kg per tier.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:50:00.000Z'
      },
      {
        id: 'item-mkt-20',
        sellerId: 'user-admin',
        sellerName: 'System Administrator',
        sellerRole: 'Admin',
        title: 'Interlocking Recycled Rubber Anti-Fatigue Gym Tiles (40 Pcs)',
        category: 'Recyclables',
        price: 11000,
        location: 'Manipal Sports Zone, Udupi',
        condition: 'Brand New',
        description: 'High density shock absorbing 20mm vulcanized crumb rubber flooring mats made from 100% recycled scrap tires.',
        contactPhone: '+91 9876543210',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop&q=60',
        status: 'Available',
        createdAt: '2026-09-16T12:55:00.000Z'
      }
    ]
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
