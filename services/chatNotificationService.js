import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class ChatNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.currentUser = null;
  }

  // Initialize the notification service
  async initialize(currentUser) {
    this.currentUser = currentUser;
    
    try {
      // Request permissions
      await this.requestPermissions();
      
      // Get push token
      await this.registerForPushNotificationsAsync();
      
      // Set up listeners
      this.setupNotificationListeners();
      
      console.log('💬 Chat notification service initialized');
      return true;
    } catch (error) {
      console.error('❌ Error initializing chat notifications:', error);
      return false;
    }
  }

  // Request notification permissions
  async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('chat-messages', {
          name: 'Chat Messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#004b35',
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.warn('⚠️ Notification permissions not granted, using local notifications only');
          return true; // Still return true to allow local notifications
        }
        
        console.log('✅ Notification permissions granted');
        return true;
      } else {
        console.log('📱 Using web/local notifications for development');
        return true; // Allow local notifications on web/emulator
      }
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      console.log('📱 Falling back to local notifications only');
      return true; // Still allow local notifications
    }
  }

  // Register for push notifications and get token
  async registerForPushNotificationsAsync() {
    if (Device.isDevice) {
      try {
        // For development, we'll use local notifications instead of push notifications
        // This avoids the projectId requirement
        console.log('📱 Using local notifications for development');
        this.expoPushToken = 'local-device-token';
        return this.expoPushToken;
      } catch (error) {
        console.error('❌ Error getting push token:', error);
        console.log('📱 Falling back to local notifications only');
        this.expoPushToken = 'local-device-token';
        return this.expoPushToken;
      }
    } else {
      console.log('📱 Must use physical device for Push Notifications');
      return null;
    }
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // This listener is fired whenever a notification is received while the app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('💬 Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      this.handleNotificationResponse(response);
    });
  }

  // Handle notification received while app is open
  handleNotificationReceived(notification) {
    const { data } = notification.request.content;
    
    if (data.type === 'chat_message') {
      console.log('💬 Chat message notification received:', data);
      // You can add custom handling here, like updating UI
    }
  }

  // Handle notification tapped
  handleNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    if (data.type === 'chat_message') {
      console.log('👆 Chat notification tapped, navigating to chat:', data.chatId);
      // Navigate to the specific chat
      this.navigateToChat(data.chatId);
    }
  }

  // Navigate to specific chat (will be set by the app)
  navigateToChat(chatId) {
    if (this.navigationCallback) {
      this.navigationCallback('Chat', { chatId });
    }
  }

  // Set navigation callback
  setNavigationCallback(callback) {
    this.navigationCallback = callback;
  }

  // Send local notification for new message
  async sendMessageNotification(message, senderName, chatName, chatId) {
    try {
      console.log('🔔 sendMessageNotification called:', {
        messageId: message.id,
        senderId: message.senderId,
        currentUserId: this.currentUser?.id,
        senderName,
        chatName,
        chatId
      });

      // Don't send notification for own messages
      if (message.senderId === this.currentUser?.id) {
        console.log('📱 Skipping notification for own message');
        return;
      }

      // Check if we have notification permissions
      const hasPermissions = await this.areNotificationsEnabled();
      console.log('📱 Notification permissions status:', hasPermissions);
      
      if (!hasPermissions) {
        console.log('📱 Notifications not enabled, skipping notification');
        return;
      }

      // Create notification content
      const title = chatName || senderName;
      const body = message.attachments && message.attachments.length > 0 
        ? `${senderName} sent an attachment`
        : message.text;

      console.log('🔔 Scheduling notification:', { title, body, chatId });

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'chat_message',
            chatId,
            messageId: message.id,
            senderId: message.senderId,
            senderName,
          },
        },
        trigger: null, // Show immediately
      });

      console.log('✅ Chat notification scheduled successfully:', { 
        notificationId, 
        title, 
        body, 
        chatId 
      });
    } catch (error) {
      console.error('❌ Error sending chat notification:', error);
      // Don't throw error, just log it so the app continues to work
    }
  }

  // Send notification for multiple unread messages
  async sendUnreadMessagesNotification(chatId, chatName, unreadCount) {
    try {
      const title = chatName || 'New Messages';
      const body = `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'chat_unread',
            chatId,
            unreadCount,
          },
        },
        trigger: null,
      });

      console.log('💬 Unread messages notification sent:', { title, body, chatId });
    } catch (error) {
      console.error('❌ Error sending unread messages notification:', error);
    }
  }

  // Cancel all notifications for a specific chat
  async cancelChatNotifications(chatId) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const presentedNotifications = await Notifications.getPresentedNotificationsAsync();

      // Cancel scheduled notifications for this chat
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.chatId === chatId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      // Dismiss presented notifications for this chat
      for (const notification of presentedNotifications) {
        if (notification.request.content.data?.chatId === chatId) {
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        }
      }

      console.log('🔕 Cancelled notifications for chat:', chatId);
    } catch (error) {
      console.error('❌ Error cancelling chat notifications:', error);
    }
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    console.log('🧹 Chat notification service cleaned up');
  }

  // Get push token
  getPushToken() {
    return this.expoPushToken;
  }

  // Check if notifications are enabled
  async areNotificationsEnabled() {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // Badge management
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('❌ Error setting badge count:', error);
    }
  }

  async clearBadge() {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('❌ Error clearing badge:', error);
    }
  }
}

// Export singleton instance
const chatNotificationService = new ChatNotificationService();
export default chatNotificationService;
