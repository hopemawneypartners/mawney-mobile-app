import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  AppState,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DailySummary from '../components/DailySummary';
import NotificationService from '../services/notificationService';

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

export default function ArticlesScreen() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState('All Time');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
  const [lastArticleCheck, setLastArticleCheck] = useState(new Date());
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [notifiedArticles, setNotifiedArticles] = useState(new Set());
  
  const monitoringIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    loadArticles();
    loadNotifiedArticles();
    startArticleMonitoring();
    
    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      stopArticleMonitoring();
      subscription?.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground, check for new articles
      console.log('📱 App came to foreground, checking for new articles...');
      checkForNewArticles();
    }
    appStateRef.current = nextAppState;
  };

  const startArticleMonitoring = () => {
    if (monitoringIntervalRef.current) return;
    
    console.log('🔄 Starting article monitoring...');
    setMonitoringActive(true);
    
    // Check for new articles every 3 minutes
    monitoringIntervalRef.current = setInterval(() => {
      checkForNewArticles();
    }, 3 * 60 * 1000); // 3 minutes
  };

  const stopArticleMonitoring = () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
      setMonitoringActive(false);
      console.log('⏹️ Article monitoring stopped');
    }
  };

  const loadNotifiedArticles = async () => {
    try {
      const stored = await AsyncStorage.getItem('notified_articles');
      if (stored) {
        const notifiedArray = JSON.parse(stored);
        setNotifiedArticles(new Set(notifiedArray));
        console.log(`📱 Loaded ${notifiedArray.length} previously notified articles`);
      }
    } catch (error) {
      console.error('❌ Error loading notified articles:', error);
    }
  };

  const saveNotifiedArticles = async (newNotifiedArticles) => {
    try {
      const notifiedArray = Array.from(newNotifiedArticles);
      await AsyncStorage.setItem('notified_articles', JSON.stringify(notifiedArray));
    } catch (error) {
      console.error('❌ Error saving notified articles:', error);
    }
  };

  const checkForNewArticles = async () => {
    try {
      console.log('🔍 Checking for new articles...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${API_BASE_URL}/api/articles`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data.success || !data.articles) return;
      
      // Filter for recent articles (last 30 minutes) with high relevance
      const recentArticles = data.articles.filter(article => {
        const articleDate = new Date(article.publishedAt || article.published_date || article.timestamp || article.date);
        const timeDiff = (new Date() - articleDate) / (1000 * 60); // minutes
        return timeDiff <= 30 && (article.relevanceScore >= 3 || article.relevanceScore === undefined);
      });
      
      // Find articles that haven't been notified about yet
      const newArticles = recentArticles.filter(article => {
        const articleId = article.id || `${article.title}_${article.publishedAt || article.date}`;
        return !notifiedArticles.has(articleId);
      });
      
      if (newArticles.length > 0) {
        console.log(`📰 Found ${newArticles.length} new relevant articles to notify about!`);
        
        // Send notifications for new articles (limit to 3)
        const articlesToNotify = newArticles.slice(0, 3);
        for (const article of articlesToNotify) {
          const articleId = article.id || `${article.title}_${article.publishedAt || article.date}`;
          
          // Only send notification if we haven't notified about this article before
          if (!notifiedArticles.has(articleId)) {
            await NotificationService.scheduleArticleNotification(article);
            
            // Add to notified articles set
            setNotifiedArticles(prev => {
              const newSet = new Set([...prev, articleId]);
              saveNotifiedArticles(newSet);
              return newSet;
            });
            console.log(`📱 Notification sent for article: ${article.title?.slice(0, 50)}...`);
          }
        }
      }
      
      // Update articles list
      setArticles(data.articles);
      setLastArticleCheck(new Date());
      
    } catch (error) {
      console.error('❌ Error checking for new articles:', error);
    }
  };

  const loadArticles = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching articles from:', `${API_BASE_URL}/api/articles`);
      console.log('🔍 FORCE REFRESH - API should be working now!');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${API_BASE_URL}/api/articles`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 Received data:', data);
      console.log('📊 Articles count:', data.articles ? data.articles.length : 0);
      console.log('📊 Data success:', data.success);
      console.log('📊 First article:', data.articles?.[0]);
      console.log('📊 All articles:', data.articles);
      
            if (data.success) {
              console.log('✅ Setting articles:', data.articles?.length || 0);
              const newArticles = data.articles || [];
              setArticles(newArticles);
              
              // Articles loaded successfully - no notifications sent here
              // Notifications are only sent via checkForNewArticles() for genuinely new articles
            } else {
              console.error('❌ Failed to load articles:', data.error);
              setArticles([]);
            }
    } catch (error) {
      console.error('❌ Error loading articles:', error);
      setArticles([]);
      
      let errorMessage = 'Unable to load articles. Please check:';
      let errorDetails = '';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. The server may be slow to respond.';
        errorDetails = '• Try refreshing the page\n• Check if the API server is running\n• Ensure stable network connection';
      } else if (error.message.includes('HTTP 500')) {
        errorMessage = 'Server error occurred.';
        errorDetails = '• The API server encountered an error\n• Try refreshing the page\n• Check server logs';
      } else if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        errorMessage = 'Network connection failed.';
        errorDetails = '• Check your internet connection\n• The API server may be temporarily unavailable\n• Try refreshing the page';
      } else {
        errorDetails = `• Error: ${error.message}\n• Try refreshing the page\n• Check network connection`;
      }
      
      // Show user-friendly error message
      Alert.alert(
        'Connection Error',
        `${errorMessage}\n\n${errorDetails}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  };

  const categories = ['All', 'Market Moves', 'People Moves', 'Regulatory', 'Industry News'];

  console.log('🔍 RAW ARTICLES BEFORE FILTERING:', articles);
  console.log('🔍 ARTICLES COUNT:', articles.length);
  console.log('🔍 SEARCH QUERY:', searchQuery);
  console.log('🔍 SELECTED CATEGORY:', selectedCategory);
  console.log('🔍 SELECTED DATE FILTER:', selectedDateFilter);

  const filteredArticles = articles.filter(article => {
    try {
      // Safe search matching
      const matchesSearch = !searchQuery || 
        (article.title && article.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (article.content && article.content.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Safe category matching
      const matchesCategory = selectedCategory === 'All' || 
        (article.category && article.category.toLowerCase() === selectedCategory.toLowerCase());
      
      console.log('🔍 Filtering article:', {
        title: article.title?.slice(0, 30),
        category: article.category,
        selectedCategory,
        matchesCategory,
        searchQuery,
        matchesSearch
      });
      
      // Safe date filtering
      let matchesDate = true;
      if (article.publishedAt || article.published_date || article.timestamp || article.date) {
        try {
          const dateString = article.publishedAt || article.published_date || article.timestamp || article.date;
          const articleDate = new Date(dateString);
          const now = new Date();
          
          if (!isNaN(articleDate.getTime())) {
            const timeDiff = now - articleDate;
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            switch (selectedDateFilter) {
              case 'Past 24 Hours':
                matchesDate = timeDiff <= 24 * 60 * 60 * 1000 && timeDiff >= 0;
                // Debug logging for 24h filter
                if (selectedDateFilter === 'Past 24 Hours') {
                  console.log('🔍 24h Filter Debug:', {
                    title: article.title?.slice(0, 50),
                    articleDate: articleDate.toISOString(),
                    now: now.toISOString(),
                    timeDiff: timeDiff,
                    hoursDiff: hoursDiff.toFixed(2),
                    isWithin24h: matchesDate,
                    isFuture: timeDiff < 0
                  });
                }
                break;
              case 'Past Week':
                matchesDate = timeDiff <= 7 * 24 * 60 * 60 * 1000 && timeDiff >= 0;
                break;
              case 'Past Month':
                matchesDate = timeDiff <= 30 * 24 * 60 * 60 * 1000 && timeDiff >= 0;
                break;
              case 'All Time':
                matchesDate = true;
                break;
            }
          }
        } catch (dateError) {
          console.warn('Date parsing error:', dateError);
          matchesDate = true; // Include article if date parsing fails
        }
      }
      
      const finalMatch = matchesSearch && matchesCategory && matchesDate;
      console.log('🔍 Final filter result:', {
        title: article.title?.slice(0, 30),
        matchesSearch,
        matchesCategory,
        matchesDate,
        finalMatch
      });
      
      return finalMatch;
    } catch (error) {
      console.warn('Filter error for article:', article, error);
      return false; // Exclude problematic articles
    }
  });

  console.log('🔍 FILTERED ARTICLES COUNT:', filteredArticles.length);
  console.log('🔍 FILTERED ARTICLES:', filteredArticles);

  // Sort articles by date
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    try {
      const dateA = new Date(a.publishedAt || a.published_date || a.timestamp || a.date);
      const dateB = new Date(b.publishedAt || b.published_date || b.timestamp || b.date);
      
      // Handle invalid dates
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      // Sort based on sortOrder
      if (sortOrder === 'newest') {
        return dateB - dateA; // Newest first
      } else {
        return dateA - dateB; // Oldest first
      }
    } catch (error) {
      console.warn('Sorting error:', error);
      return 0;
    }
  });

  // Debug logging
  console.log('📱 Articles state:', articles.length);
  console.log('📱 Filtered articles:', filteredArticles.length);
  console.log('📱 Sorted articles:', sortedArticles.length);
  console.log('📱 Selected category:', selectedCategory);
  console.log('📱 Selected date filter:', selectedDateFilter);
  console.log('📱 Sort order:', sortOrder);
  console.log('📱 Search query:', searchQuery);
  if (articles.length > 0) {
    console.log('📱 First article:', articles[0]);
  }
  if (filteredArticles.length > 0) {
    console.log('📱 First filtered article:', filteredArticles[0]);
  } else {
    console.log('📱 No filtered articles - checking why...');
    if (articles.length > 0) {
      const firstArticle = articles[0];
      console.log('📱 First article date:', firstArticle.publishedAt || firstArticle.published_date || firstArticle.timestamp || firstArticle.date);
      console.log('📱 First article category:', firstArticle.category);
      console.log('📱 Category match:', selectedCategory === 'All' || (firstArticle.category && firstArticle.category.toLowerCase() === selectedCategory.toLowerCase()));
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      
      // Show exact date and time
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Unknown date';
    }
  };

  const handleArticlePress = async (article) => {
    const articleUrl = article.url || article.link;
    
    if (articleUrl) {
      try {
        const canOpen = await Linking.canOpenURL(articleUrl);
        if (canOpen) {
          await Linking.openURL(articleUrl);
        } else {
          Alert.alert('Error', 'Cannot open this link');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open article link');
      }
    } else {
      Alert.alert(
        article.title || 'Untitled Article',
        `${article.content || article.summary || 'No content available'}\n\nSource: ${article.source || 'Unknown'}\nCategory: ${article.category || 'Uncategorized'}\nPublished: ${formatDate(article.publishedAt || article.published_date || article.timestamp || article.date)}`,
        [{ text: 'OK' }]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading articles...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <DailySummary articles={articles} />
      
      {/* Monitoring Status Indicator */}
      {monitoringActive && (
        <View style={styles.monitoringIndicator}>
          <Text style={styles.monitoringText}>
            🔄 Auto-monitoring active • Last check: {lastArticleCheck.toLocaleTimeString()}
          </Text>
        </View>
      )}
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

          <View style={styles.dateFilterContainer}>
            <Text style={styles.filterLabel}>Time Period:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateFilterScroll}>
              {['Past 24 Hours', 'Past Week', 'Past Month', 'All Time'].map((dateFilter) => (
                <TouchableOpacity
                  key={dateFilter}
                  style={[
                    styles.dateFilterButton,
                    selectedDateFilter === dateFilter && styles.dateFilterButtonActive
                  ]}
                  onPress={() => {
                  try {
                    setSelectedDateFilter(dateFilter);
                  } catch (error) {
                    console.warn('Date filter error:', error);
                  }
                }}
                >
                  <Text style={[
                    styles.dateFilterText,
                    selectedDateFilter === dateFilter && styles.dateFilterTextActive
                  ]}>
                    {dateFilter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive
                ]}
                onPress={() => {
                  try {
                    setSelectedCategory(category);
                  } catch (error) {
                    console.warn('Category filter error:', error);
                  }
                }}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sortFilterContainer}>
            <Text style={styles.filterLabel}>Sort Order:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortFilterScroll}>
              {[
                { key: 'newest', label: 'Newest First' },
                { key: 'oldest', label: 'Oldest First' }
              ].map((sortOption) => (
                <TouchableOpacity
                  key={sortOption.key}
                  style={[
                    styles.sortFilterButton,
                    sortOrder === sortOption.key && styles.sortFilterButtonActive
                  ]}
                  onPress={() => {
                    try {
                      setSortOrder(sortOption.key);
                    } catch (error) {
                      console.warn('Sort filter error:', error);
                    }
                  }}
                >
                  <Text style={[
                    styles.sortFilterText,
                    sortOrder === sortOption.key && styles.sortFilterTextActive
                  ]}>
                    {sortOption.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

      <View style={styles.articlesContainer}>
        {sortedArticles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No articles match your search' : 'No articles available'}
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadArticles}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.accent, marginTop: 10 }]} onPress={checkForNewArticles}>
              <Text style={styles.refreshButtonText}>Check for New Articles</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.refreshButton, { backgroundColor: '#ff6b6b', marginTop: 10 }]} onPress={async () => {
              console.log('🧪 TESTING API CONNECTION...');
              try {
                const response = await fetch('https://mawney-daily-news-api.onrender.com/api/health');
                const data = await response.json();
                console.log('🧪 API TEST RESULT:', data);
                Alert.alert('API Test', `API is working! Status: ${data.status}`);
              } catch (error) {
                console.error('🧪 API TEST ERROR:', error);
                Alert.alert('API Test', `API Error: ${error.message}`);
              }
            }}>
              <Text style={styles.refreshButtonText}>Test API</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.refreshButton, { backgroundColor: '#4CAF50', marginTop: 10 }]} onPress={async () => {
              console.log('🧪 TESTING ARTICLES API...');
              try {
                const response = await fetch('https://mawney-daily-news-api.onrender.com/api/articles');
                const data = await response.json();
                console.log('🧪 ARTICLES API RESULT:', data);
                Alert.alert('Articles Test', `Found ${data.articles?.length || 0} articles. Success: ${data.success}`);
              } catch (error) {
                console.error('🧪 ARTICLES API ERROR:', error);
                Alert.alert('Articles Test', `Error: ${error.message}`);
              }
            }}>
              <Text style={styles.refreshButtonText}>Test Articles</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sortedArticles.map((article, index) => (
            <TouchableOpacity
              key={`${article.id || 'article'}-${index}-${article.title?.slice(0, 10) || 'untitled'}`}
              style={styles.articleCard}
              onPress={() => handleArticlePress(article)}
            >
              <View style={styles.articleHeader}>
                <Text style={styles.articleCategory}>{article.category || 'Uncategorized'}</Text>
                <Text style={styles.articleTime}>{formatDate(article.publishedAt || article.published_date || article.timestamp || article.date)}</Text>
              </View>
              <Text style={styles.articleTitle}>{article.title || 'Untitled Article'}</Text>
              <Text style={styles.articleSource}>Source: {article.source || 'Unknown'}</Text>
              <Text style={styles.articleSummary}>{article.content || article.summary || 'No content available'}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 10,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    color: colors.text,
  },
  dateFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  dateFilterScroll: {
    marginBottom: 0,
    flexShrink: 0,
    flexGrow: 0,
  },
  dateFilterButton: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  dateFilterButtonActive: {
    backgroundColor: colors.primary,
  },
  dateFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  dateFilterTextActive: {
    color: colors.surface,
  },
  sortFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  sortFilterScroll: {
    marginBottom: 0,
    flexShrink: 0,
    flexGrow: 0,
  },
  sortFilterButton: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  sortFilterButtonActive: {
    backgroundColor: colors.primary,
  },
  sortFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  sortFilterTextActive: {
    color: colors.surface,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
    paddingBottom: 0,
    flexShrink: 0,
    flexGrow: 0,
  },
  categoryButton: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.surface,
  },
  articlesContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
  },
  articleCard: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
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
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  articleCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  articleTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  articleSource: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  articleSummary: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  refreshButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  monitoringIndicator: {
    backgroundColor: colors.accent,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  monitoringText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '500',
  },
});
