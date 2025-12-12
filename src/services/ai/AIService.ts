import { EventEmitter } from 'events';
import { BaseAIService } from './BaseAIService';
import { PredictionService } from './PredictionService';
import { InsightsService } from './InsightsService';
import { AnomalyDetectionService } from './AnomalyDetectionService';
import { RecommendationService } from './RecommendationService';
import { NLPService } from './NLPService';
import { 
  AIConfiguration, 
  Prediction, 
  AIInsight, 
  AnomalyDetection, 
  Recommendation, 
  SentimentAnalysis,
  SmartAlert
} from '../../types/ai';

export class AIService extends EventEmitter {
  private config: AIConfiguration;
  private predictionService: PredictionService;
  private insightsService: InsightsService;
  private anomalyService: AnomalyDetectionService;
  private recommendationService: RecommendationService;
  private nlpService: NLPService;
  private alertQueue: SmartAlert[] = [];
  private isInitialized = false;

  constructor(config: AIConfiguration) {
    super();
    this.config = config;
    
    // Initialize all services
    this.predictionService = new PredictionService(config);
    this.insightsService = new InsightsService(config);
    this.anomalyService = new AnomalyDetectionService(config);
    this.recommendationService = new RecommendationService(config);
    this.nlpService = new NLPService(config);

    this.setupEventListeners();
  }

  /**
   * Initialize all AI services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing AI Service suite...');

    try {
      // Initialize all services in parallel
      await Promise.all([
        this.predictionService.initialize(),
        this.insightsService.initialize(),
        this.anomalyService.initialize(),
        this.recommendationService.initialize(),
        this.nlpService.initialize()
      ]);

      this.isInitialized = true;
      console.log('AI Service suite initialized successfully');
      this.emit('initialized');

      // Start background processes
      this.startBackgroundProcesses();

    } catch (error) {
      console.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive AI dashboard data
   */
  async getAIDashboard(userId: string): Promise<{
    predictions: Prediction[];
    insights: AIInsight[];
    anomalies: AnomalyDetection[];
    recommendations: Recommendation[];
    alerts: SmartAlert[];
    statistics: {
      predictions: any;
      insights: any;
      anomalies: any;
      recommendations: any;
      sentiment: any;
    };
  }> {
    this.ensureInitialized();

    const [
      predictions,
      insights,
      anomalies,
      recommendations,
      alerts
    ] = await Promise.all([
      this.getRecentPredictions(),
      this.getRecentInsights(),
      this.getActiveAnomalies(),
      this.getPersonalizedRecommendations(userId),
      this.getRecentAlerts(userId)
    ]);

    const statistics = {
      predictions: this.predictionService.getPredictionHistory('', 0).length,
      insights: this.insightsService.getInsightsSummary(),
      anomalies: this.anomalyService.getAnomalyStatistics(),
      recommendations: this.recommendationService.getRecommendationStatistics(),
      sentiment: this.nlpService.getSentimentStatistics()
    };

    return {
      predictions,
      insights,
      anomalies,
      recommendations,
      alerts,
      statistics
    };
  }

  /**
   * Prediction Service Methods
   */
  async generatePrediction(type: string, features: Record<string, any>): Promise<Prediction> {
    this.ensureInitialized();
    return this.predictionService.generatePrediction({ modelType: type, features });
  }

  async getDonationPrediction(timeframe: string = '30d'): Promise<Prediction> {
    this.ensureInitialized();
    return this.predictionService.generateDonationPrediction(timeframe);
  }

  async getVolunteerPrediction(volunteerId: string, timeframe: string = '30d'): Promise<Prediction> {
    this.ensureInitialized();
    return this.predictionService.generateVolunteerPrediction(volunteerId, timeframe);
  }

  async getProgramPrediction(programId: string): Promise<Prediction> {
    this.ensureInitialized();
    return this.predictionService.generateProgramPrediction(programId);
  }

  getRecentPredictions(limit: number = 10): Prediction[] {
    return this.predictionService.getPredictionHistory('', limit);
  }

  /**
   * Insights Service Methods
   */
  async generateInsights(): Promise<AIInsight[]> {
    this.ensureInitialized();
    return this.insightsService.generateInsights();
  }

