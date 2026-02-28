// Terminal Critic v2 - Modular Design Engine
// Core criticism engine with pluggable analysis modules

const EventEmitter = require('events');

class CriticEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      name: 'Terminal Critic v2',
      version: '2.0.0',
      strictMode: false,
      enableProfanityFilter: true,
      enableSentimentAnalysis: true,
      enableLengthAnalysis: true,
      enableContentAnalysis: true,
      customRules: [],
      ...config
    };
    
    this.analysisModules = new Map();
    this.stats = {
      totalAnalyzed: 0,
      approved: 0,
      rejected: 0,
      warnings: 0,
      startTime: Date.now()
    };
    
    // Load default analysis modules
    this.loadDefaultModules();
  }

  // Load built-in analysis modules
  loadDefaultModules() {
    if (this.config.enableProfanityFilter) {
      this.registerModule('profanity', new ProfanityAnalyzer());
    }
    
    if (this.config.enableSentimentAnalysis) {
      this.registerModule('sentiment', new SentimentAnalyzer());
    }
    
    if (this.config.enableLengthAnalysis) {
      this.registerModule('length', new LengthAnalyzer());
    }
    
    if (this.config.enableContentAnalysis) {
      this.registerModule('content', new ContentAnalyzer());
    }
    
    // Load custom rules as modules
    this.config.customRules.forEach((rule, index) => {
      this.registerModule(`custom-${index}`, new CustomRuleAnalyzer(rule));
    });
  }

  // Register an analysis module
  registerModule(name, analyzer) {
    if (!analyzer || typeof analyzer.analyze !== 'function') {
      throw new Error(`Invalid analyzer module: ${name}`);
    }
    
    this.analysisModules.set(name, analyzer);
    console.log(`[CriticEngine] Registered analysis module: ${name}`);
  }

  // Unregister an analysis module
  unregisterModule(name) {
    if (this.analysisModules.has(name)) {
      this.analysisModules.delete(name);
      console.log(`[CriticEngine] Unregistered analysis module: ${name}`);
      return true;
    }
    return false;
  }

  // Main analysis function
  async analyzeMessage(message) {
    this.stats.totalAnalyzed++;
    
    const analysis = {
      messageId: message.id,
      content: message.content,
      timestamp: Date.now(),
      modules: {},
      issues: [],
      warnings: [],
      score: 0,
      recommendation: 'pending'
    };

    try {
      // Run all analysis modules
      for (const [name, analyzer] of this.analysisModules) {
        try {
          const result = await analyzer.analyze(message.content, message);
          analysis.modules[name] = result;
          
          // Collect issues and warnings
          if (result.issues) {
            analysis.issues.push(...result.issues.map(issue => ({
              module: name,
              type: issue.type || 'error',
              message: issue.message,
              severity: issue.severity || 'medium',
              position: issue.position
            })));
          }
          
          if (result.warnings) {
            analysis.warnings.push(...result.warnings.map(warning => ({
              module: name,
              message: warning.message,
              severity: warning.severity || 'low'
            })));
          }
          
        } catch (error) {
          console.error(`[CriticEngine] Module ${name} failed:`, error);
          analysis.issues.push({
            module: name,
            type: 'system_error',
            message: `Analysis module failed: ${error.message}`,
            severity: 'low'
          });
        }
      }
      
      // Calculate overall score and recommendation
      this.calculateRecommendation(analysis);
      
      // Update statistics
      this.updateStats(analysis);
      
      // Emit analysis complete event
      this.emit('analysis-complete', analysis);
      
      return analysis;
      
    } catch (error) {
      console.error(`[CriticEngine] Analysis failed:`, error);
      analysis.issues.push({
        module: 'engine',
        type: 'system_error',
        message: `Critical analysis failure: ${error.message}`,
        severity: 'high'
      });
      analysis.recommendation = 'reject';
      return analysis;
    }
  }

  // Calculate final recommendation based on module results
  calculateRecommendation(analysis) {
    let totalScore = 0;
    let moduleCount = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    
    // Aggregate scores from modules
    for (const [name, result] of Object.entries(analysis.modules)) {
      if (typeof result.score === 'number') {
        totalScore += result.score;
        moduleCount++;
      }
    }
    
    // Count issue severities
    analysis.issues.forEach(issue => {
      if (issue.severity === 'critical') criticalIssues++;
      if (issue.severity === 'high') highIssues++;
    });
    
    // Calculate average score
    analysis.score = moduleCount > 0 ? totalScore / moduleCount : 0;
    
    // Determine recommendation
    if (criticalIssues > 0) {
      analysis.recommendation = 'reject';
      analysis.reason = 'Critical issues detected';
    } else if (highIssues > 0 && this.config.strictMode) {
      analysis.recommendation = 'reject';
      analysis.reason = 'High severity issues in strict mode';
    } else if (analysis.score < 0.3) {
      analysis.recommendation = 'reject';
      analysis.reason = 'Low overall quality score';
    } else if (analysis.score < 0.6) {
      analysis.recommendation = 'warning';
      analysis.reason = 'Moderate concerns detected';
    } else {
      analysis.recommendation = 'approve';
      analysis.reason = 'Passes all analysis checks';
    }
    
    // Apply custom override logic if needed
    this.applyCustomOverrides(analysis);
  }

  // Apply any custom override logic
  applyCustomOverrides(analysis) {
    // Emergency content detection
    const emergencyPatterns = [
      /\b(help|emergency|urgent|critical)\b/i,
      /\b(fire|medical|police|ambulance)\b/i
    ];
    
    if (emergencyPatterns.some(pattern => pattern.test(analysis.content))) {
      analysis.recommendation = 'approve';
      analysis.reason = 'Emergency content override';
      analysis.overrideApplied = 'emergency';
    }
    
    // Exhibition-specific overrides
    if (analysis.content.toLowerCase().includes('exhibition') || 
        analysis.content.toLowerCase().includes('art installation')) {
      // Slightly more lenient for art-related content
      if (analysis.score > 0.4 && analysis.recommendation === 'reject') {
        analysis.recommendation = 'warning';
        analysis.reason = 'Art context override - review recommended';
        analysis.overrideApplied = 'art_context';
      }
    }
  }

  // Update internal statistics
  updateStats(analysis) {
    switch (analysis.recommendation) {
      case 'approve':
        this.stats.approved++;
        break;
      case 'reject':
        this.stats.rejected++;
        break;
      case 'warning':
        this.stats.warnings++;
        break;
    }
  }

  // Get engine statistics
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      approvalRate: this.stats.totalAnalyzed > 0 ? 
        (this.stats.approved / this.stats.totalAnalyzed) * 100 : 0,
      activeModules: Array.from(this.analysisModules.keys()),
      moduleCount: this.analysisModules.size
    };
  }

  // Hot reload configuration
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Reload modules if module settings changed
    const moduleSettingsChanged = [
      'enableProfanityFilter',
      'enableSentimentAnalysis', 
      'enableLengthAnalysis',
      'enableContentAnalysis',
      'customRules'
    ].some(key => oldConfig[key] !== this.config[key]);
    
    if (moduleSettingsChanged) {
      this.analysisModules.clear();
      this.loadDefaultModules();
      console.log('[CriticEngine] Modules reloaded due to config change');
    }
    
    this.emit('config-updated', this.config);
  }

  // Export analysis results
  exportAnalysis(analysis) {
    return {
      timestamp: analysis.timestamp,
      messageId: analysis.messageId,
      recommendation: analysis.recommendation,
      reason: analysis.reason,
      score: analysis.score,
      issueCount: analysis.issues.length,
      warningCount: analysis.warnings.length,
      modules: Object.keys(analysis.modules),
      overrideApplied: analysis.overrideApplied || null
    };
  }
}

