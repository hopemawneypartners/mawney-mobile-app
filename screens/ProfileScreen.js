import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import NotificationPollingService from '../services/notificationPollingService';
import UserService from '../services/userService';
import ChatService from '../services/chatService';
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

export default function ProfileScreen({ onLogout, navigation, parentNavigation }) {
  const [user, setUser] = useState({
    name: 'Loading...',
    email: '',
    role: '',
    department: 'Mawney Partners',
    avatar: null,
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Add focus listener to refresh profile when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation?.addListener('focus', () => {
      console.log('📱 ProfileScreen focused, refreshing profile...');
      loadUserProfile();
    });

    return unsubscribe;
  }, [navigation]);

  const loadUserProfile = async () => {
    try {
      const currentUser = UserService.getCurrentUser();
      if (currentUser) {
        console.log('👤 Loading user profile for:', currentUser.name);
        console.log('📸 Current avatar status:', currentUser.avatar ? 'Has avatar' : 'No avatar');
        
        // Initialize ChatService first to ensure it's ready
        await ChatService.initialize();
        
        // Get avatar using the same method as ChatService (which works)
        const userInfo = await ChatService.getUserInfo(currentUser.id);
        console.log('🔍 ChatService.getUserInfo result:', {
          hasUserInfo: !!userInfo,
          hasAvatar: !!userInfo?.avatar,
          avatarType: userInfo?.avatar ? typeof userInfo.avatar : 'none',
          avatarPreview: userInfo?.avatar ? (typeof userInfo.avatar === 'string' ? userInfo.avatar.substring(0, 50) + '...' : 'local asset') : 'none'
        });
        const userAvatar = userInfo?.avatar || currentUser.avatar;
        
        setUser(prev => ({ 
          ...prev, 
          name: currentUser.name,
          email: currentUser.email,
          role: 'Credit Executive Search',
          department: 'Mawney Partners',
          avatar: userAvatar // Use uploaded avatar, hardcoded avatar, or fallback
        }));
        
        // Also try to load fresh profile from server
        console.log('🔄 Refreshing profile from server...');
        await UserService.loadUserProfileFromServer();
        
        // Update with fresh data
        const refreshedUser = UserService.getCurrentUser();
        if (refreshedUser && refreshedUser.avatar !== currentUser.avatar) {
          console.log('✅ Profile refreshed from server, updating avatar');
          // Get fresh avatar using the same method as ChatService (which works)
          await ChatService.initialize();
          const freshUserInfo = await ChatService.getUserInfo(refreshedUser.id);
          console.log('🔄 Refresh ChatService.getUserInfo result:', {
            hasUserInfo: !!freshUserInfo,
            hasAvatar: !!freshUserInfo?.avatar,
            avatarType: freshUserInfo?.avatar ? typeof freshUserInfo.avatar : 'none'
          });
          const freshUserAvatar = freshUserInfo?.avatar || refreshedUser.avatar;
          
          setUser(prev => ({ 
            ...prev, 
            avatar: freshUserAvatar
          }));
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };



  const handleQuickAction = (action) => {
    console.log('🔗 Quick action pressed:', action);
    console.log('🔗 Navigation object:', navigation);
    console.log('🔗 Parent navigation object:', parentNavigation);
    
    switch (action) {
      case 'ai':
        // Navigate to AI Assistant tab
        console.log('🔗 Navigating to AI Assistant...');
        navigation.navigate('AIAssistant');
        break;
      case 'calls':
        // Navigate to Call Notes tab
        console.log('🔗 Navigating to Calls...');
        navigation.navigate('Calls');
        break;
      case 'settings':
        // Navigate to Settings screen (stack navigation)
        console.log('🔗 Navigating to Settings...');
        if (parentNavigation) {
          parentNavigation.navigate('Settings');
        } else {
          console.log('❌ Parent navigation not available for Settings');
        }
        break;
      default:
        console.log('❌ Unknown action:', action);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={typeof user.avatar === 'string' ? { uri: user.avatar } : user.avatar} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>◆</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userRole}>{user.role}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        
      </View>


      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
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

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleQuickAction('settings')}
        >
          <Text style={styles.actionIcon}>◆</Text>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.accountSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.logoutButton} onPress={() => {
          Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Sign Out', 
                style: 'destructive',
                onPress: onLogout
              }
            ]
          );
        }}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
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
  profileHeader: {
    alignItems: 'center',
    padding: 30,
    paddingTop: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarText: {
    fontSize: 40,
    color: colors.surface,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  userRole: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
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
  accountSection: {
    padding: 20,
    paddingTop: 0,
  },
  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    shadowColor: colors.error,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 16,
  },
  logoutButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