  getRecentInsights(type?: string, limit: number = 10): AIInsight[] {
    return this.insightsService.getInsightHistory(type, undefined, limit);
  }

  async updateInsightStatus(insightId: string, status: 'acknowledged' | 'acted_upon' | 'dismissed'): Promise<void> {
    return this.insightsService.updateInsightStatus(insightId, status);
  }

  /**
   * Anomaly Detection Methods
   */
  async detectAnomalies(metrics: Record<string, number>): Promise<AnomalyDetection[]> {
    this.ensureInitialized();
    return this.anomalyService.detectAnomalies(metrics);
  }

  getActiveAnomalies(): AnomalyDetection[] {
    return this.anomalyService.getActiveAnomalies();
  }

  async resolveAnomaly(anomalyId: string): Promise<void> {
    return this.anomalyService.resolveAnomaly(anomalyId);
  }

  /**
   * Recommendation Service Methods
   */
  async generateRecommendations(userId: string, context?: Record<string, any>): Promise<Recommendation[]> {
    this.ensureInitialized();
    return this.recommendationService.generateRecommendations(userId, context);
  }

  getPersonalizedRecommendations(userId: string, limit: number = 5): Recommendation[] {
    return this.recommendationService.getRecommendations(userId, undefined, 'pending', limit);
  }

  async updateRecommendationStatus(
    recommendationId: string,
    status: 'accepted' | 'rejected' | 'implemented'
  ): Promise<void> {
    return this.recommendationService.updateRecommendationStatus(recommendationId, status);
  }

  /**
   * NLP Service Methods
   */
  async analyzeSentiment(text: string, context?: string): Promise<SentimentAnalysis> {
    this.ensureInitialized();
    return this.nlpService.analyzeSentiment(text, context);
  }

  async analyzeFeedback(feedback: string, source: string): Promise<SentimentAnalysis> {
    this.ensureInitialized();
    return this.nlpService.analyzeFeedback(feedback, source);
  }

  async extractTextInsights(texts: string[]): Promise<any> {
    this.ensureInitialized();
    return this.nlpService.extractInsights(texts);
  }

  async generateTextSummary(texts: string[], maxLength: number = 200): Promise<string> {
    this.ensureInitialized();
    return this.nlpService.generateSummary(texts, maxLength);
  }

  /**
   * Smart Alerts Management
   */
  async createAlert(alert: Omit<SmartAlert, 'id' | 'createdAt' | 'delivered'>): Promise<SmartAlert> {
    const smartAlert: SmartAlert = {
      ...alert,
      id: this.generateId(),
      createdAt: new Date(),
      delivered: false
    };

    this.alertQueue.push(smartAlert);
    this.emit('alertCreated', smartAlert);
    
    return smartAlert;
  }

