const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, required: true },
  userName: { type: String },
  userRole: { type: String },
  action: { type: String, required: true },
  details: { type: String },
  createdAt: { type: String }
}, { _id: false });

module.exports = mongoose.model('Activity', activitySchema);
