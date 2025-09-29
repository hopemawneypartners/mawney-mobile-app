import { Platform } from 'react-native';

class WebService {
  constructor() {
    this.isWeb = Platform.OS === 'web';
  }

  // Initialize web-specific features
  async initialize() {
    if (!this.isWeb) return;

    try {
      console.log('🌐 Initializing web-specific features...');
      
      // Set up cross-platform data sync
      this.setupDataSync();
      
      // Set up web-specific event listeners
      this.setupEventListeners();
      
      console.log('✅ Web service initialized');
      return true;
    } catch (error) {
      console.error('❌ Error initializing web service:', error);
      return false;
    }
  }

  // Set up data synchronization between mobile and web
  setupDataSync() {
    if (!this.isWeb) return;

    // Listen for storage changes (when user logs in on mobile)
    window.addEventListener('storage', (e) => {
      if (e.key === 'mawney_user') {
        console.log('🔄 User data changed, syncing...');
        this.syncUserData();
      }
    });

    // Set up periodic sync
    setInterval(() => {
      this.syncUserData();
    }, 30000); // Sync every 30 seconds
  }

  // Set up web-specific event listeners
  setupEventListeners() {
    if (!this.isWeb) return;

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👁️ Page became visible, syncing data...');
        this.syncUserData();
      }
    });

    // Handle beforeunload to save data
    window.addEventListener('beforeunload', () => {
      this.saveCurrentState();
    });
  }

  // Sync user data
  async syncUserData() {
    if (!this.isWeb) return;

    try {
      const userData = localStorage.getItem('mawney_user');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('🔄 Syncing user data for:', user.name);
        
        // Trigger app sync if available
        if (window.MawneyApp && window.MawneyApp.syncUserData) {
          window.MawneyApp.syncUserData(user);
        }
      }
    } catch (error) {
      console.error('❌ Error syncing user data:', error);
    }
  }

  // Save current state
  saveCurrentState() {
    if (!this.isWeb) return;

    try {
      // Save any pending data
      const userData = localStorage.getItem('mawney_user');
      if (userData) {
        // Save to sessionStorage for immediate access
        sessionStorage.setItem('mawney_user', userData);
      }
    } catch (error) {
      console.error('❌ Error saving current state:', error);
    }
  }

  // Get platform info
  getPlatformInfo() {
    return {
      isWeb: this.isWeb,
      isMobile: !this.isWeb,
      platform: this.isWeb ? 'web' : Platform.OS,
      userAgent: this.isWeb ? navigator.userAgent : null
    };
  }

  // Handle web-specific navigation
  handleWebNavigation(screenName, params = {}) {
    if (!this.isWeb) return;

    try {
      // Update URL for web navigation
      const url = new URL(window.location);
      url.searchParams.set('screen', screenName);
      
      if (params.chatId) {
        url.searchParams.set('chatId', params.chatId);
      }
      
      window.history.pushState({}, '', url);
    } catch (error) {
      console.error('❌ Error handling web navigation:', error);
    }
  }

  // Get current screen from URL
  getCurrentScreen() {
    if (!this.isWeb) return null;

    try {
      const url = new URL(window.location);
      return url.searchParams.get('screen') || 'Home';
    } catch (error) {
      console.error('❌ Error getting current screen:', error);
      return 'Home';
    }
  }

  // Get URL parameters
  getUrlParams() {
    if (!this.isWeb) return {};

    try {
      const url = new URL(window.location);
      const params = {};
      
      for (const [key, value] of url.searchParams.entries()) {
        params[key] = value;
      }
      
      return params;
    } catch (error) {
      console.error('❌ Error getting URL params:', error);
      return {};
    }
  }
}

export default new WebService();
