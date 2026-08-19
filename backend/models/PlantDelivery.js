const mongoose = require('mongoose');

const plantDeliverySchema = new mongoose.Schema({
  _id: { type: String },
  requestId: { type: String, required: true },
  plantId: { type: String, required: true },
  driverId: { type: String },
  weight: { type: Number, required: true },
  status: { type: String, default: 'Completed' },
  segregationInfo: {
    organicWeight: { type: Number, default: 0 },
    recyclableWeight: { type: Number, default: 0 },
    residualWeight: { type: Number, default: 0 }
  },
  recyclingTally: { type: Number, default: 0 },
  approvedByOperator: { type: String },
  approvedAt: { type: String }
}, { _id: false });

module.exports = mongoose.model('PlantDelivery', plantDeliverySchema);
