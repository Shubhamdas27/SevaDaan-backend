import { BaseAIService } from './BaseAIService';
import { SentimentAnalysis } from '../../types/ai';

export class NLPService extends BaseAIService {
  private sentimentHistory: SentimentAnalysis[] = [];
  private keywordDictionary: Map<string, { sentiment: number; weight: number }> = new Map();
  private emotionPatterns: Map<string, RegExp> = new Map();

  /**
   * Initialize NLP service with dictionaries and patterns
   */
  async initialize(): Promise<void> {
    await super.initialize();
    await this.loadSentimentDictionary();
    await this.loadEmotionPatterns();
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text: string, context?: string): Promise<SentimentAnalysis> {
    if (!this.config.nlp.enabled || !this.config.nlp.sentimentAnalysis) {
      throw new Error('Sentiment analysis is not enabled');
    }

    const cacheKey = this.getCacheKey('sentiment', { text: text.substring(0, 100) });
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const analysis = await this.performSentimentAnalysis(text);
    this.setCache(cacheKey, analysis);

    // Store in history
    this.sentimentHistory.push(analysis);
    this.cleanupSentimentHistory();

    this.logOperation('sentiment_analyzed', {
      textLength: text.length,
      sentiment: analysis.sentiment,
      score: analysis.score,
      context
    });

    this.emit('sentimentAnalyzed', analysis);
    return analysis;
  }

  /**
   * Analyze batch of texts
   */
  async analyzeBatchSentiment(texts: string[]): Promise<SentimentAnalysis[]> {
    const promises = texts.map(text => this.analyzeSentiment(text));
    return Promise.all(promises);
  }

  /**
   * Analyze feedback sentiment
   */
  async analyzeFeedback(feedback: string, source: string): Promise<SentimentAnalysis> {
    const analysis = await this.analyzeSentiment(feedback, `feedback_${source}`);
    
    // Additional processing for feedback
    if (analysis.sentiment === 'negative' && analysis.score < -0.5) {
      this.emit('negativeFeedbackDetected', {
        analysis,
        source,
        requiresAttention: true
      });
    }

    return analysis;
  }

  /**
   * Extract key insights from text corpus
   */
  async extractInsights(texts: string[]): Promise<{
    overallSentiment: { sentiment: string; score: number };
    topKeywords: Array<{ keyword: string; frequency: number; sentiment: number }>;
    emotionDistribution: Record<string, number>;
    topics: Array<{ topic: string; relevance: number }>;
  }> {
    const analyses = await this.analyzeBatchSentiment(texts);
    
    // Calculate overall sentiment
    const overallScore = analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length;
    const overallSentiment = this.scoresToSentiment(overallScore);

    // Extract and rank keywords
    const keywordFreq: Map<string, { count: number; sentimentSum: number }> = new Map();
    
    analyses.forEach(analysis => {
      analysis.keywords.forEach(keyword => {
        const current = keywordFreq.get(keyword) || { count: 0, sentimentSum: 0 };
        keywordFreq.set(keyword, {
          count: current.count + 1,
          sentimentSum: current.sentimentSum + analysis.score
        });
      });
    });

    const topKeywords = Array.from(keywordFreq.entries())
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.count,
        sentiment: data.sentimentSum / data.count
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    // Calculate emotion distribution
    const emotionDistribution: Record<string, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0
    };

    analyses.forEach(analysis => {
      Object.keys(emotionDistribution).forEach(emotion => {
        emotionDistribution[emotion] += analysis.emotions[emotion as keyof typeof analysis.emotions];
      });
    });

    // Normalize emotion distribution
    const emotionTotal = Object.values(emotionDistribution).reduce((sum, val) => sum + val, 0);
    if (emotionTotal > 0) {
      Object.keys(emotionDistribution).forEach(emotion => {
        emotionDistribution[emotion] /= emotionTotal;
      });
    }

    // Extract topics (simplified)
    const topics = this.extractTopics(analyses);