// Base class for analysis modules
class AnalysisModule {
  constructor(config = {}) {
    this.config = config;
  }

  async analyze(content, message) {
    throw new Error('analyze() method must be implemented by subclass');
  }
}

// Profanity detection module
class ProfanityAnalyzer extends AnalysisModule {
  constructor(config = {}) {
    super(config);
    this.profanityWords = [
      // Basic list - would be expanded in production
      'damn', 'hell', 'crap', 'stupid', 'idiot', 'hate', 'kill', 'die', 'death'
    ];
  }

  async analyze(content) {
    const words = content.toLowerCase().split(/\s+/);
    const issues = [];
    let profanityCount = 0;

    words.forEach((word, index) => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (this.profanityWords.includes(cleanWord)) {
        profanityCount++;
        issues.push({
          type: 'profanity',
          message: `Potentially inappropriate language: "${word}"`,
          severity: 'high',
          position: index
        });
      }
    });

    const score = Math.max(0, 1 - (profanityCount * 0.3));
    
    return {
      score,
      profanityCount,
      issues: issues,
      passed: profanityCount === 0
    };
  }
}

// Sentiment analysis module
class SentimentAnalyzer extends AnalysisModule {
  async analyze(content) {
    const positiveWords = ['love', 'good', 'great', 'amazing', 'wonderful', 'beautiful', 'happy', 'joy', 'peace'];
    const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'horrible', 'sad', 'angry', 'violence', 'war'];
    
