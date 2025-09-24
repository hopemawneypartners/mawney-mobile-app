import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import AIService from '../services/aiService';

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

export default function DailySummary({ articles }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    checkConfiguration();
  }, []);

  // Regenerate summary when articles change
  useEffect(() => {
    if (articles && articles.length > 0 && isConfigured) {
      console.log('📊 Articles changed, clearing summary. Article count:', articles.length);
      console.log('📊 Latest article titles:', articles.slice(0, 3).map(a => a.title));
      // Clear existing summary when articles change
      setSummary(null);
      setError(null);
    }
  }, [articles, isConfigured]);

  // Auto-generate summary when articles are cleared and ready
  useEffect(() => {
    if (articles && articles.length > 0 && isConfigured && !summary && !loading) {
      console.log('📊 Auto-generating summary for new articles');
      generateSummary();
    }
  }, [articles, isConfigured, summary, loading, generateSummary]);

  const checkConfiguration = async () => {
    const configured = await AIService.initialize();
    setIsConfigured(configured);
  };

  const generateSummary = useCallback(async () => {
    console.log('🔄 Generating summary with', articles?.length || 0, 'articles');
    console.log('🔄 FORCE REFRESH - AI Summary should work now!');
    setLoading(true);
    setError(null);

    try {
      const result = await AIService.generateDailySummary(articles);
      console.log('✅ Summary generated successfully');
      console.log('✅ Summary result:', result);
      setSummary(result);
    } catch (error) {
      console.error('❌ Error generating summary:', error);
      console.error('❌ Error details:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [articles]);

  const forceRefreshSummary = async () => {
    console.log('🔄 Force refreshing summary...');
    console.log('🔄 Current articles count:', articles?.length || 0);
    console.log('🔄 Latest article titles:', articles?.slice(0, 3).map(a => a.title) || []);
    setSummary(null);
    setError(null);
    await generateSummary();
  };

  const formatKeyPoint = (point) => {
    // Remove bullet points and clean up
    return point.replace(/^[•\-\*]\s*/, '').trim();
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Daily AI Summary</Text>
          <Text style={styles.subtitle}>Past 24 Hours</Text>
        </View>
        {!summary && !loading && (
          <TouchableOpacity style={styles.generateButton} onPress={generateSummary}>
            <Text style={styles.generateButtonText}>Generate Summary</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Analyzing articles...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={forceRefreshSummary}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {summary && (
        <ScrollView 
          style={styles.summaryScrollView}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          <View style={styles.summaryContent}>
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Executive Summary</Text>
              <Text style={styles.summaryText}>{summary.summary}</Text>
            </View>

            {summary.keyPoints && summary.keyPoints.length > 0 && (
              <View style={styles.keyPointsSection}>
                <Text style={styles.sectionTitle}>Key Points</Text>
                {summary.keyPoints.map((point, index) => (
                  <View key={index} style={styles.keyPointItem}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.keyPointText}>{formatKeyPoint(point)}</Text>
                  </View>
                ))}
              </View>
            )}

            {summary.marketInsights && (
              <View style={styles.insightsSection}>
                <Text style={styles.sectionTitle}>Market Insights</Text>
                <Text style={styles.insightsText}>{summary.marketInsights}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.refreshButton} onPress={forceRefreshSummary}>
              <Text style={styles.refreshButtonText}>Refresh Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.refreshButton, { backgroundColor: '#4CAF50', marginTop: 10 }]} onPress={async () => {
              console.log('🧪 TESTING AI SUMMARY API...');
              try {
                const response = await fetch('https://mawney-daily-news-api.onrender.com/api/ai/summary');
                const data = await response.json();
                console.log('🧪 AI SUMMARY API RESULT:', data);
                Alert.alert('AI Summary Test', `Success: ${data.success}. Summary: ${data.summary?.executive_summary?.slice(0, 100)}...`);
              } catch (error) {
                console.error('🧪 AI SUMMARY API ERROR:', error);
                Alert.alert('AI Summary Test', `Error: ${error.message}`);
              }
            }}>
              <Text style={styles.refreshButtonText}>Test AI Summary</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 5,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  generateButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  setupContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  setupText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  setupButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  setupButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    paddingVertical: 15,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryScrollView: {
    marginTop: 10,
  },
  summaryContent: {
    paddingBottom: 10,
  },
  summarySection: {
    marginBottom: 20,
  },
  keyPointsSection: {
    marginBottom: 20,
  },
  insightsSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  keyPointItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 14,
    color: colors.primary,
    marginRight: 8,
    marginTop: 2,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  insightsText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  refreshButton: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
});
