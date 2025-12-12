import express from 'express';
import { AIController } from '../controllers/aiController';

const router = express.Router();

// AI Dashboard
router.get('/dashboard', AIController.getAIDashboard);

// Predictions
router.post('/predictions/generate', AIController.generatePrediction);
router.get('/predictions/donation', AIController.getDonationPrediction);
router.get('/predictions/volunteer/:volunteerId', AIController.getVolunteerPrediction);
router.get('/predictions/program/:programId', AIController.getProgramPrediction);
router.get('/predictions/recent', AIController.getRecentPredictions);

// Insights
router.post('/insights/generate', AIController.generateInsights);
router.get('/insights/recent', AIController.getRecentInsights);
router.put('/insights/:insightId/status', AIController.updateInsightStatus);

// Anomaly Detection
router.post('/anomalies/detect', AIController.detectAnomalies);
router.get('/anomalies/active', AIController.getActiveAnomalies);
router.put('/anomalies/:anomalyId/resolve', AIController.resolveAnomaly);

// Recommendations
router.post('/recommendations/generate', AIController.generateRecommendations);
router.get('/recommendations/personalized', AIController.getPersonalizedRecommendations);
router.put('/recommendations/:recommendationId/status', AIController.updateRecommendationStatus);

// Natural Language Processing
router.post('/nlp/sentiment', AIController.analyzeSentiment);
router.post('/nlp/feedback', AIController.analyzeFeedback);
router.post('/nlp/insights', AIController.extractTextInsights);
router.post('/nlp/summary', AIController.generateTextSummary);

// Smart Alerts
router.get('/alerts', AIController.getSmartAlerts);
router.put('/alerts/:alertId/delivered', AIController.markAlertDelivered);

// Full Analysis
router.post('/analysis/full', AIController.runFullAnalysis);

// System Management
router.post('/system/initialize', AIController.initializeAI);
router.get('/system/health', AIController.getHealthStatus);
router.put('/system/config', AIController.updateConfiguration);

export default router;
