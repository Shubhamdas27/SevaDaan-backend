import { BaseAIService } from './BaseAIService';
import { AIInsight, InsightRequest, TrendAnalysis } from '../../types/ai';

export class InsightsService extends BaseAIService {
  private insightHistory: AIInsight[] = [];
  private trendCache: Map<string, TrendAnalysis> = new Map();

  /**
   * Generate automated insights from data
   */
  async generateInsights(request?: InsightRequest): Promise<AIInsight[]> {
    if (!this.config.insights.enabled) {
      return [];
    }

    const insights: AIInsight[] = [];

    // Generate different types of insights
    const trendInsights = await this.generateTrendInsights(request);
    const opportunityInsights = await this.generateOpportunityInsights(request);
    const riskInsights = await this.generateRiskInsights(request);
    const performanceInsights = await this.generatePerformanceInsights(request);

    insights.push(...trendInsights, ...opportunityInsights, ...riskInsights, ...performanceInsights);

    // Filter by minimum confidence
    const filteredInsights = insights.filter(
      insight => insight.confidence >= this.config.insights.minConfidence
    );

    // Store in history
    filteredInsights.forEach(insight => {
      this.insightHistory.push(insight);
    });

    // Keep only recent insights
    this.insightHistory = this.insightHistory
      .filter(insight => 
        Date.now() - insight.generatedAt.getTime() < 30 * 24 * 60 * 60 * 1000 // 30 days
      )
      .slice(-1000); // Max 1000 insights

    this.logOperation('insights_generated', {
      total: insights.length,
      filtered: filteredInsights.length,
      types: this.groupInsightsByType(filteredInsights)
    });

    return filteredInsights;
  }

  /**
   * Generate trend-based insights
   */
  private async generateTrendInsights(request?: InsightRequest): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    // Donation trends
    const donationTrend = await this.analyzeDonationTrends();
    if (donationTrend.trend === 'increasing' && donationTrend.slope > 0.1) {
      insights.push({
        id: this.generateId(),
        type: 'trend',
        title: 'Rising Donation Trend Detected',
        description: `Donations have increased by ${(donationTrend.slope * 100).toFixed(1)}% over the analyzed period. This positive trend suggests effective fundraising strategies.`,
        severity: 'medium',
        confidence: 0.85,
        data: donationTrend,
        suggestions: [
          'Continue current fundraising campaigns',
          'Consider expanding successful programs',
          'Document successful strategies for future reference'
        ],
        generatedAt: new Date(),
        status: 'new'
      });
    } else if (donationTrend.trend === 'decreasing' && donationTrend.slope < -0.1) {
      insights.push({
        id: this.generateId(),
        type: 'trend',
        title: 'Declining Donation Trend',
        description: `Donations have decreased by ${Math.abs(donationTrend.slope * 100).toFixed(1)}% over the analyzed period. Immediate attention may be required.`,
        severity: 'high',
        confidence: 0.88,
        data: donationTrend,
        suggestions: [
          'Review and revise fundraising strategies',
          'Increase donor outreach efforts',
          'Analyze competitor activities',
          'Consider launching emergency fundraising campaigns'
        ],
        generatedAt: new Date(),
        status: 'new'
      });
    }

    // Volunteer engagement trends
    const volunteerTrend = await this.analyzeVolunteerEngagement();
    if (volunteerTrend.trend === 'decreasing') {
      insights.push({
        id: this.generateId(),
        type: 'trend',
        title: 'Volunteer Engagement Declining',
        description: 'Volunteer participation has been decreasing. This could impact program delivery capacity.',
        severity: 'medium',
        confidence: 0.75,
        data: volunteerTrend,
        suggestions: [
          'Launch volunteer recruitment campaign',
          'Improve volunteer onboarding process',
          'Provide additional training and support',
          'Review volunteer feedback for improvement areas'
        ],
        generatedAt: new Date(),
        status: 'new'
      });
    }

