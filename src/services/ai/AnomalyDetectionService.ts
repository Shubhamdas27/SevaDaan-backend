import { BaseAIService } from './BaseAIService';
import { AnomalyDetection } from '../../types/ai';

export class AnomalyDetectionService extends BaseAIService {
  private anomalies: AnomalyDetection[] = [];
  private thresholds: Map<string, { min: number; max: number; weight: number }> = new Map();
  private baselines: Map<string, number[]> = new Map();

  /**
   * Initialize anomaly detection with baseline data
   */
  async initialize(): Promise<void> {
    await super.initialize();
    await this.setupBaselineThresholds();
    await this.loadHistoricalBaselines();
  }

  /**
   * Detect anomalies in real-time data
   */
  async detectAnomalies(metrics: Record<string, number>): Promise<AnomalyDetection[]> {
    if (!this.config.anomalyDetection.enabled) {
      return [];
    }

    const detectedAnomalies: AnomalyDetection[] = [];

    for (const [metric, value] of Object.entries(metrics)) {
      const anomaly = await this.checkMetricAnomaly(metric, value);
      if (anomaly) {
        detectedAnomalies.push(anomaly);
      }
    }

    // Store detected anomalies
    detectedAnomalies.forEach(anomaly => {
      this.anomalies.push(anomaly);
    });

    // Clean old anomalies (keep last 1000 or 30 days)
    this.cleanupOldAnomalies();

    // Update baselines with new data
    this.updateBaselines(metrics);

    if (detectedAnomalies.length > 0) {
      this.logOperation('anomalies_detected', {
        count: detectedAnomalies.length,
        metrics: detectedAnomalies.map(a => a.metric)
      });

      this.emit('anomaliesDetected', detectedAnomalies);
    }

    return detectedAnomalies;
  }

  /**
   * Check specific metric for anomalies
   */
  private async checkMetricAnomaly(metric: string, value: number): Promise<AnomalyDetection | null> {
    const threshold = this.thresholds.get(metric);
    const baseline = this.baselines.get(metric) || [];

    if (!threshold && baseline.length < 10) {
      // Not enough data for anomaly detection
      return null;
    }

    let expectedRange: { min: number; max: number };
    let probability = 0;
    let severity: 'low' | 'medium' | 'high' = 'low';

    if (threshold) {
      // Use predefined thresholds
      expectedRange = { min: threshold.min, max: threshold.max };
      
      if (value < threshold.min || value > threshold.max) {
        const deviation = Math.min(
          Math.abs(value - threshold.min) / (threshold.max - threshold.min),
          Math.abs(value - threshold.max) / (threshold.max - threshold.min)
        );
        probability = Math.min(deviation * threshold.weight, 1.0);
      }
    } else {
      // Use statistical analysis of baseline data
      const stats = this.calculateStatistics(baseline);
      const sensitivity = this.getSensitivityMultiplier();
      
      expectedRange = {
        min: stats.mean - (stats.stdDev * sensitivity),
        max: stats.mean + (stats.stdDev * sensitivity)
      };

      if (value < expectedRange.min || value > expectedRange.max) {
        const zScore = Math.abs((value - stats.mean) / stats.stdDev);
        probability = Math.min(zScore / 3, 1.0); // Normalize z-score to probability
      }
    }

    if (probability === 0) {
      return null; // No anomaly detected
    }

    // Determine severity based on probability and metric importance
    if (probability > 0.8) {
      severity = 'high';
    } else if (probability > 0.5) {
      severity = 'medium';
    }

    // Filter by alert threshold
    if (probability < this.config.anomalyDetection.alertThreshold) {
      return null;
    }

    return {
      id: this.generateId(),
      metric,
      value,
      expectedRange,
      severity,
      probability,
      description: this.generateAnomalyDescription(metric, value, expectedRange, severity),
      detectedAt: new Date(),
      resolved: false
    };
  }

  /**
   * Detect anomalies in donation patterns
   */
  async detectDonationAnomalies(): Promise<AnomalyDetection[]> {
    const donationMetrics = await this.getDonationMetrics();
    return this.detectAnomalies(donationMetrics);
  }

  /**
   * Detect anomalies in volunteer engagement
   */
  async detectVolunteerAnomalies(): Promise<AnomalyDetection[]> {
    const volunteerMetrics = await this.getVolunteerMetrics();
    return this.detectAnomalies(volunteerMetrics);
  }

  /**
   * Detect anomalies in program performance
   */
  async detectProgramAnomalies(): Promise<AnomalyDetection[]> {
    const programMetrics = await this.getProgramMetrics();
    return this.detectAnomalies(programMetrics);
  }

  /**
   * Get all active anomalies
   */
  getActiveAnomalies(): AnomalyDetection[] {
    return this.anomalies.filter(anomaly => !anomaly.resolved);
  }

