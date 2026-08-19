const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ['Admin', 'Generator', 'Driver', 'Operator'] },
  name: { type: String, required: true },
  contact: { type: String, default: '' },
  email: { type: String, required: true },
  organizationName: { type: String },
  status: { type: String, default: 'active', enum: ['active', 'pending', 'suspended'] },
  docs: { type: [String], default: [] }
}, { timestamps: true, _id: false });

module.exports = mongoose.model('User', userSchema);
