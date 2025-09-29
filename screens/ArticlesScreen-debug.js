import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';

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

const API_BASE_URL = 'https://mawney-daily-news-api.onrender.com';

export default function ArticlesScreenDebug() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo('Starting to load articles...');
      
      console.log('🌐 Web ArticlesScreen - Loading articles...');
      console.log('🌐 Platform:', Platform.OS);
      console.log('🌐 API URL:', `${API_BASE_URL}/api/articles`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      setDebugInfo('Making API request...');
      
      const response = await fetch(`${API_BASE_URL}/api/articles`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('🌐 Response status:', response.status);
      console.log('🌐 Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🌐 Response data:', data);
      
      setDebugInfo(`API Response: ${response.status} - ${data.articles?.length || 0} articles`);
      
      if (data.success && data.articles) {
        setArticles(data.articles);
        console.log('🌐 Articles loaded successfully:', data.articles.length);
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (error) {
      console.error('🌐 Error loading articles:', error);
      setError(error.message);
      setDebugInfo(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Articles (Web Debug)</Text>
        <Text style={styles.subtitle}>Loading articles...</Text>
        <Text style={styles.debug}>{debugInfo}</Text>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Articles (Web Debug)</Text>
        <Text style={styles.error}>Error: {error}</Text>
        <Text style={styles.debug}>{debugInfo}</Text>
        <TouchableOpacity style={styles.button} onPress={loadArticles}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Articles (Web Debug)</Text>
      <Text style={styles.subtitle}>Found {articles.length} articles</Text>
      <Text style={styles.debug}>{debugInfo}</Text>
      
      <ScrollView style={styles.scrollView}>
        {articles.map((article, index) => (
          <View key={index} style={styles.articleCard}>
            <Text style={styles.articleTitle}>{article.title}</Text>
            <Text style={styles.articleSource}>{article.source}</Text>
            <Text style={styles.articleDate}>{article.date}</Text>
          </View>
        ))}
      </ScrollView>
      
      <TouchableOpacity style={styles.button} onPress={loadArticles}>
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  debug: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  error: {
    fontSize: 16,
    color: colors.error,
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: colors.surface,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  articleCard: {
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  articleSource: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  articleDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
