import { Request, Response } from 'express';
import { aiService } from '../services/ai/AIService';

export class AIController {
  /**
   * Get AI dashboard data
   */
  static async getAIDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const dashboard = await aiService.getAIDashboard(userId);
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error: any) {
      console.error('Error getting AI dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get AI dashboard',
        error: error.message
      });
    }
  }

  /**
   * Generate predictions
   */
  static async generatePrediction(req: Request, res: Response): Promise<void> {
    try {
      const { type, features, timeframe } = req.body;
      
      if (!type || !features) {
        res.status(400).json({
          success: false,
          message: 'Type and features are required'
        });
        return;
      }

      const prediction = await aiService.generatePrediction(type, features);
      
      res.json({
        success: true,
        data: prediction
      });
    } catch (error: any) {
      console.error('Error generating prediction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate prediction',
        error: error.message
      });
    }
  }

  /**
   * Get donation predictions
   */
  static async getDonationPrediction(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = '30d' } = req.query;
      const prediction = await aiService.getDonationPrediction(timeframe as string);
      
      res.json({
        success: true,
        data: prediction
      });
    } catch (error: any) {
      console.error('Error getting donation prediction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get donation prediction',
        error: error.message
      });
    }
  }

  /**
   * Get volunteer predictions
   */
  static async getVolunteerPrediction(req: Request, res: Response): Promise<void> {
    try {
      const { volunteerId } = req.params;
      const { timeframe = '30d' } = req.query;
      
      if (!volunteerId) {
        res.status(400).json({
          success: false,
          message: 'Volunteer ID is required'
        });
        return;
      }

      const prediction = await aiService.getVolunteerPrediction(volunteerId, timeframe as string);
      
      res.json({
        success: true,
        data: prediction
      });
    } catch (error: any) {
      console.error('Error getting volunteer prediction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get volunteer prediction',
        error: error.message
      });
    }
  }

  /**
   * Get program predictions
   */
  static async getProgramPrediction(req: Request, res: Response): Promise<void> {
    try {
      const { programId } = req.params;
      
      if (!programId) {
        res.status(400).json({
          success: false,
          message: 'Program ID is required'
        });
        return;
      }

      const prediction = await aiService.getProgramPrediction(programId);
      
      res.json({
        success: true,
        data: prediction
      });
    } catch (error: any) {
      console.error('Error getting program prediction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get program prediction',
        error: error.message
      });
    }
  }

  /**
   * Get recent predictions
   */
  static async getRecentPredictions(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;
      const predictions = aiService.getRecentPredictions(parseInt(limit as string));
      
      res.json({
        success: true,
        data: predictions
      });
    } catch (error: any) {
      console.error('Error getting recent predictions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recent predictions',
        error: error.message
      });
    }
  }

  /**
   * Generate insights
   */
  static async generateInsights(req: Request, res: Response): Promise<void> {
    try {
      const insights = await aiService.generateInsights();
      
      res.json({
        success: true,
        data: insights
      });
    } catch (error: any) {
      console.error('Error generating insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate insights',
        error: error.message
      });
    }
  }

  /**
   * Get recent insights
   */
  static async getRecentInsights(req: Request, res: Response): Promise<void> {
    try {
      const { type, limit = 10 } = req.query;
      const insights = aiService.getRecentInsights(type as string, parseInt(limit as string));
      
      res.json({
        success: true,
        data: insights
      });
    } catch (error: any) {
      console.error('Error getting recent insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recent insights',
        error: error.message
      });
    }
  }

  /**
   * Update insight status
   */
  static async updateInsightStatus(req: Request, res: Response): Promise<void> {
    try {
      const { insightId } = req.params;
      const { status } = req.body;
      
      if (!insightId || !status) {
        res.status(400).json({
          success: false,
          message: 'Insight ID and status are required'
        });
        return;
      }

      if (!['acknowledged', 'acted_upon', 'dismissed'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: acknowledged, acted_upon, or dismissed'
        });
        return;
      }

      await aiService.updateInsightStatus(insightId, status);
      
      res.json({
        success: true,
        message: 'Insight status updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating insight status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update insight status',
        error: error.message
      });
    }
  }

  /**
   * Detect anomalies
   */
  static async detectAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const { metrics } = req.body;
      
      if (!metrics || typeof metrics !== 'object') {
        res.status(400).json({
          success: false,
          message: 'Metrics object is required'
        });
        return;
      }

      const anomalies = await aiService.detectAnomalies(metrics);
      
      res.json({
        success: true,
        data: anomalies
      });
    } catch (error: any) {
      console.error('Error detecting anomalies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to detect anomalies',
        error: error.message
      });
    }
  }

  /**
   * Get active anomalies
   */
  static async getActiveAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const anomalies = aiService.getActiveAnomalies();
      
      res.json({
        success: true,
        data: anomalies
      });
    } catch (error: any) {
      console.error('Error getting active anomalies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active anomalies',
        error: error.message
      });
    }
  }

  /**
   * Resolve anomaly
   */
  static async resolveAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { anomalyId } = req.params;
      
      if (!anomalyId) {
        res.status(400).json({
          success: false,
          message: 'Anomaly ID is required'
        });
        return;
      }

      await aiService.resolveAnomaly(anomalyId);
      
      res.json({
        success: true,
        message: 'Anomaly resolved successfully'
      });
    } catch (error: any) {
      console.error('Error resolving anomaly:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve anomaly',
        error: error.message
      });
    }
  }

  /**
   * Generate recommendations
   */
  static async generateRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { context } = req.body;
      
      const recommendations = await aiService.generateRecommendations(userId, context);
      
      res.json({
        success: true,
        data: recommendations
      });
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate recommendations',
        error: error.message
      });
    }
  }

  /**
   * Get personalized recommendations
   */
  static async getPersonalizedRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { limit = 5 } = req.query;
      
      const recommendations = aiService.getPersonalizedRecommendations(userId, parseInt(limit as string));
      
      res.json({
        success: true,
        data: recommendations
      });
    } catch (error: any) {
      console.error('Error getting personalized recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get personalized recommendations',
        error: error.message
      });
    }
  }

  /**
   * Update recommendation status
   */
  static async updateRecommendationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { recommendationId } = req.params;
      const { status } = req.body;
      
      if (!recommendationId || !status) {
        res.status(400).json({
          success: false,
          message: 'Recommendation ID and status are required'
        });
        return;
      }

      if (!['accepted', 'rejected', 'implemented'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: accepted, rejected, or implemented'
        });
        return;
      }

      await aiService.updateRecommendationStatus(recommendationId, status);
      
      res.json({
        success: true,
        message: 'Recommendation status updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating recommendation status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update recommendation status',
        error: error.message
      });
    }
  }

  /**
   * Analyze sentiment
   */
  static async analyzeSentiment(req: Request, res: Response): Promise<void> {
    try {
      const { text, context } = req.body;
      
      if (!text) {
        res.status(400).json({
          success: false,
          message: 'Text is required'
        });
        return;
      }

      const analysis = await aiService.analyzeSentiment(text, context);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error: any) {
      console.error('Error analyzing sentiment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze sentiment',
        error: error.message
      });
    }
  }

  /**
   * Analyze feedback
   */
  static async analyzeFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { feedback, source } = req.body;
      
      if (!feedback || !source) {
        res.status(400).json({
          success: false,
          message: 'Feedback and source are required'
        });
        return;
      }

      const analysis = await aiService.analyzeFeedback(feedback, source);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error: any) {
      console.error('Error analyzing feedback:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze feedback',
        error: error.message
      });
    }
  }

  /**
   * Extract text insights
   */
  static async extractTextInsights(req: Request, res: Response): Promise<void> {
    try {
      const { texts } = req.body;
      
      if (!texts || !Array.isArray(texts)) {
        res.status(400).json({
          success: false,
          message: 'Texts array is required'
        });
        return;
      }

      const insights = await aiService.extractTextInsights(texts);
      
      res.json({
        success: true,
        data: insights
      });
    } catch (error: any) {
      console.error('Error extracting text insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to extract text insights',
        error: error.message
      });
    }
  }

  /**
   * Generate text summary
   */
  static async generateTextSummary(req: Request, res: Response): Promise<void> {
    try {
      const { texts, maxLength = 200 } = req.body;
      
      if (!texts || !Array.isArray(texts)) {
        res.status(400).json({
          success: false,
          message: 'Texts array is required'
        });
        return;
      }

      const summary = await aiService.generateTextSummary(texts, maxLength);
      
      res.json({
        success: true,
        data: { summary }
      });
    } catch (error: any) {
      console.error('Error generating text summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate text summary',
        error: error.message
      });
    }
  }

  /**
   * Run full AI analysis
   */
  static async runFullAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { metrics, feedbacks, context } = req.body;
      
      const results = await aiService.runFullAnalysis(userId, {
        metrics,
        feedbacks,
        context
      });
      
      res.json({
        success: true,
        data: results
      });
    } catch (error: any) {
      console.error('Error running full AI analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to run full AI analysis',
        error: error.message
      });
    }
  }

  /**
   * Get AI service health status
   */
  static async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const health = await aiService.getHealthStatus();
      
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health
      });
    } catch (error: any) {
      console.error('Error getting AI health status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get AI health status',
        error: error.message
      });
    }
  }

  /**
   * Initialize AI services
   */
  static async initializeAI(req: Request, res: Response): Promise<void> {
    try {
      await aiService.initialize();
      
      res.json({
        success: true,
        message: 'AI services initialized successfully'
      });
    } catch (error: any) {
      console.error('Error initializing AI services:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize AI services',
        error: error.message
      });
    }
  }

  /**
   * Update AI configuration
   */
  static async updateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { config } = req.body;
      
      if (!config) {
        res.status(400).json({
          success: false,
          message: 'Configuration is required'
        });
        return;
      }

      aiService.updateConfiguration(config);
      
      res.json({
        success: true,
        message: 'AI configuration updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating AI configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update AI configuration',
        error: error.message
      });
    }
  }

  /**
   * Get smart alerts
   */
  static async getSmartAlerts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { limit = 10 } = req.query;
      
      const alerts = aiService.getRecentAlerts(userId, parseInt(limit as string));
      
      res.json({
        success: true,
        data: alerts
      });
    } catch (error: any) {
      console.error('Error getting smart alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get smart alerts',
        error: error.message
      });
    }
  }

  /**
   * Mark alert as delivered
   */
  static async markAlertDelivered(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      
      if (!alertId) {
        res.status(400).json({
          success: false,
          message: 'Alert ID is required'
        });
        return;
      }

      await aiService.markAlertDelivered(alertId);
      
      res.json({
        success: true,
        message: 'Alert marked as delivered'
      });
    } catch (error: any) {
      console.error('Error marking alert as delivered:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark alert as delivered',
        error: error.message
      });
    }
  }
}
