const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  type: { type: String, required: true },
  details: { type: String, default: '' },
  relationship: { type: String, default: 'Owner / Property Head' },
  propertyHeadName: { type: String, default: '' },
  propertyHeadContact: { type: String, default: '' },
  authorizationLetterDoc: { type: String, default: '' },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null }
}, { timestamps: true, _id: false });

module.exports = mongoose.model('Property', propertySchema);
