// Sentiment Analysis Routes
const express = require('express');
const router = express.Router();
const sentimentService = require('../services/sentimentService');

// Analyze text sentiment
router.post('/sentiment', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const result = await sentimentService.analyzeSentiment(text);
    res.json(result);
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    res.status(500).json({ error: 'Error analyzing sentiment' });
  }
});

module.exports = router;
