import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import NotificationPollingService from './notificationPollingService';
import NotificationService from './notificationService';

const BACKGROUND_FETCH_TASK = 'background-fetch-task';
const ARTICLE_CHECK_TASK = 'article-check-task';

// Define the background task for notifications
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('🔄 Running background fetch task...');
    
    // Check for notifications from the server
    await NotificationPollingService.checkForNotifications();
    
    console.log('✅ Background fetch task completed');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Background fetch task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Define the background task for article checking
TaskManager.defineTask(ARTICLE_CHECK_TASK, async () => {
  try {
    console.log('🔄 Running article check task...');
    
    // Check for new articles and send notifications
        const response = await fetch('https://mawney-daily-news-api.onrender.com/api/articles');
    const data = await response.json();
    
    if (data.success && data.articles) {
      // Find recent articles (last 5 minutes)
      const recentArticles = data.articles.filter(article => {
        const articleDate = new Date(article.publishedAt || article.published_date || article.timestamp);
        const now = new Date();
        const minutesDiff = (now - articleDate) / (1000 * 60);
        return minutesDiff <= 5 && article.relevanceScore >= 3;
      });
      
      // Send notifications for recent high-relevance articles
      for (const article of recentArticles.slice(0, 3)) {
        await NotificationService.scheduleArticleNotification(article);
      }
      
      if (recentArticles.length > 0) {
        console.log(`📰 Found ${recentArticles.length} recent articles, sent notifications`);
      }
    }
    
    console.log('✅ Article check task completed');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Article check task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

class BackgroundTaskService {
  constructor() {
    this.isRegistered = false;
  }

  async registerBackgroundFetch() {
    try {
      // Check if background fetch is available
      const status = await BackgroundFetch.getStatusAsync();
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        // Register the background fetch task for notifications
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
          minimumInterval: 15 * 60, // 15 minutes minimum interval
          stopOnTerminate: false, // Continue running when app is terminated
          startOnBoot: true, // Start when device boots
        });
        
        // Register the article check task
        await BackgroundFetch.registerTaskAsync(ARTICLE_CHECK_TASK, {
          minimumInterval: 5 * 60, // 5 minutes minimum interval
          stopOnTerminate: false, // Continue running when app is terminated
          startOnBoot: true, // Start when device boots
        });
        
        this.isRegistered = true;
        console.log('✅ Background fetch tasks registered successfully');
        return true;
      } else {
        console.log('⚠️ Background fetch not available:', status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error registering background fetch:', error);
      return false;
    }
  }

  async unregisterBackgroundFetch() {
    try {
      if (this.isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        await BackgroundFetch.unregisterTaskAsync(ARTICLE_CHECK_TASK);
        this.isRegistered = false;
        console.log('✅ Background fetch tasks unregistered');
      }
    } catch (error) {
      console.error('❌ Error unregistering background fetch:', error);
    }
  }

  async getStatus() {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      return {
        status: status,
        isRegistered: this.isRegistered,
        isAvailable: status === BackgroundFetch.BackgroundFetchStatus.Available
      };
    } catch (error) {
      console.error('❌ Error getting background fetch status:', error);
      return {
        status: 'unknown',
        isRegistered: false,
        isAvailable: false
      };
    }
  }
}

export default new BackgroundTaskService();
