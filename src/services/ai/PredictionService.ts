import { BaseAIService } from './BaseAIService';
import { Prediction, PredictionRequest, TrainingDataPoint } from '../../types/ai';

export class PredictionService extends BaseAIService {
  private predictionHistory: Map<string, Prediction[]> = new Map();

  /**
   * Generate prediction based on model and input features
   */
  async generatePrediction(request: PredictionRequest): Promise<Prediction> {
    const cacheKey = this.getCacheKey('prediction', request);
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const model = this.getModelByType(request.modelType);
    if (!model || model.status !== 'active') {
      throw new Error(`Model not found or inactive: ${request.modelType}`);
    }

    const prediction = await this.runPredictionModel(model.id, request);
    this.setCache(cacheKey, prediction);
    
    // Store in history
    const history = this.predictionHistory.get(model.id) || [];
    history.push(prediction);
    this.predictionHistory.set(model.id, history.slice(-100)); // Keep last 100 predictions

    this.logOperation('prediction_generated', {
      modelId: model.id,
      type: request.modelType,
      confidence: prediction.confidence
    });

    this.emit('predictionGenerated', prediction);
    return prediction;
  }

  /**
   * Generate donation predictions
   */
  async generateDonationPrediction(timeframe: string = '30d'): Promise<Prediction> {
    const historicalData = await this.getHistoricalDonationData();
    const features = this.extractDonationFeatures(historicalData);

    return this.generatePrediction({
      modelType: 'donation',
      features,
      timeframe,
      confidence: 0.8
    });
  }

  /**
   * Generate volunteer engagement predictions
   */
  async generateVolunteerPrediction(volunteerId: string, timeframe: string = '30d'): Promise<Prediction> {
    const volunteerData = await this.getVolunteerData(volunteerId);
    const features = this.extractVolunteerFeatures(volunteerData);

    return this.generatePrediction({
      modelType: 'volunteer',
      features: { ...features, volunteerId },
      timeframe,
      confidence: 0.75
    });
  }

  /**
   * Generate program success predictions
   */
  async generateProgramPrediction(programId: string): Promise<Prediction> {
    const programData = await this.getProgramData(programId);
    const features = this.extractProgramFeatures(programData);

    return this.generatePrediction({
      modelType: 'program',
      features: { ...features, programId },
      timeframe: '90d',
      confidence: 0.82
    });
  }

  /**
   * Get prediction history for a model
   */
  getPredictionHistory(modelId: string, limit: number = 50): Prediction[] {
    const history = this.predictionHistory.get(modelId) || [];
    return history.slice(-limit);
  }

  /**
   * Get batch predictions for multiple items
   */
  async getBatchPredictions(requests: PredictionRequest[]): Promise<Prediction[]> {
    const promises = requests.map(request => this.generatePrediction(request));
    return Promise.all(promises);
  }

  /**
   * Update prediction accuracy based on actual outcomes
   */
  async updatePredictionAccuracy(predictionId: string, actualValue: number): Promise<void> {
    // Find the prediction in history
    for (const [modelId, predictions] of this.predictionHistory) {
      const prediction = predictions.find(p => p.id === predictionId);
      if (prediction) {
        const accuracy = 1 - Math.abs(prediction.value - actualValue) / Math.max(prediction.value, actualValue);
        
        // Update model accuracy (simplified - in production, use more sophisticated methods)
        const model = this.models.get(modelId);
        if (model) {
          model.accuracy = (model.accuracy * 0.9) + (accuracy * 0.1); // Exponential moving average
        }

        this.logOperation('prediction_accuracy_updated', {
          predictionId,
          modelId,
          predicted: prediction.value,
          actual: actualValue,
          accuracy
        });

        this.emit('predictionAccuracyUpdated', { predictionId, accuracy });
        break;
      }
    }
  }

  /**
   * Private methods for model execution and data processing
   */
  private getModelByType(type: string): any {
    for (const model of this.models.values()) {
      if (model.type === type) {
        return model;
      }
    }
    return null;
  }

  private async runPredictionModel(modelId: string, request: PredictionRequest): Promise<Prediction> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Mock prediction logic - in production, integrate with actual ML models
    const baseValue = this.calculateBaseValue(request.features, model.type);
    const seasonalMultiplier = this.calculateSeasonalMultiplier(model.type);
    const trendMultiplier = this.calculateTrendMultiplier(request.features);
    
    const predictedValue = baseValue * seasonalMultiplier * trendMultiplier;
    const confidence = this.calculateConfidence(model.accuracy, this.assessDataQuality(request.features));

    const factors = this.identifyInfluencingFactors(request.features, model.type);

