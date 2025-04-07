// Sentiment Analysis Service
const natural = require('natural');
const { SentimentAnalyzer, PorterStemmer } = natural;

// Initialize sentiment analyzer
const analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');

// Word lists for different emotions
const emotionWords = {
  happy: [
    'happy', 'joy', 'delighted', 'pleased', 'glad', 'satisfied', 'cheerful', 'content',
    'thrilled', 'excited', 'elated', 'jubilant', 'enjoy', 'love', 'wonderful', 'fantastic',
    'great', 'excellent', 'amazing', 'awesome', 'good', 'positive', 'smile', 'laugh'
  ],
  sad: [
    'sad', 'unhappy', 'depressed', 'down', 'miserable', 'gloomy', 'melancholy', 'sorrow',
    'grief', 'heartbroken', 'disappointed', 'upset', 'regret', 'despair', 'hopeless',
    'dismal', 'tearful', 'cry', 'sob', 'weep', 'hurt', 'pain', 'suffering', 'lonely'
  ],
  angry: [
    'angry', 'mad', 'furious', 'outraged', 'annoyed', 'irritated', 'frustrated', 'enraged',
    'hostile', 'bitter', 'hate', 'dislike', 'resent', 'disgusted', 'offended', 'rage',
    'temper', 'aggressive', 'violent', 'fierce', 'threatening', 'livid', 'infuriated'
  ],
  anxious: [
    'anxious', 'worried', 'nervous', 'tense', 'stressed', 'uneasy', 'afraid', 'scared',
    'frightened', 'terrified', 'panicked', 'alarmed', 'concerned', 'apprehensive', 'fear',
    'dread', 'panic', 'distress', 'overwhelmed', 'restless', 'jittery', 'insecure'
  ],
  calm: [
    'calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'composed', 'collected', 'quiet',
    'still', 'gentle', 'soothing', 'comfortable', 'ease', 'relief', 'secure', 'balanced',
    'harmony', 'steady', 'stable', 'untroubled', 'undisturbed', 'placid', 'mellow'
  ]
};

// Analyze sentiment of text
async function analyzeSentiment(text) {
  try {
    // Normalize text
    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/\W+/).filter(word => word.length > 0);
    
    // Get AFINN sentiment score
    const sentimentScore = analyzer.getSentiment(words);
    
    // Count emotion words
    const emotionScores = {
      happy: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
      calm: 0,
      neutral: 0.1 // Small baseline for neutral
    };
    
    // Count occurrences of emotion words
    words.forEach(word => {
      for (const [emotion, wordList] of Object.entries(emotionWords)) {
        if (wordList.includes(word)) {
          emotionScores[emotion] += 1;
        }
      }
    });
    
    // Adjust scores based on AFINN sentiment
    if (sentimentScore > 0.3) {
      emotionScores.happy += sentimentScore * 2;
      emotionScores.calm += sentimentScore;
    } else if (sentimentScore < -0.3) {
      const negativeScore = Math.abs(sentimentScore);
      emotionScores.sad += negativeScore;
      emotionScores.angry += negativeScore * 0.7;
      emotionScores.anxious += negativeScore * 0.5;
    }
    
    // Determine primary mood
    let primaryMood = 'neutral';
    let highestScore = emotionScores.neutral;
    
    for (const [mood, score] of Object.entries(emotionScores)) {
      if (score > highestScore) {
        primaryMood = mood;
        highestScore = score;
      }
    }
    
    // Calculate confidence
    const totalScore = Object.values(emotionScores).reduce((sum, score) => sum + score, 0);
    const confidence = totalScore > 0 ? highestScore / totalScore : 0.5;
    
    return {
      primaryMood,
      scores: emotionScores,
      confidence,
      sentimentScore
    };
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    throw error;
  }
}

module.exports = {
  analyzeSentiment
};
