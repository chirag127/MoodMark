// User Data Model
const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserData', userDataSchema);
