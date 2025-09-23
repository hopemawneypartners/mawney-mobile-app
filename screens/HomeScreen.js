import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({
    articles: 0,
    todos: 0,
    pendingTodos: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    try {
      // Load todos from storage
      const todosData = await AsyncStorage.getItem('mawney_todos');
      const todos = todosData ? JSON.parse(todosData) : [];
      
      // Load article count from API
      let articleCount = 0;
      try {
        const response = await fetch('https://mawney-daily-news-api.onrender.com/api/articles');
        const data = await response.json();
        if (data.success) {
          articleCount = data.articles.length;
        }
      } catch (error) {
        console.error('Error loading article count:', error);
      }
      
      setStats({
        articles: articleCount,
        todos: todos.length,
        pendingTodos: todos.filter(todo => !todo.completed).length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleQuickAction = (action) => {
    console.log('🔗 Home quick action pressed:', action);
    console.log('🔗 Navigation object:', navigation);
    
    switch (action) {
      case 'articles':
        console.log('🔗 Navigating to Articles...');
        navigation.navigate('Articles');
        break;
      case 'todos':
        console.log('🔗 Navigating to Todos...');
        navigation.navigate('Todos');
        break;
      case 'ai':
        console.log('🔗 Navigating to AI Assistant...');
        navigation.navigate('AIAssistant');
        break;
      case 'calls':
        console.log('🔗 Navigating to Call Notes...');
        navigation.navigate('Calls');
        break;
      default:
        console.log('❌ Unknown action:', action);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, Hope!</Text>
        <Text style={styles.subtitle}>Here's your daily overview</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.articles}</Text>
          <Text style={styles.statLabel}>New Articles</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pendingTodos}</Text>
          <Text style={styles.statLabel}>Pending Tasks</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.todos}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleQuickAction('articles')}
        >
          <Text style={styles.actionIcon}>■</Text>
          <Text style={styles.actionText}>View Articles</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleQuickAction('todos')}
        >
          <Text style={styles.actionIcon}>□</Text>
          <Text style={styles.actionText}>Manage Todos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleQuickAction('ai')}
        >
          <Text style={styles.actionIcon}>▲</Text>
          <Text style={styles.actionText}>AI Assistant</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleQuickAction('calls')}
        >
          <Text style={styles.actionIcon}>●</Text>
          <Text style={styles.actionText}>Call Notes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
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
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
  actionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
