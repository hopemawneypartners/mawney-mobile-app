import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
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

export default function ArticlesScreenSimple() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching articles from:', `${API_BASE_URL}/api/articles`);
      
      const response = await fetch(`${API_BASE_URL}/api/articles`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 Received data:', data);
      console.log('📊 Articles count:', data.articles ? data.articles.length : 0);
      console.log('📊 Data success:', data.success);
      
      if (data.success && data.articles) {
        console.log('✅ Setting articles:', data.articles.length);
        setArticles(data.articles);
      } else {
        console.error('❌ Failed to load articles:', data.error);
        setArticles([]);
      }
    } catch (error) {
      console.error('❌ Error loading articles:', error);
      setArticles([]);
      Alert.alert('Error', `Failed to load articles: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily News</Text>
        <Text style={styles.headerSubtitle}>
          {articles.length} articles loaded
        </Text>
      </View>
      
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading articles...</Text>
        </View>
      ) : articles.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No articles found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadArticles}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.articlesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        >
          {articles.map((article, index) => (
            <TouchableOpacity
              key={article.id || index}
              style={styles.articleCard}
              onPress={() => {
                Alert.alert(
                  article.title || 'Untitled Article',
                  `${article.content || 'No content available'}\n\nSource: ${article.source || 'Unknown'}\nDate: ${formatDate(article.date || article.published_date || article.publishedAt)}`
                );
              }}
            >
              <Text style={styles.articleTitle}>
                {article.title || 'Untitled Article'}
              </Text>
              <Text style={styles.articleSource}>
                Source: {article.source || 'Unknown'}
              </Text>
              <Text style={styles.articleDate}>
                Date: {formatDate(article.date || article.published_date || article.publishedAt)}
              </Text>
              <Text style={styles.articleContent}>
                {article.content || 'No content available'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: colors.surface,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  articlesList: {
    flex: 1,
    padding: 20,
  },
  articleCard: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  articleSource: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 4,
  },
  articleDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  articleContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
