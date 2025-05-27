const { recommendScholarships } = require('../services/recommendationservices');

exports.getRecommendations = async (req, res) => {
  try {
    if (!req.params.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const recommendations = await recommendScholarships(req.params.userId);
    
    if (!recommendations || recommendations.length === 0) {
      return res.status(404).json({ 
        error: 'No scholarships found matching your profile',
        recommendations: []
      });
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Recommendation controller error:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error.message || 'Failed to get recommendations',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};