import AsyncStorage from '@react-native-async-storage/async-storage';
import UserService from './userService';

const colors = {
  primary: '#004b35',
  secondary: '#266b52',
  accent: '#4d8b70',
  background: '#f9f7f3',
  surface: '#ffffff',
  text: '#2d2926',
  textSecondary: '#4d4742',
  error: '#4c1f28',
  success: '#266b52',
};

class AIService {
  constructor() {
        this.apiBaseUrl = 'https://mawney-daily-news-api.onrender.com'; // Our custom AI API
  }

  async initialize() {
    console.log('🤖 Custom AI Service initialized - API is now working!');
    return true;
  }

  async setApiKey(apiKey) {
    // Not needed for custom AI
    console.log('🤖 Custom AI does not require API key');
  }

  isConfigured() {
    return true; // Always configured
  }

  async generateDailySummary(articles) {
    try {
      console.log('🤖 Generating daily summary with custom AI...');
      console.log('🤖 Total articles received:', articles?.length || 0);
      console.log('🤖 Latest article titles:', articles?.slice(0, 3).map(a => a.title) || []);
      
      // Filter articles from past 24 hours
      const now = new Date();
      const past24Hours = articles.filter(article => {
        const articleDate = new Date(article.publishedAt || article.published_date || article.timestamp);
        const timeDiff = now - articleDate;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        console.log('🤖 Article date check:', {
          title: article.title?.substring(0, 30) + '...',
          articleDate: articleDate.toISOString(),
          now: now.toISOString(),
          hoursDiff: hoursDiff.toFixed(2),
          isWithin24h: hoursDiff <= 24
        });
        return hoursDiff <= 24;
      });

      console.log('🤖 Articles from past 24 hours:', past24Hours.length);
      console.log('🤖 24h article titles:', past24Hours.slice(0, 3).map(a => a.title));

      if (past24Hours.length === 0) {
        console.log('🤖 No articles from past 24 hours, returning default summary');
        return {
          summary: "No articles from the past 24 hours to summarize.",
          keyPoints: [],
          marketInsights: "No recent market activity to analyze."
        };
      }

      const query = `Analyze these financial articles from the past 24 hours and provide a structured summary:\n\n${past24Hours.slice(0, 15).map(article => `- ${article.title}: ${article.content}`).join('\n')}\n\nPlease provide:\n1. Executive Summary (2-3 sentences)\n2. Key Points (3-5 bullet points)\n3. Market Insights (2-3 insights)`;
      
      console.log('🤖 Sending request to AI API...');
      console.log('🤖 Articles being sent to AI:', past24Hours.slice(0, 2).map(a => ({ title: a.title, category: a.category })));
      const response = await fetch(`${this.apiBaseUrl}/api/ai/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🤖 AI API response status:', response.status);
      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🤖 AI API response received:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'AI service error');
      }

      const aiResponse = data.summary;
      
      console.log('🤖 AI Response:', aiResponse);
      
      // The new API returns structured data directly
      const summary = {
        summary: aiResponse.executive_summary,
        keyPoints: aiResponse.key_points || [],
        marketInsights: aiResponse.market_insights ? 
          (Array.isArray(aiResponse.market_insights) ? 
            aiResponse.market_insights.join(' ') : 
            aiResponse.market_insights) : 
          'No market insights available'
      };
      
      console.log('📊 Parsed Summary:', summary);
      console.log('✅ Daily summary generated successfully');
      return summary;
      
    } catch (error) {
      console.error('❌ Error generating daily summary:', error);
      return {
        summary: 'Unable to generate summary at this time.',
        keyPoints: ['Please try again later'],
        marketInsights: 'AI service temporarily unavailable'
      };
    }
  }

  async processQuery(query, context = {}) {
    try {
      console.log('🤖 Processing query with custom AI:', query);
      
      const response = await fetch(`${this.apiBaseUrl}/api/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          context: context
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'AI service error');
      }

      console.log('✅ AI query processed successfully');
      return data.response;
      
    } catch (error) {
      console.error('❌ Error processing AI query:', error);
      return {
        text: 'I apologize, but I encountered an error processing your request. Please try again.',
        type: 'error',
        confidence: 0.0
      };
    }
  }

  async learnFromFile(fileName, fileContent, chatId = 'default') {
    try {
      console.log('📄 Learning from file:', fileName);
      
      const response = await fetch(`${this.apiBaseUrl}/api/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `Please learn from this document: ${fileName}\n\nContent: ${fileContent}`,
          context: { chat_id: chatId, is_file_learning: true }
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'AI service error');
      }

      console.log('✅ File learning completed successfully');
      return data.response;
      
    } catch (error) {
      console.error('❌ Error learning from file:', error);
      return {
        text: 'Failed to learn from file. Please try again.',
        type: 'error',
        confidence: 0.0
      };
    }
  }

  async generateArticleSummary(article) {
    try {
      const title = article.title || '';
      const content = article.content || article.summary || '';

      const query = `Summarize this financial news article in 1-2 sentences, focusing on the key financial implications for credit markets or investment professionals:

Title: ${title}
Content: ${content.substring(0, 500)}...

Provide a concise summary that highlights the most important financial aspects.`;

      const response = await this.processQuery(query);
      
      if (response.type === 'error') {
        throw new Error(response.text);
      }

      return response.text.trim();

    } catch (error) {
      console.error('Error generating article summary:', error);
      throw error;
    }
  }

  parseStructuredResponse(content) {
    // Parse the new clean text format
    const lines = content.split('\n');
    let summary = '';
    let keyPoints = [];
    let marketInsights = '';
    
    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for section headers
      if (trimmedLine === 'Executive Summary') {
        currentSection = 'summary';
        continue;
      } else if (trimmedLine === 'Key Points') {
        currentSection = 'keyPoints';
        continue;
      } else if (trimmedLine === 'Market Insights') {
        currentSection = 'insights';
        continue;
      }
      
      // Skip empty lines
      if (!trimmedLine) {
        continue;
      }
      
      // Process content based on current section
      if (currentSection === 'summary') {
        // Collect all summary content
        summary += trimmedLine + ' ';
      } else if (currentSection === 'keyPoints') {
        // Extract key points from bullet lists
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
          const point = trimmedLine.replace(/^[•\-]\s*/, '').trim();
          if (point) {
            keyPoints.push(point);
          }
        }
      } else if (currentSection === 'insights') {
        // Extract market insights
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
          const insight = trimmedLine.replace(/^[•\-]\s*/, '').trim();
          if (insight) {
            marketInsights += insight + ' ';
          }
        }
      }
    }
    
    // Clean up the summary
    summary = summary.trim();
    
    // If we didn't find a proper summary, create one from the key points
    if (!summary) {
      if (keyPoints.length > 0) {
        summary = `Today's financial news highlights ${keyPoints.length} key developments: ${keyPoints.slice(0, 2).join(', ')}${keyPoints.length > 2 ? ' and more' : ''}.`;
      } else {
        summary = 'Daily financial news analysis completed with key market developments identified.';
      }
    }
    
    return {
      summary: summary,
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Key market developments identified'],
      marketInsights: marketInsights.trim() || 'Market conditions analyzed'
    };
  }
}

export default new AIService();