  /**
   * Get anomaly history
   */
  getAnomalyHistory(metric?: string, limit: number = 100): AnomalyDetection[] {
    let filtered = this.anomalies;
    
    if (metric) {
      filtered = filtered.filter(anomaly => anomaly.metric === metric);
    }

    return filtered
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Resolve anomaly
   */
  async resolveAnomaly(anomalyId: string): Promise<void> {
    const anomaly = this.anomalies.find(a => a.id === anomalyId);
    if (anomaly) {
      anomaly.resolved = true;
      this.emit('anomalyResolved', anomaly);
    }
  }

  /**
   * Update anomaly detection sensitivity
   */
  updateSensitivity(sensitivity: 'low' | 'medium' | 'high'): void {
    this.config.anomalyDetection.sensitivity = sensitivity;
    this.logOperation('sensitivity_updated', { sensitivity });
  }

  /**
   * Get anomaly statistics
   */
  getAnomalyStatistics(): {
    total: number;
    active: number;
    byMetric: Record<string, number>;
    bySeverity: Record<string, number>;
    recentCount: number;
  } {
    const recent = this.anomalies.filter(
      anomaly => Date.now() - anomaly.detectedAt.getTime() < 24 * 60 * 60 * 1000
    ).length;

    return {
      total: this.anomalies.length,
      active: this.getActiveAnomalies().length,
      byMetric: this.groupAnomaliesByMetric(),
      bySeverity: this.groupAnomaliesBySeverity(),
      recentCount: recent
    };
  }

  /**
   * Private helper methods
   */
  private async setupBaselineThresholds(): Promise<void> {
    // Define thresholds for key metrics
    this.thresholds.set('donation_amount', { min: 100, max: 10000, weight: 1.0 });
    this.thresholds.set('volunteer_hours', { min: 1, max: 40, weight: 0.8 });
    this.thresholds.set('program_completion_rate', { min: 0.5, max: 1.0, weight: 1.2 });
    this.thresholds.set('beneficiary_count', { min: 1, max: 1000, weight: 0.9 });
    this.thresholds.set('response_time', { min: 0, max: 300, weight: 0.7 });
  }

  private async loadHistoricalBaselines(): Promise<void> {
    // Load historical data for baseline calculation
    // In production, this would fetch from database
    const historicalData = {
      donation_amount: this.generateMockData(1500, 300, 100),
      volunteer_hours: this.generateMockData(15, 5, 50),
      program_completion_rate: this.generateMockData(0.85, 0.1, 30),
      beneficiary_count: this.generateMockData(100, 20, 50),
      response_time: this.generateMockData(120, 30, 40)
    };

    for (const [metric, data] of Object.entries(historicalData)) {
      this.baselines.set(metric, data);
    }
  }

  private generateMockData(mean: number, stdDev: number, count: number): number[] {
    return Array.from({ length: count }, () => {
      return mean + (Math.random() - 0.5) * 2 * stdDev;
    });
  }

  private calculateStatistics(data: number[]): {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      stdDev,
      min: Math.min(...data),
      max: Math.max(...data)
    };
  }

  private getSensitivityMultiplier(): number {
    switch (this.config.anomalyDetection.sensitivity) {
      case 'low': return 3.0;    // Very conservative
      case 'medium': return 2.0;  // Balanced
      case 'high': return 1.5;    // Sensitive
      default: return 2.0;
    }
  }

  private generateAnomalyDescription(
    metric: string,
    value: number,
    expectedRange: { min: number; max: number },
    severity: string
  ): string {
    const isAbove = value > expectedRange.max;
    const deviation = isAbove 
      ? ((value - expectedRange.max) / expectedRange.max * 100).toFixed(1)
      : ((expectedRange.min - value) / expectedRange.min * 100).toFixed(1);

    const direction = isAbove ? 'above' : 'below';
    const metricName = metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return `${metricName} is ${deviation}% ${direction} the expected range (${expectedRange.min.toFixed(2)} - ${expectedRange.max.toFixed(2)}). Current value: ${value.toFixed(2)}.`;
  }

  private async getDonationMetrics(): Promise<Record<string, number>> {
    // Mock donation metrics - in production, fetch from database
    return {
      donation_amount: 800 + Math.random() * 2000,
      donation_frequency: 5 + Math.random() * 10,
      average_donation: 150 + Math.random() * 100,
      donor_retention: 0.7 + Math.random() * 0.3
    };
  }

  private async getVolunteerMetrics(): Promise<Record<string, number>> {
    return {
      volunteer_hours: 12 + Math.random() * 20,
      volunteer_count: 45 + Math.random() * 30,
      attendance_rate: 0.8 + Math.random() * 0.2,
      new_volunteers: 2 + Math.random() * 8
    };
  }

  private async getProgramMetrics(): Promise<Record<string, number>> {
    return {
      program_completion_rate: 0.75 + Math.random() * 0.25,
      beneficiary_count: 80 + Math.random() * 40,
      budget_utilization: 0.6 + Math.random() * 0.4,
      program_duration: 30 + Math.random() * 60
    };
  }

  private updateBaselines(metrics: Record<string, number>): void {
    for (const [metric, value] of Object.entries(metrics)) {
      let baseline = this.baselines.get(metric) || [];
      baseline.push(value);
      
      // Keep only recent data (sliding window)
      baseline = baseline.slice(-100);
      this.baselines.set(metric, baseline);
    }
  }

  private cleanupOldAnomalies(): void {
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    this.anomalies = this.anomalies
      .filter(anomaly => anomaly.detectedAt.getTime() > cutoffTime)
      .slice(-1000); // Keep max 1000 anomalies
  }

  private groupAnomaliesByMetric(): Record<string, number> {
    return this.anomalies.reduce((acc, anomaly) => {
      acc[anomaly.metric] = (acc[anomaly.metric] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupAnomaliesBySeverity(): Record<string, number> {
    return this.anomalies.reduce((acc, anomaly) => {
      acc[anomaly.severity] = (acc[anomaly.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
