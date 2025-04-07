// User Data Routes
const express = require('express');
const router = express.Router();
const UserData = require('../models/userData');

// Get user data
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const userData = await UserData.find({ userId }).sort({ timestamp: -1 });
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

// Save user data
router.post('/', async (req, res) => {
  try {
    const { userId, data } = req.body;
    
    if (!userId || !data) {
      return res.status(400).json({ error: 'User ID and data are required' });
    }
    
    const userData = new UserData({
      userId,
      data,
      timestamp: Date.now()
    });
    
    await userData.save();
    res.status(201).json(userData);
  } catch (error) {
    console.error('Error saving user data:', error);
    res.status(500).json({ error: 'Error saving user data' });
  }
});

// Delete user data
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    await UserData.deleteMany({ userId });
    res.json({ message: 'User data deleted successfully' });
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ error: 'Error deleting user data' });
  }
});

module.exports = router;
