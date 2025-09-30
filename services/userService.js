import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAuth from './crossPlatformAuth';

// Import profile pictures at the top level
const profilePictures = {
  hope: require('../assets/profile-pictures/hope.jpg'),
  josh: require('../assets/profile-pictures/josh.jpg'),
  rachel: require('../assets/profile-pictures/rachel.jpg'),
  jack: require('../assets/profile-pictures/jack.jpg'),
  harry: require('../assets/profile-pictures/harry.jpg'),
  tyler: require('../assets/profile-pictures/tyler.jpg')
};

// Pre-configured users
const USERS = [
  {
    id: 'hope_gilbert',
    name: 'Hope Gilbert',
    email: 'hg@mawneypartners.com',
    password: 'Hunter1972',
    avatar: 'https://ui-avatars.com/api/?name=Hope+Gilbert&background=004b35&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  },
  {
    id: 'joshua_trister',
    name: 'Joshua Trister',
    email: 'jt@mawneypartners.com',
    password: 'Denmead100',
    avatar: 'https://ui-avatars.com/api/?name=Joshua+Trister&background=266b52&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  },
  {
    id: 'rachel_trister',
    name: 'Rachel Trister',
    email: 'finance@mawneypartners.com',
    password: 'Denmead100',
    avatar: 'https://ui-avatars.com/api/?name=Rachel+Trister&background=4d8b70&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  },
  {
    id: 'jack_dalby',
    name: 'Jack Dalby',
    email: 'jd@mawneypartners.com',
    password: 'Denmead100',
    avatar: 'https://ui-avatars.com/api/?name=Jack+Dalby&background=2d2926&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  },
  {
    id: 'harry_edleman',
    name: 'Harry Edleman',
    email: 'he@mawneypartners.com',
    password: 'Denmead100',
    avatar: 'https://ui-avatars.com/api/?name=Harry+Edleman&background=4c1f28&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  },
  {
    id: 'tyler_johnson_thomas',
    name: 'Tyler Johnson Thomas',
    email: 'tjt@mawneypartners.com',
    password: 'Denmead100',
    avatar: 'https://ui-avatars.com/api/?name=Tyler+Johnson+Thomas&background=4d4742&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  }
];

class UserService {
  constructor() {
    this.currentUser = null;
    this.apiBaseUrl = 'https://mawney-daily-news-api.onrender.com';
  }

  // Get all available users
  getUsers() {
    return USERS;
  }

  // Authenticate user
  async authenticate(email, password) {
    console.log('🔐 Authenticating user:', email);
    
    const user = USERS.find(u => u.email === email && u.password === password);
    
    if (user) {
      console.log('✅ User found:', user.name);
      this.currentUser = user;
      
      // Save to storage in background (non-blocking)
      this.saveCurrentUser().catch(error => {
        console.log('⚠️ Save user failed (non-critical):', error.message);
      });
      
      // Load user profile from server in background (non-blocking)
      this.loadUserProfileFromServer().catch(error => {
        console.log('⚠️ Server profile load failed (non-critical):', error.message);
      });
      
      return { success: true, user: this.currentUser };
    }
    
    console.log('❌ User not found or invalid password');
    return { success: false, error: 'Invalid credentials' };
  }

  // Load user profile from server
  async loadUserProfileFromServer() {
    if (!this.currentUser) return;
    
    try {
      console.log('🌐 Loading user profile from server for:', this.currentUser.email);
      
      const response = await fetch(`${this.apiBaseUrl}/api/user/profile?email=${encodeURIComponent(this.currentUser.email)}`);
      const data = await response.json();
      
      console.log('🌐 Server profile response:', {
        success: data.success,
        hasProfile: !!data.profile,
        hasAvatar: !!data.profile?.avatar,
        avatarLength: data.profile?.avatar?.length || 0
      });
      
      if (data.success && data.profile) {
        // Merge server profile with local user data
        this.currentUser = {
          ...this.currentUser,
          ...data.profile,
          // Keep local fields that aren't on server
          id: this.currentUser.id,
          password: this.currentUser.password
        };
        await this.saveCurrentUser();
        console.log('✅ User profile loaded from server and merged');
      } else {
        console.log('⚠️ No profile data from server');
      }
    } catch (error) {
      console.error('❌ Error loading user profile from server:', error);
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Save current user to storage
  async saveCurrentUser() {
    if (this.currentUser) {
      console.log('💾 Saving current user:', this.currentUser.id, this.currentUser.name);
      
      // Use cross-platform auth for storage
      const crossPlatformAuth = new CrossPlatformAuth();
      await crossPlatformAuth.setUser(this.currentUser);
      
      // Also sync with server
      await crossPlatformAuth.syncUserData(this.currentUser);
      
      console.log('✅ User saved and synced across platforms');
    }
  }

  // Load current user from storage
  async loadCurrentUser() {
    try {
      // Use cross-platform auth for loading
      const crossPlatformAuth = new CrossPlatformAuth();
      const user = await crossPlatformAuth.getUser();
      
      if (user) {
        this.currentUser = user;
        
        // Load latest profile from server in background (non-blocking)
        this.loadUserProfileFromServer().catch(error => {
          console.log('Background profile sync failed:', error.message);
        });
        
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
    return null;
  }

  // Logout
  async logout() {
    this.currentUser = null;
    
    // Use cross-platform auth for logout
    const crossPlatformAuth = new CrossPlatformAuth();
    await crossPlatformAuth.clearUser();
  }

  // Update user preferences
  async updatePreferences(preferences) {
    if (this.currentUser) {
      this.currentUser.preferences = { ...this.currentUser.preferences, ...preferences };
      await this.saveCurrentUser();
      
      // Save to server
      await this.saveUserProfileToServer();
    }
  }

  // Save user profile to server
  async saveUserProfileToServer() {
    if (!this.currentUser) return;
    
    try {
      console.log('🌐 Saving user profile to server:', {
        email: this.currentUser.email,
        name: this.currentUser.name,
        hasAvatar: !!this.currentUser.avatar,
        avatarLength: this.currentUser.avatar?.length || 0
      });
      
      const response = await fetch(`${this.apiBaseUrl}/api/user/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.currentUser.email,
          name: this.currentUser.name,
          avatar: this.currentUser.avatar,
          preferences: this.currentUser.preferences
        })
      });
      
      const data = await response.json();
      console.log('🌐 Server response:', data);
      
      if (data.success) {
        console.log('✅ User profile saved to server successfully');
      } else {
        console.error('❌ Server returned error:', data.error);
      }
    } catch (error) {
      console.error('❌ Error saving user profile to server:', error);
    }
  }

  // Get user-specific storage key
  getUserKey(key) {
    if (!this.currentUser) return key;
    return `${this.currentUser.id}_${key}`;
  }

  // Get shared storage key (for AI memory)
  getSharedKey(key) {
    return `shared_${key}`;
  }

  // Save user todos to server
  async saveUserTodosToServer(todos) {
    if (!this.currentUser) return;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/user/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.currentUser.email,
          todos: todos
        })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('User todos saved to server successfully');
      }
    } catch (error) {
      console.error('Error saving user todos to server:', error);
    }
  }

  // Load user todos from server
  async loadUserTodosFromServer() {
    if (!this.currentUser) return [];
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/user/todos?email=${encodeURIComponent(this.currentUser.email)}`);
      const data = await response.json();
      
      if (data.success) {
        return data.todos || [];
      }
    } catch (error) {
      console.error('Error loading user todos from server:', error);
    }
    return [];
  }

  // Save user call notes to server
  async saveUserCallNotesToServer(callNotes) {
    if (!this.currentUser) return;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/user/call-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.currentUser.email,
          call_notes: callNotes
        })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('User call notes saved to server successfully');
      }
    } catch (error) {
      console.error('Error saving user call notes to server:', error);
    }
  }

  // Load user call notes from server
  async loadUserCallNotesFromServer() {
    if (!this.currentUser) return [];
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/user/call-notes?email=${encodeURIComponent(this.currentUser.email)}`);
      const data = await response.json();
      
      if (data.success) {
        return data.call_notes || [];
      }
    } catch (error) {
      console.error('Error loading user call notes from server:', error);
    }
    return [];
  }

  // Save user saved jobs to server
  async saveUserSavedJobsToServer(savedJobs) {
    if (!this.currentUser) return;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/user/saved-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.currentUser.email,
          saved_jobs: savedJobs
        })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('User saved jobs saved to server successfully');
      }
    } catch (error) {
      console.error('Error saving user saved jobs to server:', error);
    }
  }

  // Load user saved jobs from server
  async loadUserSavedJobsFromServer() {
    if (!this.currentUser) return [];
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/user/saved-jobs?email=${encodeURIComponent(this.currentUser.email)}`);
      const data = await response.json();
      
      if (data.success) {
        return data.saved_jobs || [];
      }
    } catch (error) {
      console.error('Error loading user saved jobs from server:', error);
    }
    return [];
  }

  // Save user-specific data
  async saveUserData(key, data) {
    const userKey = this.getUserKey(key);
    await AsyncStorage.setItem(userKey, JSON.stringify(data));
  }

  // Load user-specific data
  async loadUserData(key, defaultValue = null) {
    try {
      const userKey = this.getUserKey(key);
      const data = await AsyncStorage.getItem(userKey);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error loading user data for key ${key}:`, error);
      return defaultValue;
    }
  }

  // Save shared data (AI memory)
  async saveSharedData(key, data) {
    const sharedKey = this.getSharedKey(key);
    await AsyncStorage.setItem(sharedKey, JSON.stringify(data));
  }

  // Load shared data (AI memory)
  async loadSharedData(key, defaultValue = null) {
    try {
      const sharedKey = this.getSharedKey(key);
      const data = await AsyncStorage.getItem(sharedKey);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error loading shared data for key ${key}:`, error);
      return defaultValue;
    }
  }

  // Get actual uploaded avatar for a user
  async getActualAvatar(userId) {
    try {
      // First try to get from local storage
      const userKey = `${userId}_avatar`;
      const avatarData = await AsyncStorage.getItem(userKey);
      if (avatarData) {
        return JSON.parse(avatarData);
      }
      
      // If not found locally, try to load from server
      const user = this.getUsers().find(u => u.id === userId);
      if (user) {
        console.log(`🌐 Loading avatar from server for user: ${user.name} (${user.email})`);
        
        const response = await fetch(`${this.apiBaseUrl}/api/user/profile?email=${encodeURIComponent(user.email)}`);
        const data = await response.json();
        
        if (data.success && data.profile && data.profile.avatar) {
          console.log(`✅ Loaded avatar from server for ${user.name}, length: ${data.profile.avatar.length}`);
          
          // Cache the avatar locally for future use
          await AsyncStorage.setItem(userKey, JSON.stringify(data.profile.avatar));
          
          return data.profile.avatar;
        } else {
          console.log(`⚠️ No avatar found on server for ${user.name}`);
        }
      }
    } catch (error) {
      console.error(`Error loading avatar for user ${userId}:`, error);
    }
    return null;
  }

  // Get hardcoded profile picture for a user (fallback system)
  getHardcodedAvatar(userId) {
    const hardcodedAvatars = {
      'hg@mawneypartners.com': profilePictures.hope,
      'jt@mawneypartners.com': profilePictures.josh,
      'rt@mawneypartners.com': profilePictures.rachel,
      'jd@mawneypartners.com': profilePictures.jack,
      'he@mawneypartners.com': profilePictures.harry,
      'tjt@mawneypartners.com': profilePictures.tyler
    };
    
    const user = this.getUsers().find(u => u.id === userId);
    if (user && hardcodedAvatars[user.email]) {
      console.log(`🎨 Using local JPG avatar for ${user.name}`);
      return hardcodedAvatars[user.email];
    }
    
    return null;
  }

  // Get all users with their actual uploaded avatars
  async getAllUsersWithAvatars() {
    const users = this.getUsers();
    const usersWithAvatars = [];
    
    for (const user of users) {
      const actualAvatar = await this.getActualAvatar(user.id);
      const hardcodedAvatar = actualAvatar ? null : this.getHardcodedAvatar(user.id);
      
      usersWithAvatars.push({
        ...user,
        actualAvatar: actualAvatar || hardcodedAvatar || user.avatar // Use uploaded avatar, hardcoded avatar, or fallback to generated one
      });
    }
    
    return usersWithAvatars;
  }

  // Refresh all user avatars from server (for chat list)
  async refreshAllUserAvatars() {
    try {
      console.log('🔄 Refreshing all user avatars from server...');
      
      const users = this.getUsers();
      const refreshPromises = users.map(async (user) => {
        try {
          const response = await fetch(`${this.apiBaseUrl}/api/user/profile?email=${encodeURIComponent(user.email)}`);
          const data = await response.json();
          
          if (data.success && data.profile && data.profile.avatar) {
            // Cache the avatar locally
            const userKey = `${user.id}_avatar`;
            await AsyncStorage.setItem(userKey, JSON.stringify(data.profile.avatar));
            console.log(`✅ Refreshed avatar for ${user.name}`);
            return { userId: user.id, avatar: data.profile.avatar };
          } else {
            console.log(`⚠️ No avatar on server for ${user.name}`);
            return { userId: user.id, avatar: null };
          }
        } catch (error) {
          console.error(`❌ Error refreshing avatar for ${user.name}:`, error);
          return { userId: user.id, avatar: null };
        }
      });
      
      const results = await Promise.all(refreshPromises);
      console.log('🔄 Avatar refresh complete:', results.length, 'users processed');
      
      return results;
    } catch (error) {
      console.error('❌ Error refreshing all user avatars:', error);
      return [];
    }
  }

  // Clear all user data (for logout)
  async clearUserData() {
    if (!this.currentUser) return;
    
    const userKeys = [
      'todos',
      'callNotes',
      'chatSessions',
      'currentChatId',
      'savedJobAds',
      'uploadedFiles'
    ];

    for (const key of userKeys) {
      const userKey = this.getUserKey(key);
      await AsyncStorage.removeItem(userKey);
    }
  }
}

export default new UserService();
