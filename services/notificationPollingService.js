import NotificationService from './notificationService';

class NotificationPollingService {
  constructor() {
    this.pollingInterval = null;
    this.isPolling = false;
        this.apiBaseUrl = 'https://mawney-daily-news-api.onrender.com';
  }

  startPolling(intervalMs = 15000) { // Poll every 15 seconds for faster notifications
    if (this.isPolling) {
      console.log('⚠️ Notification polling already active');
      return;
    }

    console.log('🔄 Starting notification polling...');
    this.isPolling = true;
    
    this.pollingInterval = setInterval(async () => {
      await this.checkForNotifications();
    }, intervalMs);

    // Check immediately
    this.checkForNotifications();
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('⏹️ Notification polling stopped');
  }

  async checkForNotifications() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/notifications`);
      
      if (!response.ok) {
        console.log('⚠️ Failed to fetch notifications:', response.status);
        return;
      }

      const data = await response.json();
      
      if (data.success && data.notifications && data.notifications.length > 0) {
        console.log(`📬 Received ${data.notifications.length} notifications`);
        
        // Process each notification
        for (const notification of data.notifications) {
          await this.processNotification(notification);
        }
      }
    } catch (error) {
      console.error('❌ Error checking for notifications:', error);
    }
  }

  async processNotification(notification) {
    try {
      console.log('📬 Processing notification:', notification.title);
      
      // If this is an article notification, use the enhanced article notification method
      if (notification.data && notification.data.type === 'article') {
        const article = {
          id: notification.data.articleId,
          title: notification.data.title || notification.body.split('\n')[0],
          content: notification.data.content || '',
          url: notification.data.articleUrl,
          source: notification.data.source,
          category: notification.data.category,
          relevanceScore: notification.data.relevanceScore
        };
        
        await NotificationService.scheduleArticleNotification(article);
      } else {
        // Send regular local notification
        await NotificationService.scheduleLocalNotification(
          notification.title,
          notification.body,
          notification.data
        );
      }

      // Handle specific notification types
      if (notification.data && notification.data.type) {
        switch (notification.data.type) {
          case 'new_articles':
            console.log(`📰 New articles notification: ${notification.data.count} articles`);
            break;
          case 'summary':
            console.log('📊 Daily summary notification');
            break;
          case 'article':
            console.log('📰 Article notification with preview processed');
            break;
          default:
            console.log('📬 General notification received');
        }
      }
    } catch (error) {
      console.error('❌ Error processing notification:', error);
    }
  }

  // Manual trigger for testing
  async triggerTestNotification() {
    try {
      const testNotification = {
        title: '🧪 Test Notification',
        body: 'This is a test notification from Mawney Partners app',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      };

      await NotificationService.scheduleLocalNotification(
        testNotification.title,
        testNotification.body,
        testNotification.data
      );

      console.log('✅ Test notification sent');
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
    }
  }
}

export default new NotificationPollingService();