    return {
      id: this.generateId(),
      modelId,
      type: model.type,
      value: Math.round(predictedValue * 100) / 100,
      confidence,
      timeframe: request.timeframe || '30d',
      factors,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  private calculateBaseValue(features: Record<string, any>, modelType: string): number {
    switch (modelType) {
      case 'donation':
        return features.historical_avg || 1000 + Math.random() * 500;
      case 'volunteer':
        return features.engagement_score || 0.7 + Math.random() * 0.3;
      case 'program':
        return features.success_probability || 0.8 + Math.random() * 0.2;
      default:
        return 100 + Math.random() * 50;
    }
  }

  private calculateSeasonalMultiplier(modelType: string): number {
    const month = new Date().getMonth();
    
    switch (modelType) {
      case 'donation':
        // Higher donations in November-December (holiday season)
        return month >= 10 ? 1.5 : month >= 8 ? 1.2 : 1.0;
      case 'volunteer':
        // Higher volunteer activity in spring and summer
        return month >= 2 && month <= 8 ? 1.3 : 0.9;
      default:
        return 1.0;
    }
  }

  private calculateTrendMultiplier(features: Record<string, any>): number {
    // Simple trend calculation based on recent activity
    const recentTrend = features.recent_trend || 0;
    return 1 + (recentTrend * 0.1);
  }

  private assessDataQuality(features: Record<string, any>): number {
    const totalFeatures = Object.keys(features).length;
    const validFeatures = Object.values(features).filter(v => v !== null && v !== undefined).length;
    return validFeatures / Math.max(totalFeatures, 1);
  }

  private identifyInfluencingFactors(features: Record<string, any>, modelType: string): Array<{
    name: string;
    impact: number;
    description: string;
  }> {
    const factors = [];

    switch (modelType) {
      case 'donation':
        factors.push(
          { name: 'Seasonal Effect', impact: 0.3, description: 'Holiday season increases donations' },
          { name: 'Recent Campaigns', impact: 0.25, description: 'Active campaigns drive donations' },
          { name: 'Economic Indicators', impact: 0.2, description: 'Economic conditions affect giving' },
          { name: 'Social Media Activity', impact: 0.15, description: 'Online presence influences donations' }
        );
        break;
      case 'volunteer':
        factors.push(
          { name: 'Skill Match', impact: 0.35, description: 'Relevant skills increase engagement' },
          { name: 'Location Proximity', impact: 0.25, description: 'Nearby opportunities are preferred' },
          { name: 'Time Availability', impact: 0.2, description: 'Schedule flexibility matters' },
          { name: 'Past Experience', impact: 0.2, description: 'Previous positive experiences' }
        );
        break;
      case 'program':
        factors.push(
          { name: 'Team Experience', impact: 0.3, description: 'Experienced team increases success' },
          { name: 'Budget Adequacy', impact: 0.25, description: 'Sufficient funding is crucial' },
          { name: 'Community Support', impact: 0.25, description: 'Local community engagement' },
          { name: 'Program Duration', impact: 0.2, description: 'Appropriate timeline for goals' }
        );
        break;
    }

    return factors;
  }

  private async getHistoricalDonationData(): Promise<any[]> {
    // Mock historical data - in production, fetch from database
    return [
      { date: new Date('2024-01-01'), amount: 1500, campaigns: 2 },
      { date: new Date('2024-02-01'), amount: 1200, campaigns: 1 },
      { date: new Date('2024-03-01'), amount: 1800, campaigns: 3 }
    ];
  }

  private async getVolunteerData(volunteerId: string): Promise<any> {
    // Mock volunteer data
    return {
      id: volunteerId,
      skillMatch: 0.8,
      pastParticipation: 15,
      location: 'urban',
      availability: 'weekends'
    };
  }

  private async getProgramData(programId: string): Promise<any> {
    // Mock program data
    return {
      id: programId,
      budget: 50000,
      teamSize: 8,
      duration: 90,
      targetPopulation: 500,
      location: 'rural'
    };
  }

  private extractDonationFeatures(data: any[]): Record<string, any> {
    return {
      historical_avg: data.reduce((sum, d) => sum + d.amount, 0) / data.length,
      trend: data.length > 1 ? (data[data.length - 1].amount - data[0].amount) / data[0].amount : 0,
      campaign_activity: data.reduce((sum, d) => sum + d.campaigns, 0),
      recent_trend: 0.1
    };
  }

  private extractVolunteerFeatures(data: any): Record<string, any> {
    return {
      skill_match: data.skillMatch,
      past_participation: data.pastParticipation,
      location_score: data.location === 'urban' ? 0.8 : 0.6,
      availability_score: data.availability === 'weekends' ? 0.7 : 0.9,
      engagement_score: (data.skillMatch + (data.pastParticipation / 20)) / 2
    };
  }

  private extractProgramFeatures(data: any): Record<string, any> {
    return {
      budget_adequacy: data.budget / data.targetPopulation,
      team_efficiency: data.teamSize / (data.duration / 30),
      scope_complexity: data.targetPopulation / data.teamSize,
      location_factor: data.location === 'urban' ? 1.2 : 0.9,
      success_probability: 0.8
    };
  }
}