    const words = content.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (positiveWords.includes(cleanWord)) positiveCount++;
      if (negativeWords.includes(cleanWord)) negativeCount++;
    });
    
    const sentimentScore = (positiveCount - negativeCount) / Math.max(1, words.length);
    const normalizedScore = Math.max(0, Math.min(1, (sentimentScore + 0.5) * 2));
    
    const issues = [];
    if (sentimentScore < -0.1) {
      issues.push({
        type: 'negative_sentiment',
        message: 'Message contains predominantly negative sentiment',
        severity: 'medium'
      });
    }
    
    return {
      score: normalizedScore,
      sentimentScore,
      positiveCount,
      negativeCount,
      issues,
      classification: sentimentScore > 0.1 ? 'positive' : 
                    sentimentScore < -0.1 ? 'negative' : 'neutral'
    };
  }
}

// Length and structure analysis
class LengthAnalyzer extends AnalysisModule {
  async analyze(content) {
    const length = content.length;
    const wordCount = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim()).length;
    
    const issues = [];
    const warnings = [];
    
    // Check length constraints
    if (length < 5) {
      issues.push({
        type: 'too_short',
        message: 'Message is extremely short',
        severity: 'medium'
      });
    } else if (length > 500) {
      warnings.push({
        message: 'Message is quite long',
        severity: 'low'
      });
    }
    
    // Check for spam patterns
    const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
    const repetitionRatio = uniqueWords / wordCount;
    
    if (repetitionRatio < 0.3 && wordCount > 10) {
      issues.push({
        type: 'repetitive_content',
        message: 'Message appears repetitive or spam-like',
        severity: 'high'
      });
    }
    
    // Calculate quality score
    let score = 1.0;
    if (length < 10) score *= 0.3;
    else if (length < 30) score *= 0.7;
    if (repetitionRatio < 0.5) score *= (repetitionRatio * 2);
    
    return {
      score: Math.max(0, Math.min(1, score)),
      length,
      wordCount,
      sentences,
      uniqueWords,
      repetitionRatio,
      issues,
      warnings
    };
  }
}

// Content appropriateness analysis
class ContentAnalyzer extends AnalysisModule {
  async analyze(content) {
    const issues = [];
    const warnings = [];
    
    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{4,}/g,  // Repeated characters
      /[A-Z]{5,}/g,  // Excessive caps
      /\b\w*(.)\1{2,}\w*\b/g  // Words with repeated chars
    ];
    
    spamPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        issues.push({
          type: 'spam_pattern',
          message: 'Content contains spam-like patterns',
          severity: 'medium'
        });
      }
    });
    
    // Check for appropriate exhibition content
    const artKeywords = ['art', 'create', 'design', 'beauty', 'color', 'form', 'expression'];
    const hasArtContent = artKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    if (hasArtContent) {
      warnings.push({
        message: 'Content appears art-related - good for exhibition context',
        severity: 'positive'
      });
    }
    
    // Score based on appropriateness
    let score = 1.0;
    if (issues.length > 0) score *= 0.5;
    if (hasArtContent) score = Math.min(1.0, score + 0.2);
    
    return {
      score,
      issues,
      warnings,
      hasArtContent,
      categories: {
        spam: issues.some(i => i.type === 'spam_pattern'),
        art: hasArtContent
      }
    };
  }
}

// Custom rule analyzer
class CustomRuleAnalyzer extends AnalysisModule {
  constructor(rule) {
    super();
    this.rule = rule;
  }

  async analyze(content) {
    const issues = [];
    
    if (this.rule.pattern && this.rule.pattern.test(content)) {
      issues.push({
        type: this.rule.type || 'custom_rule',
        message: this.rule.message || 'Custom rule violation',
        severity: this.rule.severity || 'medium'
      });
    }
    
    return {
      score: issues.length > 0 ? 0.3 : 1.0,
      issues,
      rule: this.rule.name || 'unnamed'
    };
  }
}

module.exports = { 
  CriticEngine, 
  AnalysisModule,
  ProfanityAnalyzer,
  SentimentAnalyzer,
  LengthAnalyzer,
  ContentAnalyzer,
  CustomRuleAnalyzer
};