  getRecentAlerts(userId: string, limit: number = 10): SmartAlert[] {
    return this.alertQueue
      .filter(alert => 
        alert.targetUsers.includes(userId) || 
        alert.targetUsers.length === 0
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async markAlertDelivered(alertId: string): Promise<void> {
    const alert = this.alertQueue.find(a => a.id === alertId);
    if (alert) {
      alert.delivered = true;
      this.emit('alertDelivered', alert);
    }
  }

  /**
   * Bulk AI Operations
   */
  async runFullAnalysis(userId: string, data: {
    metrics?: Record<string, number>;
    feedbacks?: string[];
    context?: Record<string, any>;
  }): Promise<{
    predictions: Prediction[];
    insights: AIInsight[];
    anomalies: AnomalyDetection[];
    recommendations: Recommendation[];
    sentimentAnalysis?: any;
    alerts: SmartAlert[];
  }> {
    this.ensureInitialized();

    const results: any = {
      predictions: [],
      insights: [],
      anomalies: [],
      recommendations: [],
      alerts: []
    };

    try {
      // Run parallel analysis
      const analysisPromises: Promise<any>[] = [];

      // Generate insights
      analysisPromises.push(
        this.generateInsights().then(insights => {
          results.insights = insights;
          return insights;
        })
      );

      // Generate recommendations
      analysisPromises.push(
        this.generateRecommendations(userId, data.context).then(recommendations => {
          results.recommendations = recommendations;
          return recommendations;
        })
      );

      // Detect anomalies if metrics provided
      if (data.metrics) {
        analysisPromises.push(
          this.detectAnomalies(data.metrics).then(anomalies => {
            results.anomalies = anomalies;
            return anomalies;
          })
        );
      }

      // Analyze feedback sentiment if provided
      if (data.feedbacks && data.feedbacks.length > 0) {
        analysisPromises.push(
          this.extractTextInsights(data.feedbacks).then(sentiment => {
            results.sentimentAnalysis = sentiment;
            return sentiment;
          })
        );
      }

      // Generate key predictions
      analysisPromises.push(
        Promise.all([
          this.getDonationPrediction(),
          this.getProgramPrediction('main-program')
        ]).then(predictions => {
          results.predictions = predictions;
          return predictions;
        })
      );

      await Promise.all(analysisPromises);

      // Generate smart alerts based on results
      await this.generateSmartAlerts(userId, results);
      results.alerts = this.getRecentAlerts(userId, 5);

      this.emit('fullAnalysisComplete', { userId, results });

    } catch (error) {
      console.error('Error during full AI analysis:', error);
      throw error;
    }

    return results;
  }

  /**
   * Get AI service health status
   */
  async getHealthStatus(): Promise<{
    status: string;
    services: Record<string, any>;
    uptime: number;
    errors: string[];
  }> {
    const services: Record<string, any> = {};
    const errors: string[] = [];

    try {
      services['predictions'] = await this.predictionService.healthCheck();
    } catch (error: any) {
      errors.push(`Prediction service: ${error?.message || 'Unknown error'}`);
      services['predictions'] = { status: 'error' };
    }

    try {
      services['insights'] = await this.insightsService.healthCheck();
    } catch (error: any) {
      errors.push(`Insights service: ${error?.message || 'Unknown error'}`);
      services['insights'] = { status: 'error' };
    }

    try {
      services['anomalies'] = await this.anomalyService.healthCheck();
    } catch (error: any) {
      errors.push(`Anomaly service: ${error?.message || 'Unknown error'}`);
      services['anomalies'] = { status: 'error' };
    }

    try {
      services['recommendations'] = await this.recommendationService.healthCheck();
    } catch (error: any) {
      errors.push(`Recommendation service: ${error?.message || 'Unknown error'}`);
      services['recommendations'] = { status: 'error' };
    }

    try {
      services['nlp'] = await this.nlpService.healthCheck();
    } catch (error: any) {
      errors.push(`NLP service: ${error?.message || 'Unknown error'}`);
      services['nlp'] = { status: 'error' };
    }

    const status = errors.length === 0 ? 'healthy' : 'degraded';

    return {
      status,
      services,
      uptime: process.uptime(),
      errors
    };
  }

  /**
   * Update AI configuration
   */
  updateConfiguration(newConfig: Partial<AIConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configurationUpdated', this.config);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await Promise.all([
      this.predictionService.cleanup(),
      this.insightsService.cleanup(),
      this.anomalyService.cleanup(),
      this.recommendationService.cleanup(),
      this.nlpService.cleanup()
    ]);

    this.removeAllListeners();
    this.alertQueue = [];
    this.isInitialized = false;

    console.log('AI Service suite cleaned up');
  }

  /**
   * Private helper methods
   */
  private setupEventListeners(): void {
    // Set up cross-service event handling
    this.anomalyService.on('anomaliesDetected', (anomalies: AnomalyDetection[]) => {
      this.handleAnomaliesDetected(anomalies);
    });

    this.predictionService.on('predictionGenerated', (prediction: Prediction) => {
      this.handlePredictionGenerated(prediction);
    });

    this.nlpService.on('negativeFeedbackDetected', (data: any) => {
      this.handleNegativeFeedback(data);
    });
  }

