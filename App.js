import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, StatusBar, Alert, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserService from './services/userService';
import ChatService from './services/chatService';
import CrossPlatformAuth from './services/crossPlatformAuth';
import WebService from './services/webService';
import NotificationService from './services/notificationService';
import NotificationPollingService from './services/notificationPollingService';
import BackgroundTaskService from './services/backgroundTaskService';
import ChatPollingService from './services/chatPollingService';
import ChatNotificationService from './services/chatNotificationService';

// Import screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ArticlesScreen from './screens/ArticlesScreen';
import TodosScreen from './screens/TodosScreen';
import CallNotesScreen from './screens/CallNotesScreen';
import AIAssistantScreen from './screens/AIAssistantScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';
import ChatTestScreen from './screens/ChatTestScreen';

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

function TabNavigator({ onLogout, navigation, initializeChatNotifications }) {
  // Set up navigation callback for notifications
  React.useEffect(() => {
    NotificationService.setNavigationCallback((screenName) => {
      // This will be handled by the navigation system
      console.log('🔗 Navigation requested to:', screenName);
    });
    
    // Initialize chat notifications with navigation
    if (initializeChatNotifications) {
      initializeChatNotifications(navigation);
    }
  }, [navigation, initializeChatNotifications]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.accent,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 30,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.surface,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerRight: () => (
          <View style={styles.headerLogo}>
            <Image 
              source={require('./assets/logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        ),
      }}
    >
      <Tab.Screen 
        name="Home" 
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color, fontWeight: 'bold' }}>◊</Text>
          ),
        }}
      >
        {({ navigation: tabNavigation }) => <HomeScreen navigation={tabNavigation} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Chat" 
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color, fontWeight: 'bold' }}>💬</Text>
          ),
        }}
      >
        {({ navigation: tabNavigation }) => <ChatListScreen navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Profile" 
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color, fontWeight: 'bold' }}>◆</Text>
          ),
        }}
      >
        {({ navigation: tabNavigation }) => <ProfileScreen onLogout={onLogout} navigation={tabNavigation} parentNavigation={navigation} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      console.log('🚀 App starting...');
      initializeCrossPlatformAuth();
      initializeWebService();
      initializeNotifications();
      initializeChatPolling();
    } catch (err) {
      console.error('❌ App initialization error:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, []);

  const initializeNotifications = async () => {
    try {
      console.log('🔔 Initializing notifications...');
      
      // Temporarily disable notifications to prevent crashes
      console.log('⚠️ Notifications temporarily disabled for Expo Go compatibility');
      return;
      
      const success = await NotificationService.initialize();
      if (success) {
        console.log('✅ Notifications initialized successfully');
        
        // Start polling for notifications from the server
        NotificationPollingService.startPolling(15000); // Poll every 15 seconds
        
        // Register background fetch for lock screen notifications
        await BackgroundTaskService.registerBackgroundFetch();
      } else {
        console.log('⚠️ Notifications not available');
      }
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
    }
  };

  const initializeChatPolling = () => {
    try {
      console.log('💬 Initializing chat polling...');
      ChatPollingService.startPolling();
      console.log('✅ Chat polling started successfully');
    } catch (error) {
      console.error('❌ Error initializing chat polling:', error);
    }
  };

  const initializeChatNotifications = async (navigation) => {
    try {
      console.log('💬 Setting up chat notifications...');
      
      // Re-initialize ChatService to ensure it has the current user
      await ChatService.reinitialize();
      
      // Initialize ChatNotificationService with current user
      const currentUser = UserService.getCurrentUser();
      if (currentUser) {
        console.log('💬 Initializing ChatNotificationService for user:', currentUser.name);
        const initialized = await ChatNotificationService.initialize(currentUser);
        if (initialized) {
          console.log('✅ ChatNotificationService initialized successfully');
        } else {
          console.log('⚠️ ChatNotificationService initialization failed');
        }
      } else {
        console.log('⚠️ No current user found for ChatNotificationService initialization');
      }
      
      // Set navigation callback for notifications
      ChatNotificationService.setNavigationCallback((screenName, params) => {
        console.log('🔗 Navigating from notification:', screenName, params);
        if (navigation) {
          if (screenName === 'Chat' && params?.chatId) {
            // Navigate to specific chat
            navigation.navigate('Chat', { chatId: params.chatId });
          } else {
            navigation.navigate(screenName, params);
          }
        }
      });
      
      console.log('✅ Chat notifications setup completed');
    } catch (error) {
      console.error('❌ Error setting up chat notifications:', error);
    }
  };

  const initializeCrossPlatformAuth = async () => {
    try {
      console.log('🌐 Initializing cross-platform authentication...');
      
      // Initialize cross-platform auth
      await CrossPlatformAuth.initialize();
      
      // Check if user is logged in
      const isLoggedIn = await CrossPlatformAuth.isLoggedIn();
      const user = await CrossPlatformAuth.getCurrentUser();
      
      if (isLoggedIn && user) {
        console.log('✅ User already logged in:', user.name);
        setIsLoggedIn(true);
        setCurrentUser(user);
        
        // Also set in UserService for compatibility
        UserService.currentUser = user;
        await UserService.saveCurrentUser();
      } else {
        console.log('ℹ️ No user logged in');
      }
    } catch (error) {
      console.error('❌ Error initializing cross-platform auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeWebService = async () => {
    try {
      console.log('🌐 Initializing web service...');
      await WebService.initialize();
      console.log('✅ Web service initialized');
    } catch (error) {
      console.error('❌ Error initializing web service:', error);
    }
  };

  const handleLogin = async (user) => {
    console.log('🔐 User logging in:', user.name);
    
    // Set user in UserService immediately
    UserService.currentUser = user;
    
    // Set as logged in immediately
    setIsLoggedIn(true);
    setCurrentUser(user);
    
    console.log('✅ Login successful - User set in state');
    
    // Save to storage in background (non-blocking, non-critical)
    setTimeout(async () => {
      try {
        await UserService.saveCurrentUser();
        console.log('✅ User saved to storage');
      } catch (error) {
        console.log('⚠️ Background save failed:', error.message);
      }
      
      try {
        await CrossPlatformAuth.setUser(user);
        console.log('✅ User saved to cross-platform auth');
      } catch (error) {
        console.log('⚠️ Cross-platform auth failed:', error.message);
      }
    }, 100);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 User logging out...');
              
              // Clear from UserService first (critical)
              UserService.currentUser = null;
              
              // Clear from cross-platform auth (non-critical)
              try {
                await CrossPlatformAuth.clearUser();
              } catch (error) {
                console.error('⚠️ Error clearing cross-platform auth (non-critical):', error);
              }
              
              // Clear from UserService storage (non-critical)
              try {
                await UserService.logout();
              } catch (error) {
                console.error('⚠️ Error in UserService logout (non-critical):', error);
              }
              
              // Always log out
              setIsLoggedIn(false);
              setCurrentUser(null);
              
              console.log('✅ Logout successful');
            } catch (error) {
              console.error('❌ Error during logout:', error);
              // Force logout anyway
              setIsLoggedIn(false);
              setCurrentUser(null);
            }
          }
        }
      ]
    );
  };

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Mawney Partners</Text>
        <Text style={styles.loadingSubtext}>Error: {error}</Text>
        <Text style={styles.loadingSubtext}>Check console for details</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Mawney Partners</Text>
        <Text style={styles.loadingSubtext}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      {isLoggedIn ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs">
            {({ navigation }) => <TabNavigator onLogout={handleLogout} navigation={navigation} initializeChatNotifications={initializeChatNotifications} />}
          </Stack.Screen>
          <Stack.Screen 
            name="Articles" 
            component={ArticlesScreen}
            options={{
              headerShown: true,
              title: 'Articles',
              headerStyle: {
                backgroundColor: colors.primary,
              },
              headerTintColor: colors.surface,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen 
            name="Todos" 
            component={TodosScreen}
            options={{
              headerShown: true,
              title: 'To Do List',
              headerStyle: {
                backgroundColor: colors.primary,
              },
              headerTintColor: colors.surface,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen 
            name="Calls" 
            component={CallNotesScreen}
            options={{
              headerShown: true,
              title: 'Call Notes',
              headerStyle: {
                backgroundColor: colors.primary,
              },
              headerTintColor: colors.surface,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen 
            name="AIAssistant" 
            component={AIAssistantScreen}
            options={{
              headerShown: true,
              title: 'AI Assistant',
              headerStyle: {
                backgroundColor: colors.primary,
              },
              headerTintColor: colors.surface,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="ChatTest" component={ChatTestScreen} />
        </Stack.Navigator>
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerLogo: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
});