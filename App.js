import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, StatusBar, Alert, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserService from './services/userService';
import NotificationService from './services/notificationService';
import NotificationPollingService from './services/notificationPollingService';
import BackgroundTaskService from './services/backgroundTaskService';
import ChatPollingService from './services/chatPollingService';
import ChatNotificationService from './services/chatNotificationService';

// Import screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ArticlesScreen from './screens/ArticlesScreenSimple';
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

  useEffect(() => {
    checkAuthStatus();
    initializeNotifications();
    initializeChatPolling();
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

  const initializeChatNotifications = (navigation) => {
    try {
      console.log('💬 Setting up chat notifications...');
      
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

  const checkAuthStatus = async () => {
    try {
      const user = await UserService.loadCurrentUser();
      if (user) {
        setIsLoggedIn(true);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
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
              await UserService.logout();
              setIsLoggedIn(false);
              setCurrentUser(null);
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        }
      ]
    );
  };

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