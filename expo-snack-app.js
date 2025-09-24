import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, StatusBar, Alert, Platform, Image, TouchableOpacity, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Brand colors
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

// Simple Home Screen
function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const quickActions = [
    { title: 'Articles', icon: '📰', screen: 'Articles' },
    { title: 'To Dos', icon: '✅', screen: 'Todos' },
    { title: 'Calls', icon: '📞', screen: 'CallNotes' },
    { title: 'AI Assistant', icon: '🤖', screen: 'AIAssistant' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
            </Text>
            <Text style={styles.userName}>
              {user ? `${user.firstName} ${user.lastName}` : 'Welcome'}
            </Text>
          </View>
          <Image 
            source={{ uri: 'https://via.placeholder.com/50x50/004b35/ffffff?text=MP' }}
            style={styles.logo}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>New Articles</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>5</Text>
          <Text style={styles.statLabel}>To Dos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>3</Text>
          <Text style={styles.statLabel}>Calls</Text>
        </View>
      </View>
    </View>
  );
}

// Simple Articles Screen
function ArticlesScreen() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://mawney-daily-news-api.onrender.com/api/articles');
      const data = await response.json();
      
      if (data.success) {
        setArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
      Alert.alert('Error', 'Failed to load articles. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily News</Text>
      </View>
      
      {loading ? (
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading articles...</Text>
        </View>
      ) : (
        <View style={styles.articlesList}>
          {articles.slice(0, 10).map((article, index) => (
            <View key={index} style={styles.articleCard}>
              <Text style={styles.articleTitle}>{article.title}</Text>
              <Text style={styles.articleSource}>{article.source}</Text>
              <Text style={styles.articleDate}>
                {new Date(article.published_date).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Simple Todos Screen
function TodosScreen() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Review quarterly reports', completed: false },
    { id: 2, text: 'Call client about new project', completed: true },
    { id: 3, text: 'Prepare presentation for meeting', completed: false },
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>To Do List</Text>
      </View>
      
      <View style={styles.todosList}>
        {todos.map((todo) => (
          <View key={todo.id} style={styles.todoItem}>
            <Text style={[styles.todoText, todo.completed && styles.todoCompleted]}>
              {todo.text}
            </Text>
            <Text style={styles.todoStatus}>
              {todo.completed ? '✅' : '⏳'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Simple Call Notes Screen
function CallNotesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Call Notes</Text>
      </View>
      
      <View style={styles.centerContent}>
        <Text style={styles.placeholderText}>Call Notes functionality</Text>
        <Text style={styles.placeholderSubtext}>Import from Microsoft Teams</Text>
      </View>
    </View>
  );
}

// Simple AI Assistant Screen
function AIAssistantScreen() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I\'m your AI assistant. How can I help you today?', isUser: false },
  ]);
  const [inputText, setInputText] = useState('');

  const sendMessage = () => {
    if (inputText.trim()) {
      setMessages(prev => [...prev, { id: Date.now(), text: inputText, isUser: true }]);
      setInputText('');
      
      // Simulate AI response
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          text: 'I understand. Let me help you with that.', 
          isUser: false 
        }]);
      }, 1000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
      </View>
      
      <View style={styles.chatContainer}>
        {messages.map((message) => (
          <View key={message.id} style={[
            styles.message,
            message.isUser ? styles.userMessage : styles.aiMessage
          ]}>
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me anything..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.accent,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 5,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tab.Screen 
        name="Articles" 
        component={ArticlesScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📰</Text>,
        }}
      />
      <Tab.Screen 
        name="Todos" 
        component={TodosScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✅</Text>,
        }}
      />
      <Tab.Screen 
        name="CallNotes" 
        component={CallNotesScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📞</Text>,
        }}
      />
      <Tab.Screen 
        name="AIAssistant" 
        component={AIAssistantScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🤖</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Component
export default function App() {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: colors.surface,
    fontSize: 16,
    opacity: 0.9,
  },
  userName: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  headerTitle: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 15,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
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
  },
  placeholderText: {
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  articlesList: {
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  articleSource: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  articleDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  todosList: {
    padding: 20,
  },
  todoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  todoText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  todoCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  todoStatus: {
    fontSize: 20,
  },
  chatContainer: {
    flex: 1,
    padding: 20,
  },
  message: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: 15,
    padding: 12,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    color: colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
    backgroundColor: colors.surface,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
