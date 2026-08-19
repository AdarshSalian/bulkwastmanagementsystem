const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info', enum: ['info', 'success', 'warning', 'error'] },
  read: { type: Boolean, default: false },
  createdAt: { type: String }
}, { _id: false });

module.exports = mongoose.model('Notification', notificationSchema);