    return {
      overallSentiment: { sentiment: overallSentiment, score: overallScore },
      topKeywords,
      emotionDistribution,
      topics
    };
  }

  /**
   * Generate text summary
   */
  async generateSummary(texts: string[], maxLength: number = 200): Promise<string> {
    if (texts.length === 0) return '';

    // Simple extractive summarization
    const sentences = this.extractSentences(texts);
    const scoredSentences = sentences.map(sentence => ({
      text: sentence,
      score: this.calculateSentenceImportance(sentence, texts)
    }));

    // Sort by importance and select top sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.ceil(sentences.length * 0.3)); // Top 30% of sentences

    // Reconstruct summary maintaining order
    let summary = '';
    let currentLength = 0;

    for (const sentence of sentences) {
      if (topSentences.some(ts => ts.text === sentence)) {
        if (currentLength + sentence.length <= maxLength) {
          summary += sentence + ' ';
          currentLength += sentence.length + 1;
        } else {
          break;
        }
      }
    }

    return summary.trim();
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<string> {
    // Simple language detection based on character patterns
    // In production, use a proper language detection library
    
    const patterns = {
      'en': /^[a-zA-Z\s.,!?;:'"()-]+$/,
      'hi': /[\u0900-\u097F]/,
      'bn': /[\u0980-\u09FF]/,
      'te': /[\u0C00-\u0C7F]/,
      'ta': /[\u0B80-\u0BFF]/,
      'ml': /[\u0D00-\u0D7F]/,
      'kn': /[\u0C80-\u0CFF]/,
      'gu': /[\u0A80-\u0AFF]/,
      'pa': /[\u0A00-\u0A7F]/,
      'or': /[\u0B00-\u0B7F]/
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return lang;
      }
    }

    return 'unknown';
  }

  /**
   * Get sentiment history with filtering
   */
  getSentimentHistory(
    limit: number = 100,
    sentiment?: string,
    dateRange?: { start: Date; end: Date }
  ): SentimentAnalysis[] {
    let filtered = this.sentimentHistory;

    if (sentiment) {
      filtered = filtered.filter(analysis => analysis.sentiment === sentiment);
    }

    if (dateRange) {
      filtered = filtered.filter(analysis => 
        analysis.analyzedAt >= dateRange.start && analysis.analyzedAt <= dateRange.end
      );
    }

    return filtered
      .sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get sentiment statistics
   */
  getSentimentStatistics(): {
    total: number;
    distribution: Record<string, number>;
    averageScore: number;
    emotionAverages: Record<string, number>;
  } {
    const total = this.sentimentHistory.length;
    
    if (total === 0) {
      return {
        total: 0,
        distribution: { positive: 0, negative: 0, neutral: 0 },
        averageScore: 0,
        emotionAverages: { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0 }
      };
    }

    const distribution = this.sentimentHistory.reduce((acc, analysis) => {
      acc[analysis.sentiment] = (acc[analysis.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageScore = this.sentimentHistory.reduce((sum, analysis) => sum + analysis.score, 0) / total;

    const emotionAverages = {
      joy: this.sentimentHistory.reduce((sum, a) => sum + a.emotions.joy, 0) / total,
      sadness: this.sentimentHistory.reduce((sum, a) => sum + a.emotions.sadness, 0) / total,
      anger: this.sentimentHistory.reduce((sum, a) => sum + a.emotions.anger, 0) / total,
      fear: this.sentimentHistory.reduce((sum, a) => sum + a.emotions.fear, 0) / total,
      surprise: this.sentimentHistory.reduce((sum, a) => sum + a.emotions.surprise, 0) / total
    };

    return {
      total,
      distribution,
      averageScore,
      emotionAverages
    };
  }

  /**
   * Private methods
   */
  private async performSentimentAnalysis(text: string): Promise<SentimentAnalysis> {
    const preprocessedText = this.preprocessText(text);
    const words = preprocessedText.split(/\s+/);
    const keywords = this.extractKeywords(words);
    
    // Calculate sentiment score
    let sentimentScore = 0;
    let wordCount = 0;

    words.forEach(word => {
      const sentiment = this.keywordDictionary.get(word.toLowerCase());
      if (sentiment) {
        sentimentScore += sentiment.sentiment * sentiment.weight;
        wordCount++;
      }
    });

    // Normalize score
    const normalizedScore = wordCount > 0 ? sentimentScore / wordCount : 0;
    const clampedScore = Math.max(-1, Math.min(1, normalizedScore));

    // Determine sentiment category
    const sentiment = this.scoresToSentiment(clampedScore);

    // Analyze emotions
    const emotions = this.analyzeEmotions(text);

    // Extract topics
    const topics = this.extractSimpleTopics(keywords);

    return {
      id: this.generateId(),
      text: text.substring(0, 1000), // Store first 1000 chars
      sentiment,
      score: clampedScore,
      emotions,
      keywords: keywords.slice(0, 10), // Top 10 keywords
      topics,
      analyzedAt: new Date()
    };
  }

  private async loadSentimentDictionary(): Promise<void> {
    // Simplified sentiment dictionary
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
      'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'delighted',
      'success', 'helpful', 'effective', 'efficient', 'valuable', 'beneficial'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'disappointing', 'frustrating',
      'hate', 'dislike', 'annoying', 'angry', 'upset', 'sad', 'unhappy',
      'failure', 'useless', 'ineffective', 'wasteful', 'problematic', 'difficult'
    ];

    positiveWords.forEach(word => {
      this.keywordDictionary.set(word, { sentiment: 0.8, weight: 1.0 });
    });

    negativeWords.forEach(word => {
      this.keywordDictionary.set(word, { sentiment: -0.8, weight: 1.0 });
    });

    console.log(`Loaded sentiment dictionary with ${this.keywordDictionary.size} words`);
  }

  private async loadEmotionPatterns(): Promise<void> {
    this.emotionPatterns.set('joy', /\b(happy|joy|excited|cheerful|delighted|pleased|glad)\b/gi);
    this.emotionPatterns.set('sadness', /\b(sad|depressed|disappointed|unhappy|sorrowful)\b/gi);
    this.emotionPatterns.set('anger', /\b(angry|furious|mad|annoyed|irritated|frustrated)\b/gi);
    this.emotionPatterns.set('fear', /\b(scared|afraid|worried|anxious|nervous|concerned)\b/gi);
    this.emotionPatterns.set('surprise', /\b(surprised|amazed|shocked|astonished|unexpected)\b/gi);
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractKeywords(words: string[]): string[] {
    // Filter out common stop words and short words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    const wordFreq: Map<string, number> = new Map();
    
    words
      .filter(word => word.length > 2 && !stopWords.has(word))
      .forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });

    return Array.from(wordFreq.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([word]) => word);
  }

  private analyzeEmotions(text: string): {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
  } {
    const emotions = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0
    };

    for (const [emotion, pattern] of this.emotionPatterns) {
      const matches = text.match(pattern);
      emotions[emotion as keyof typeof emotions] = matches ? matches.length / 10 : 0;
    }

    return emotions;
  }

  private extractSimpleTopics(keywords: string[]): string[] {
    // Simple topic extraction based on keyword clustering
    const topicKeywords = {
      'donation': ['donation', 'money', 'fund', 'contribute', 'give'],
      'volunteer': ['volunteer', 'help', 'assist', 'support', 'participate'],
      'program': ['program', 'project', 'initiative', 'activity', 'event'],
      'education': ['education', 'school', 'learning', 'teach', 'student'],
      'health': ['health', 'medical', 'healthcare', 'treatment', 'hospital']
    };

    const topics: string[] = [];
    
    for (const [topic, topicWords] of Object.entries(topicKeywords)) {
      const relevance = keywords.filter(keyword => 
        topicWords.some(tw => keyword.includes(tw) || tw.includes(keyword))
      ).length;
      
      if (relevance > 0) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private extractTopics(analyses: SentimentAnalysis[]): Array<{ topic: string; relevance: number }> {
    const topicFreq: Map<string, number> = new Map();
    
    analyses.forEach(analysis => {
      analysis.topics.forEach(topic => {
        topicFreq.set(topic, (topicFreq.get(topic) || 0) + 1);
      });
    });

    return Array.from(topicFreq.entries())
      .map(([topic, count]) => ({
        topic,
        relevance: count / analyses.length
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  }

  private extractSentences(texts: string[]): string[] {
    const allText = texts.join(' ');
    return allText.split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 10);
  }

  private calculateSentenceImportance(sentence: string, corpus: string[]): number {
    const words = sentence.toLowerCase().split(/\s+/);
    let score = 0;

    // Calculate TF-IDF-like score
    words.forEach(word => {
      if (this.keywordDictionary.has(word)) {
        score += 1;
      }
    });

    // Normalize by sentence length
    return score / Math.max(words.length, 1);
  }

  private scoresToSentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }

  private cleanupSentimentHistory(): void {
    const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days
    this.sentimentHistory = this.sentimentHistory
      .filter(analysis => analysis.analyzedAt.getTime() > cutoffTime)
      .slice(-2000); // Keep max 2000 analyses
  }
}
