import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ChatService from '../services/chatService';
import UserService from '../services/userService';
import ChatPollingService from '../services/chatPollingService';

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

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [participantsData, setParticipantsData] = useState({});
  const [chatToDelete, setChatToDelete] = useState(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  useEffect(() => {
    initializeChats();
    
    // Listen for polling updates to refresh chat list
    const handlePollingUpdate = (event, data) => {
      console.log('📱 ChatListScreen - Polling update received:', event, data);
      
      if (event === 'new_message') {
        console.log(`📱 New message in chat ${data.chatId} (${data.chatName}), refreshing chat list`);
        console.log(`📱 Unread count: ${data.unreadCount}, New messages: ${data.newMessagesCount}`);
        // Refresh chats to show updated unread counts
        loadChats();
      } else if (event === 'polling_update') {
        console.log('📱 General polling update, refreshing chat list');
        console.log(`📱 Total unread count: ${data?.totalUnreadCount || 0}, Has new messages: ${data?.hasNewMessages || false}`);
        // Update total unread count
        setTotalUnreadCount(data?.totalUnreadCount || 0);
        // Refresh chats to show any updates
        loadChats();
      }
    };
    
    ChatPollingService.addListener(handlePollingUpdate);
    
    return () => {
      ChatPollingService.removeListener(handlePollingUpdate);
    };
  }, []);

  // Refresh chats when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 ChatListScreen - Screen focused, refreshing chats and avatars');
      
      // Always reload chats when screen is focused (will show server-synced chats)
      loadChats();
      
      // Refresh avatars in background (non-blocking)
      UserService.refreshAllUserAvatars().then(() => {
        console.log('🔄 Background avatar refresh completed, reloading participants data');
        // Reload participants data after avatar refresh
        loadChats();
      }).catch(error => {
        console.log('Background avatar refresh failed:', error.message);
      });
    }, [])
  );

  const initializeChats = async () => {
    try {
      setLoading(true);
      
      // Add a timeout to prevent infinite loading
      const initTimeout = setTimeout(() => {
        console.log('⚠️ ChatService initialization taking too long, showing UI anyway');
        setLoading(false);
        loadChats();
      }, 10000); // 10 second timeout
      
      await ChatService.initialize();
      clearTimeout(initTimeout);
      
      // Refresh all user avatars from server to ensure we have the latest profile pictures
      console.log('🔄 Refreshing all user avatars for chat list...');
      await UserService.refreshAllUserAvatars();
      
      // Load chats and participants data after avatar refresh
      loadChats();
    } catch (error) {
      console.error('Error initializing chats:', error);
      Alert.alert('Error', 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async () => {
    const allChats = ChatService.getChats();
    console.log('🔍 ChatListScreen - Loaded chats:', allChats.map(c => ({ id: c.id, name: c.name, type: c.type })));
    setChats(allChats);
    
    // Calculate total unread count
    const totalUnread = allChats.reduce((total, chat) => {
      return total + ChatService.getUnreadCount(chat.id);
    }, 0);
    setTotalUnreadCount(totalUnread);
    console.log('📊 Total unread messages:', totalUnread);
    
    // Load participants data with actual avatars
    await loadParticipantsData(allChats);
  };

  const loadParticipantsData = async (chatsToLoad) => {
    try {
      const participantsMap = {};
      
      for (const chat of chatsToLoad) {
        try {
          const participants = await ChatService.getChatParticipants(chat.id);
          participantsMap[chat.id] = participants || [];
          
          // Debug logging for avatars
          if (participants && participants.length > 0) {
            participants.forEach(participant => {
              console.log(`👤 Participant ${participant.name}:`, {
                hasAvatar: participant.avatar ? 'Yes' : 'No',
                avatarLength: participant.avatar ? participant.avatar.length : 0,
                avatarPreview: participant.avatar ? participant.avatar.substring(0, 50) + '...' : 'None'
              });
            });
          }
          
          console.log(`✅ Loaded ${participants?.length || 0} participants for chat ${chat.name}`);
        } catch (chatError) {
          console.error(`❌ Error loading participants for chat ${chat.name}:`, chatError);
          participantsMap[chat.id] = [];
        }
      }
      
      setParticipantsData(participantsMap);
      console.log('✅ All participants data loaded:', participantsMap);
    } catch (error) {
      console.error('Error loading participants data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Refresh all user avatars from server
    console.log('🔄 Pull-to-refresh: Refreshing all user avatars...');
    await UserService.refreshAllUserAvatars();
    
    // Reload chats and participants data after avatar refresh
    loadChats();
    setRefreshing(false);
  }, []);

  const handleChatPress = (chat) => {
    console.log('🔗 Chat pressed:', chat);
    console.log('🔗 Navigation object:', navigation);
    navigation.navigate('Chat', { 
      chatId: chat.id, 
      chatName: chat.name,
      chatType: chat.type 
    });
  };

  const handleChatLongPress = (chat) => {
    console.log('🔗 Chat long pressed:', chat);
    setChatToDelete(chat);
  };

  const handleLeaveChat = async () => {
    if (!chatToDelete) return;
    
    try {
      const success = await ChatService.leaveChat(chatToDelete.id);
      if (success) {
        // Reload chats to reflect the change
        loadChats();
        Alert.alert('Success', 'Left chat successfully');
      } else {
        Alert.alert('Error', 'Failed to leave chat');
      }
    } catch (error) {
      console.error('Error leaving chat:', error);
      Alert.alert('Error', 'Failed to leave chat');
    } finally {
      setChatToDelete(null);
    }
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    
    try {
      const success = await ChatService.deleteChat(chatToDelete.id);
      if (success) {
        // Reload chats to reflect the deletion
        loadChats();
        Alert.alert('Success', 'Chat deleted for everyone');
      } else {
        Alert.alert('Error', 'Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete chat');
    } finally {
      setChatToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setChatToDelete(null);
  };

  const handleNewChat = () => {
    setShowNewChatModal(true);
    setNewChatName('');
    setSelectedUsers([]);
    setIsGroupChat(false);
  };

  const handleCreateChat = async () => {
    try {
      if (isGroupChat) {
        if (!newChatName.trim()) {
          Alert.alert('Error', 'Please enter a group name');
          return;
        }
        if (selectedUsers.length === 0) {
          Alert.alert('Error', 'Please select at least one participant');
          return;
        }
        
        await ChatService.createGroupChat(newChatName.trim(), selectedUsers);
        Alert.alert('Success', 'Group chat created successfully');
      } else {
        if (selectedUsers.length !== 1) {
          Alert.alert('Error', 'Please select exactly one person for direct chat');
          return;
        }
        
        await ChatService.createDirectChat(selectedUsers[0]);
        Alert.alert('Success', 'Direct chat created successfully');
      }
      
      setShowNewChatModal(false);
      loadChats();
    } catch (error) {
      console.error('Error creating chat:', error);
      // Show detailed error message to help debug
      Alert.alert('Error', `Failed to create chat: ${error.message || 'Unknown error'}`);
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const filteredChats = chats
    .filter(chat => chat && chat.id && chat.name) // Filter out invalid chats
    .filter(chat =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const renderChatItem = ({ item: chat }) => {
    const unreadCount = ChatService.getUnreadCount(chat.id);
    const lastMessage = chat.lastMessage;
    const participants = participantsData[chat.id] || [];
    
    console.log('🔍 renderChatItem:', chat.name, {
      chatId: chat.id,
      hasParticipantsData: !!participantsData[chat.id],
      participantsCount: participants.length,
      participantsDataKeys: Object.keys(participantsData)
    });
    
    const otherParticipant = Array.isArray(participants) ? participants.find(p => p.id !== ChatService.currentUser?.id) : null;
    
    // Debug logging
    console.log('🔍 renderChatItem for', chat.name, ':', {
      otherParticipant: otherParticipant ? {
        name: otherParticipant.name,
        avatar: otherParticipant.avatar,
        hasAvatar: otherParticipant.avatar ? 'Yes' : 'No'
      } : 'None',
      participants: Array.isArray(participants) ? participants.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })) : [],
      currentUser: ChatService.currentUser?.id
    });
    
    const imageError = imageErrors[chat.id] || false;
    
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(chat)}
        onLongPress={() => handleChatLongPress(chat)}
        activeOpacity={0.7}
      >
        <View style={styles.chatAvatar}>
          {(() => {
            if (chat.type === 'group') {
              return <Text style={styles.chatAvatarText}>👥</Text>;
            } else if (otherParticipant?.avatar && !imageError) {
              return (
                <Image 
                  source={otherParticipant.avatar}
                  style={styles.chatAvatarImage}
                  onError={(error) => {
                    console.log('❌ Image load error for', otherParticipant.name, ':', error.nativeEvent);
                    setImageErrors(prev => ({ ...prev, [chat.id]: true }));
                  }}
                  onLoad={() => {
                    console.log('✅ Image loaded for', otherParticipant.name);
                  }}
                  resizeMode="cover"
                  accessibilityLabel={`Profile picture of ${otherParticipant.name}`}
                />
              );
            } else {
              return (
                <Text style={styles.chatAvatarText}>
                  {otherParticipant?.name?.charAt(0) || '?'}
                </Text>
              );
            }
          })()}
        </View>
        
        <View style={styles.chatContent}>
          {/* DEBUG: Show avatar info on screen */}
          <Text style={{ fontSize: 9, color: 'red', marginBottom: 2 }}>
            Avatar={otherParticipant?.avatar ? 'YES' : 'NO'} | Type={typeof otherParticipant?.avatar} | Err={imageError ? 'Y' : 'N'}
          </Text>
          <Text style={{ fontSize: 9, color: 'blue', marginBottom: 2 }}>
            Participant={otherParticipant ? 'YES' : 'NO'} | Name={otherParticipant?.name || 'NONE'}
          </Text>
          <Text style={{ fontSize: 9, color: 'green', marginBottom: 4 }}>
            ParticipantsData={participants.length} | ChatParticipants={chat.participants?.length || 0}
          </Text>
          <Text style={{ fontSize: 9, color: 'purple', marginBottom: 4 }}>
            ParticipantIDs={JSON.stringify(chat.participants || [])}
          </Text>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {chat.name}
            </Text>
            <Text style={styles.chatTime}>
              {lastMessage ? formatTime(lastMessage.timestamp) : ''}
            </Text>
          </View>
          
          <View style={styles.chatPreview}>
            <Text style={styles.chatLastMessage} numberOfLines={1}>
              {lastMessage ? lastMessage.text : 'No messages yet'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderNewChatModal = () => {
    const users = UserService.getUsers().filter(u => u.id !== ChatService.currentUser?.id);
    
    return (
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Chat</Text>
            <TouchableOpacity onPress={handleCreateChat}>
              <Text style={styles.modalCreate}>Create</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.chatTypeSelector}>
              <TouchableOpacity
                style={[styles.chatTypeButton, !isGroupChat && styles.chatTypeButtonActive]}
                onPress={() => setIsGroupChat(false)}
              >
                <Text style={[styles.chatTypeText, !isGroupChat && styles.chatTypeTextActive]}>
                  Direct Chat
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chatTypeButton, isGroupChat && styles.chatTypeButtonActive]}
                onPress={() => setIsGroupChat(true)}
              >
                <Text style={[styles.chatTypeText, isGroupChat && styles.chatTypeTextActive]}>
                  Group Chat
                </Text>
              </TouchableOpacity>
            </View>
            
            {isGroupChat && (
              <TextInput
                style={styles.groupNameInput}
                placeholder="Group name"
                placeholderTextColor={colors.textSecondary}
                value={newChatName}
                onChangeText={setNewChatName}
              />
            )}
            
            <Text style={styles.participantsTitle}>
              Select {isGroupChat ? 'participants' : 'person'}:
            </Text>
            
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              renderItem={({ item: user }) => (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    selectedUsers.includes(user.id) && styles.userItemSelected
                  ]}
                  onPress={() => toggleUserSelection(user.id)}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <Text style={styles.userName}>{user.name}</Text>
                  {selectedUsers.includes(user.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const renderDeleteConfirmationModal = () => {
    if (!chatToDelete) return null;

    return (
      <Modal
        visible={!!chatToDelete}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Chat Options</Text>
            <Text style={styles.deleteModalMessage}>
              What would you like to do with "{chatToDelete.name}"?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.cancelButton]} 
                onPress={handleCancelDelete}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.leaveButton]} 
                onPress={handleLeaveChat}
              >
                <Text style={styles.leaveButtonText}>Leave</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.deleteButton]} 
                onPress={handleDeleteChat}
              >
                <Text style={styles.deleteButtonText}>Delete All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Messages</Text>
          {totalUnreadCount > 0 && (
            <View style={styles.totalUnreadBadge}>
              <Text style={styles.totalUnreadText}>
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
          <Text style={styles.newChatButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No conversations yet</Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={handleNewChat}>
              <Text style={styles.emptyStateButtonText}>Start a conversation</Text>
            </TouchableOpacity>
          </View>
        }
      />
      
      {renderNewChatModal()}
      {renderDeleteConfirmationModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent + '30',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 10,
  },
  totalUnreadBadge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  totalUnreadText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  newChatButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newChatButtonText: {
    color: colors.surface,
    fontSize: 32,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: '600',
  },
  chatAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatLastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent + '30',
  },
  modalCancel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalCreate: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  chatTypeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 20,
    padding: 4,
  },
  chatTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  chatTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  chatTypeText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chatTypeTextActive: {
    color: colors.surface,
  },
  groupNameInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 8,
  },
  userItemSelected: {
    backgroundColor: colors.accent + '20',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  userName: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  // Delete Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModal: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  leaveButton: {
    backgroundColor: colors.accent,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: '500',
    fontSize: 14,
  },
  leaveButtonText: {
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 14,
  },
  deleteButtonText: {
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
