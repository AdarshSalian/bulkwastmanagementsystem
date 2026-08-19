const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  _id: { type: String },
  licensePlate: { type: String, required: true },
  type: { type: String, required: true },
  capacity: { type: Number, required: true },
  status: { type: String, default: 'Active', enum: ['Active', 'Inactive', 'Maintenance'] },
  driverId: { type: String, default: null }
}, { timestamps: true, _id: false });

module.exports = mongoose.model('Vehicle', vehicleSchema);
