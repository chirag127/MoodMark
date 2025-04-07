// MoodMark - Backend Server
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const sentimentRoutes = require('./routes/sentiment');
const userDataRoutes = require('./routes/userData');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/analyze', sentimentRoutes);
app.use('/api/user-data', userDataRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'MoodMark API Server',
    version: '1.0.0',
    endpoints: [
      '/api/analyze/sentiment',
      '/api/user-data'
    ]
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/moodmark', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
  
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});
