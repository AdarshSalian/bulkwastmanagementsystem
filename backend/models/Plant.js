const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true },
  currentLoad: { type: Number, default: 0 },
  type: { type: String, required: true },
  status: { type: String, default: 'Active', enum: ['Active', 'Inactive'] }
}, { timestamps: true, _id: false });

module.exports = mongoose.model('Plant', plantSchema);
