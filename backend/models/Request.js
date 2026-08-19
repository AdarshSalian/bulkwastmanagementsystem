const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  _id: { type: String },
  generatorId: { type: String, required: true },
  propertyId: { type: String, required: true },
  wasteType: { type: String, required: true },
  wasteQuantity: { type: Number, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Assigned', 'Collected', 'Completed', 'Cancelled'] },
  scheduledDate: { type: String, required: true },
  assignedDriverId: { type: String, default: null },
  assignedVehicleId: { type: String, default: null },
  weight: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  paymentStatus: { type: String, default: 'Unpaid', enum: ['Unpaid', 'Paid'] },
  paymentDetails: {
    paymentMethod: String,
    transactionId: String,
    paidAt: String
  },
  complaintId: { type: String, default: null },
  createdAt: { type: String }
}, { _id: false });

module.exports = mongoose.model('Request', requestSchema);