  private async handleAnomaliesDetected(anomalies: AnomalyDetection[]): Promise<void> {
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'high') {
        await this.createAlert({
          type: 'anomaly',
          title: 'High Severity Anomaly Detected',
          message: anomaly.description,
          priority: 'urgent',
          targetUsers: [],
          targetRoles: ['admin', 'manager'],
          actions: [
            { label: 'View Details', type: 'link', value: `/anomalies/${anomaly.id}` },
            { label: 'Resolve', type: 'action', value: `resolve_anomaly_${anomaly.id}` }
          ],
          metadata: { anomalyId: anomaly.id, metric: anomaly.metric }
        });
      }
    }
  }

  private async handlePredictionGenerated(prediction: Prediction): Promise<void> {
    if (prediction.confidence > 0.9 && prediction.type === 'donation') {
      await this.createAlert({
        type: 'prediction',
        title: 'High Confidence Donation Prediction',
        message: `Predicted donation amount: ${prediction.value} with ${(prediction.confidence * 100).toFixed(1)}% confidence`,
        priority: 'medium',
        targetUsers: [],
        targetRoles: ['fundraising', 'admin'],
        actions: [
          { label: 'View Details', type: 'link', value: `/predictions/${prediction.id}` }
        ],
        metadata: { predictionId: prediction.id, type: prediction.type }
      });
    }
  }

  private async handleNegativeFeedback(data: any): Promise<void> {
    await this.createAlert({
      type: 'insight',
      title: 'Negative Feedback Detected',
      message: 'High negative sentiment detected in feedback that requires attention',
      priority: 'high',
      targetUsers: [],
      targetRoles: ['admin', 'program_manager'],
      actions: [
        { label: 'Review Feedback', type: 'link', value: `/feedback/review` },
        { label: 'Contact Team', type: 'action', value: 'contact_feedback_team' }
      ],
      metadata: { analysisId: data.analysis.id, source: data.source }
    });
  }

  private async generateSmartAlerts(userId: string, analysisResults: any): Promise<void> {
    // Generate alerts based on analysis results
    
    // High-priority insights
    const criticalInsights = analysisResults.insights.filter(
      (insight: AIInsight) => insight.severity === 'critical'
    );

    for (const insight of criticalInsights) {
      await this.createAlert({
        type: 'insight',
        title: insight.title,
        message: insight.description,
        priority: 'urgent',
        targetUsers: [userId],
        targetRoles: [],
        actions: [
          { label: 'View Insight', type: 'link', value: `/insights/${insight.id}` }
        ],
        metadata: { insightId: insight.id }
      });
    }

    // High-impact recommendations
    const highImpactRecommendations = analysisResults.recommendations.filter(
      (rec: Recommendation) => rec.expectedImpact.improvement > 30
    );

    if (highImpactRecommendations.length > 0) {
      await this.createAlert({
        type: 'recommendation',
        title: 'High-Impact Recommendations Available',
        message: `${highImpactRecommendations.length} recommendations with significant potential impact identified`,
        priority: 'medium',
        targetUsers: [userId],
        targetRoles: [],
        actions: [
          { label: 'View Recommendations', type: 'link', value: '/recommendations' }
        ],
        metadata: { count: highImpactRecommendations.length }
      });
    }
  }

  private startBackgroundProcesses(): void {
    // Start periodic insight generation
    if (this.config.insights.enabled) {
      setInterval(async () => {
        try {
          await this.generateInsights();
        } catch (error) {
          console.error('Background insight generation failed:', error);
        }
      }, this.parseFrequency(this.config.insights.generateFrequency));
    }

    // Cleanup old alerts periodically
    setInterval(() => {
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      this.alertQueue = this.alertQueue.filter(alert => 
        alert.createdAt.getTime() > cutoffTime
      );
    }, 60 * 60 * 1000); // Every hour
  }

  private parseFrequency(frequency: string): number {
    // Parse frequency strings like "1h", "30m", "2d" to milliseconds
    const match = frequency.match(/^(\d+)([mhd])$/);
    if (!match) return 60 * 60 * 1000; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('AI Service not initialized. Call initialize() first.');
    }
  }

  private generateId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance with default configuration
const defaultConfig: AIConfiguration = {
  predictionModels: {
    enabled: true,
    updateFrequency: '24h',
    confidenceThreshold: 0.7
  },
  anomalyDetection: {
    enabled: true,
    sensitivity: 'medium',
    alertThreshold: 0.6
  },
  insights: {
    enabled: true,
    generateFrequency: '6h',
    minConfidence: 0.7
  },
  recommendations: {
    enabled: true,
    maxPerDay: 10,
    minImpactThreshold: 15
  },
  nlp: {
    enabled: true,
    languages: ['en', 'hi'],
    sentimentAnalysis: true
  }
};

export const aiService = new AIService(defaultConfig);
