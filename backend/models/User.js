const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ['Admin', 'Generator', 'Driver', 'Operator'] },
  driverType: { type: String, enum: ['Dry', 'Wet', 'Both'], default: 'Both' },
  name: { type: String, required: true },
  contact: { type: String, default: '' },
  email: { type: String, required: true },
  organizationName: { type: String },
  propertyRelationship: { type: String, default: 'Owner / Property Head' },
  propertyHeadName: { type: String, default: '' },
  propertyHeadContact: { type: String, default: '' },
  authorizationLetterDoc: { type: String, default: '' },
  authorizationLetterNote: { type: String, default: '' },
  status: { type: String, default: 'active', enum: ['active', 'pending', 'suspended'] },
  docs: { type: [String], default: [] }
}, { timestamps: true, _id: false });

module.exports = mongoose.model('User', userSchema);
