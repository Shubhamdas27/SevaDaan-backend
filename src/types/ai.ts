// AI and ML Types and Interfaces for Backend
export interface PredictionModel {
  id: string;
  name: string;
  type: 'donation' | 'volunteer' | 'program' | 'impact';
  accuracy: number;
  lastTrained: Date;
  status: 'active' | 'training' | 'inactive';
  parameters: Record<string, any>;
}

export interface Prediction {
  id: string;
  modelId: string;
  type: string;
  value: number;
  confidence: number;
  timeframe: string;
  factors: {
    name: string;
    impact: number;
    description: string;
  }[];
  generatedAt: Date;
  expiresAt: Date;
}

export interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  data: any;
  suggestions: string[];
  generatedAt: Date;
  status: 'new' | 'acknowledged' | 'acted_upon' | 'dismissed';
  relatedWidgets?: string[];
}

export interface AnomalyDetection {
  id: string;
  metric: string;
  value: number;
  expectedRange: {
    min: number;
    max: number;
  };
  severity: 'low' | 'medium' | 'high';
  probability: number;
  description: string;
  detectedAt: Date;
  resolved: boolean;
}

export interface SmartAlert {
  id: string;
  type: 'prediction' | 'anomaly' | 'insight' | 'recommendation';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetUsers: string[];
  targetRoles: string[];
  actions: {
    label: string;
    type: 'link' | 'action';
    value: string;
  }[];
  metadata: Record<string, any>;
  createdAt: Date;
  scheduledFor?: Date;
  delivered: boolean;
}

export interface Recommendation {
  id: string;
  type: 'donor_match' | 'volunteer_match' | 'program_optimization' | 'resource_allocation' | 'timing';
  title: string;
  description: string;
  confidence: number;
  expectedImpact: {
    metric: string;
    improvement: number;
    unit: string;
  };
  requiredActions: string[];
  timeline: string;
  resources: string[];
  generatedAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
}

export interface SentimentAnalysis {
  id: string;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
  };
  keywords: string[];
  topics: string[];
  analyzedAt: Date;
}

export interface TrendAnalysis {
  metric: string;
  timeframe: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  slope: number;
  correlation: number;
  seasonality?: {
    detected: boolean;
    period: string;
    strength: number;
  };
  forecast: {
    values: number[];
    confidence: number[];
    dates: Date[];
  };
}

export interface AIModelPerformance {
  modelId: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingData: {
    samples: number;
    features: number;
    lastUpdated: Date;
  };
  validationResults: {
    date: Date;
    score: number;
    metrics: Record<string, number>;
  }[];
}

export interface AIConfiguration {
  predictionModels: {
    enabled: boolean;
    updateFrequency: string;
    confidenceThreshold: number;
  };
  anomalyDetection: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    alertThreshold: number;
  };
  insights: {
    enabled: boolean;
    generateFrequency: string;
    minConfidence: number;
  };
  recommendations: {
    enabled: boolean;
    maxPerDay: number;
    minImpactThreshold: number;
  };
  nlp: {
    enabled: boolean;
    languages: string[];
    sentimentAnalysis: boolean;
  };
}

export interface MLTrainingData {
  id: string;
  modelType: string;
  features: string[];
  targetVariable: string;
  data: Record<string, any>[];
  metadata: {
    collectedAt: Date;
    source: string;
    quality: number;
    preprocessed: boolean;
  };
}

export interface AIAnalyticsEvent {
  id: string;
  type: string;
  userId: string;
  data: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface TrainingDataPoint {
  timestamp: Date;
  features: Record<string, number>;
  target: number;
  metadata?: Record<string, any>;
}

export interface PredictionRequest {
  modelType: string;
  features: Record<string, any>;
  timeframe?: string;
  confidence?: number;
}

export interface InsightRequest {
  type: string;
  dataRange: {
    start: Date;
    end: Date;
  };
  metrics: string[];
  filters?: Record<string, any>;
}

export interface RecommendationRequest {
  type: string;
  context: Record<string, any>;
  preferences?: Record<string, any>;
  constraints?: Record<string, any>;
}