    return insights;
  }

  /**
   * Generate opportunity-based insights
   */
  private async generateOpportunityInsights(request?: InsightRequest): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Seasonal opportunities
    const month = new Date().getMonth();
    if (month === 10) { // November - holiday season approaching
      insights.push({
        id: this.generateId(),
        type: 'opportunity',
        title: 'Holiday Season Fundraising Opportunity',
        description: 'Historical data shows 40% increase in donations during November-December. Prepare for holiday campaigns.',
        severity: 'medium',
        confidence: 0.92,
        data: { season: 'holiday', historical_increase: 0.4 },
        suggestions: [
          'Launch holiday-themed fundraising campaigns',
          'Prepare year-end donation drives',
          'Create gift donation programs',
          'Increase social media presence'
        ],
        generatedAt: new Date(),
        status: 'new'
      });
    }

    // Program expansion opportunities
    const programPerformance = await this.analyzePrograms();
    const topPrograms = programPerformance.filter(p => p.success_rate > 0.8);
    
    if (topPrograms.length > 0) {
      insights.push({
        id: this.generateId(),
        type: 'opportunity',
        title: 'High-Performing Programs Ready for Expansion',
        description: `${topPrograms.length} programs show excellent success rates (>80%). Consider scaling these initiatives.`,
        severity: 'medium',
        confidence: 0.82,
        data: { programs: topPrograms.map(p => p.name) },
        suggestions: [
          'Develop expansion plans for top programs',
          'Secure additional funding for scaling',
          'Recruit additional staff and volunteers',
          'Document best practices for replication'
        ],
        generatedAt: new Date(),
        status: 'new'
      });
    }

    return insights;
  }

  /**
   * Generate risk-based insights
   */
  private async generateRiskInsights(request?: InsightRequest): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Budget utilization risks
    const budgetUtilization = await this.analyzeBudgetUtilization();
    if (budgetUtilization.utilizationRate < 0.5 && budgetUtilization.quarterProgress > 0.75) {
      insights.push({
        id: this.generateId(),
        type: 'risk',
        title: 'Low Budget Utilization Risk',
        description: `Only ${(budgetUtilization.utilizationRate * 100).toFixed(1)}% of budget utilized with ${(budgetUtilization.quarterProgress * 100).toFixed(1)}% of quarter elapsed.`,
        severity: 'high',
        confidence: 0.9,
        data: budgetUtilization,
        suggestions: [
          'Accelerate program implementation',
          'Review procurement processes',
          'Reallocate funds to active programs',
          'Plan for budget revision if necessary'
        ],
        generatedAt: new Date(),
        status: 'new'
      });
    }

    // Volunteer retention risks
    const volunteerRetention = await this.analyzeVolunteerRetention();
    if (volunteerRetention.atRiskCount > 10) {
      insights.push({
        id: this.generateId(),
        type: 'risk',
        title: 'Volunteer Retention Risk',
        description: `${volunteerRetention.atRiskCount} volunteers show signs of disengagement and may leave soon.`,
        severity: 'medium',
        confidence: 0.78,
        data: volunteerRetention,
        suggestions: [
          'Reach out to at-risk volunteers',
          'Conduct retention interviews',
          'Improve volunteer recognition programs',
          'Provide additional support and training'
        ],
        generatedAt: new Date(),
        status: 'new'
      });
    }

    return insights;
  }

  /**
   * Generate performance-based insights
   */
  private async generatePerformanceInsights(request?: InsightRequest): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // KPI performance analysis
    const kpiPerformance = await this.analyzeKPIPerformance();
    
    const underperformingKPIs = kpiPerformance.filter(kpi => kpi.performance < 0.7);
    if (underperformingKPIs.length > 0) {
      insights.push({
        id: this.generateId(),
        type: 'recommendation',
        title: 'Underperforming KPIs Identified',
        description: `${underperformingKPIs.length} KPIs are below target performance. Strategic intervention may be needed.`,
        severity: 'medium',
        confidence: 0.85,
        data: { underperforming: underperformingKPIs.map(kpi => kpi.name) },
        suggestions: [
          'Review strategies for underperforming areas',
          'Allocate additional resources to struggling KPIs',
          'Set up monitoring alerts for early intervention',
          'Consider revising unrealistic targets'
        ],
        generatedAt: new Date(),
        status: 'new'
      });
    }

    const outperformingKPIs = kpiPerformance.filter(kpi => kpi.performance > 1.2);
    if (outperformingKPIs.length > 0) {
      insights.push({
        id: this.generateId(),
        type: 'opportunity',
        title: 'Exceptional KPI Performance',
        description: `${outperformingKPIs.length} KPIs are significantly exceeding targets. Learn from these successes.`,
        severity: 'low',
        confidence: 0.88,
        data: { outperforming: outperformingKPIs.map(kpi => kpi.name) },
        suggestions: [
          'Document success factors for replication',
          'Share best practices across teams',
          'Consider raising targets for next period',
          'Recognize and reward high-performing teams'
        ],
        generatedAt: new Date(),
        status: 'new'
      });
    }

    return insights;
  }

  /**
   * Get insight history with filtering
   */
  getInsightHistory(
    type?: string,
    severity?: string,
    limit: number = 50
  ): AIInsight[] {
    let filtered = this.insightHistory;

    if (type) {
      filtered = filtered.filter(insight => insight.type === type);
    }

    if (severity) {
      filtered = filtered.filter(insight => insight.severity === severity);
    }

    return filtered
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Update insight status
   */
  async updateInsightStatus(
    insightId: string, 
    status: 'acknowledged' | 'acted_upon' | 'dismissed'
  ): Promise<void> {
    const insight = this.insightHistory.find(i => i.id === insightId);
    if (insight) {
      insight.status = status;
      this.emit('insightStatusUpdated', { insightId, status });
    }
  }

  /**
   * Get insights summary
   */
  getInsightsSummary(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: number;
  } {
    const recent = this.insightHistory.filter(
      insight => Date.now() - insight.generatedAt.getTime() < 7 * 24 * 60 * 60 * 1000
    ).length;

    return {
      total: this.insightHistory.length,
      byType: this.groupInsightsByType(this.insightHistory),
      bySeverity: this.groupInsightsBySeverity(this.insightHistory),
      recent
    };
  }

  /**
   * Helper methods for data analysis
   */
  private async analyzeDonationTrends(): Promise<TrendAnalysis> {
    // Mock trend analysis - in production, analyze actual data
    return {
      metric: 'donations',
      timeframe: '30d',
      trend: Math.random() > 0.5 ? 'increasing' : 'decreasing',
      slope: (Math.random() - 0.5) * 0.4, // -0.2 to 0.2
      correlation: 0.85,
      forecast: {
        values: Array.from({ length: 7 }, (_, i) => 1000 + Math.random() * 500),
        confidence: Array.from({ length: 7 }, () => 0.8 + Math.random() * 0.2),
        dates: Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 24 * 60 * 60 * 1000))
      }
    };
  }

  private async analyzeVolunteerEngagement(): Promise<TrendAnalysis> {
    return {
      metric: 'volunteer_engagement',
      timeframe: '30d',
      trend: Math.random() > 0.3 ? 'stable' : 'decreasing',
      slope: (Math.random() - 0.7) * 0.3,
      correlation: 0.72,
      forecast: {
        values: Array.from({ length: 7 }, (_, i) => 0.7 + Math.random() * 0.3),
        confidence: Array.from({ length: 7 }, () => 0.75 + Math.random() * 0.15),
        dates: Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 24 * 60 * 60 * 1000))
      }
    };
  }

  private async analyzePrograms(): Promise<Array<{ name: string; success_rate: number }>> {
    return [
      { name: 'Education Support Program', success_rate: 0.92 },
      { name: 'Healthcare Initiative', success_rate: 0.85 },
      { name: 'Community Development', success_rate: 0.78 },
      { name: 'Environmental Conservation', success_rate: 0.88 }
    ];
  }

  private async analyzeBudgetUtilization(): Promise<{
    utilizationRate: number;
    quarterProgress: number;
  }> {
    return {
      utilizationRate: 0.35 + Math.random() * 0.5,
      quarterProgress: 0.6 + Math.random() * 0.3
    };
  }

  private async analyzeVolunteerRetention(): Promise<{
    atRiskCount: number;
    totalVolunteers: number;
  }> {
    return {
      atRiskCount: Math.floor(Math.random() * 25),
      totalVolunteers: 150
    };
  }

  private async analyzeKPIPerformance(): Promise<Array<{
    name: string;
    performance: number;
  }>> {
    return [
      { name: 'Donation Growth', performance: 0.95 },
      { name: 'Volunteer Retention', performance: 0.65 },
      { name: 'Program Completion Rate', performance: 1.25 },
      { name: 'Beneficiary Satisfaction', performance: 0.88 },
      { name: 'Cost Efficiency', performance: 1.15 }
    ];
  }

  private groupInsightsByType(insights: AIInsight[]): Record<string, number> {
    return insights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupInsightsBySeverity(insights: AIInsight[]): Record<string, number> {
    return insights.reduce((acc, insight) => {
      acc[insight.severity] = (acc[insight.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
