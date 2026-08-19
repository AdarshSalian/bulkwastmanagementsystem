const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  _id: { type: String },
  generatorId: { type: String, required: true },
  requestId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'Open', enum: ['Open', 'Resolved'] },
  resolutionText: { type: String, default: '' },
  createdAt: { type: String }
}, { _id: false });

module.exports = mongoose.model('Complaint', complaintSchema);
