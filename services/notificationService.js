import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Linking } from 'react-native';

// Configure notification behavior for background notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true, // Enable badge for background notifications
    priority: Notifications.AndroidNotificationPriority.HIGH, // High priority for lock screen
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.navigationCallback = null;
  }

  setNavigationCallback(callback) {
    this.navigationCallback = callback;
  }

  async initialize() {
    try {
      console.log('🔔 Initializing notifications...');
      
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Notification permission denied');
        return false;
      }

      console.log('✅ Notification permissions granted');

      // Skip push token for Expo Go (not supported in SDK 53+)
      console.log('📱 Using local notifications only (Expo Go compatible)');

      // Set up notification listeners
      this.setupNotificationListeners();

      console.log('✅ Notifications initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      console.log('⚠️ Notifications not available');
      return false;
    }
  }

  setupNotificationListeners() {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
    });

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      
      // Handle notification tap - navigate to articles screen and open article
      const data = response.notification.request.content.data;
      if (data) {
        if (data.type === 'article' && data.articleUrl) {
          // First navigate to Articles screen
          if (this.navigationCallback) {
            console.log('🔗 Navigating to Articles screen');
            this.navigationCallback('Articles');
          }
          
          // Then open article URL after a short delay
          setTimeout(() => {
            console.log('🔗 Opening article URL:', data.articleUrl);
            Linking.openURL(data.articleUrl).catch(err => 
              console.error('❌ Error opening article URL:', err)
            );
          }, 1000);
        } else if (data.screen) {
          // Navigate to specific screen based on notification data
          console.log('🔗 Navigate to:', data.screen);
          if (this.navigationCallback) {
            this.navigationCallback(data.screen);
          }
        }
      }
    });
  }

  async scheduleLocalNotification(title, body, data = {}) {
    try {
      const notificationContent = {
        title: title,
        body: body,
        data: data,
        sound: 'default',
        badge: 1, // Add badge for lock screen visibility
        priority: 'high', // High priority for lock screen
        vibrate: true, // Ensure vibration
        // Force notification to show on lock screen
        categoryIdentifier: 'LOCK_SCREEN_NOTIFICATION',
      };

      // Add action buttons for article notifications
      if (data.type === 'article' && data.articleUrl) {
        notificationContent.categoryIdentifier = 'ARTICLE_NOTIFICATION';
      }

      // Schedule with immediate trigger for lock screen visibility
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          seconds: 1, // Show after 1 second to ensure it appears on lock screen
        },
      });
      console.log('📤 Local notification scheduled for lock screen:', title);
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
    }
  }

  async scheduleArticleNotification(article) {
    const title = '📰 New Article Found';
    
    // Create a preview of the article content
    let preview = '';
    if (article.content && article.content.length > 0) {
      // Use the first 100 characters of the content as preview
      preview = article.content.substring(0, 100).trim();
      if (article.content.length > 100) {
        preview += '...';
      }
    } else if (article.title) {
      // Fallback to title if no content
      preview = article.title;
    }
    
    const body = `${article.title || 'New Article'}\n\n${preview}\n\nSource: ${article.source || 'Unknown'}`;
    
    const data = {
      screen: 'Articles',
      articleId: article.id,
      articleUrl: article.url,
      category: article.category,
      relevanceScore: article.relevanceScore,
    };

    await this.scheduleLocalNotification(title, body, data);
  }

  async scheduleDailySummaryNotification(summary) {
    const title = '📊 Daily Summary Ready';
    const body = 'Your AI-generated market summary is available';
    const data = {
      screen: 'Articles',
      type: 'summary',
    };

    await this.scheduleLocalNotification(title, body, data);
  }

  async scheduleNewArticlesNotification(count) {
    const title = '📰 New Articles Available';
    const body = `${count} new relevant articles have been found`;
    const data = {
      screen: 'Articles',
      type: 'new_articles',
      count: count,
    };

    await this.scheduleLocalNotification(title, body, data);
  }

  // Test notification method
  async sendTestNotification() {
    const title = '🔔 Test Notification';
    const body = 'Bank of England holds interest rates and slows down quantitative easing\n\nLatest developments in the credit markets show significant activity around Bank of England policy decisions. This represents an important trend for credit professionals and investors monitoring central bank actions...\n\nSource: Financial Times';
    const data = {
      type: 'article',
      articleId: 'test_12345',
      articleUrl: 'https://www.ft.com/content/bank-of-england-interest-rates',
      category: 'Market Moves',
      relevanceScore: 8,
    };

    await this.scheduleLocalNotification(title, body, data);
    console.log('📤 Test notification sent!');
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Get the push token for server-side notifications
  getPushToken() {
    return this.expoPushToken?.data;
  }

  // Register push token with server for lock screen notifications
  async registerPushTokenWithServer(token) {
    try {
        const response = await fetch('https://mawney-daily-news-api.onrender.com/api/push-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token }),
      });

      if (response.ok) {
        console.log('✅ Push token registered with server');
      } else {
        console.log('⚠️ Failed to register push token with server');
      }
    } catch (error) {
      console.error('❌ Error registering push token:', error);
    }
  }
}

export default new NotificationService();
