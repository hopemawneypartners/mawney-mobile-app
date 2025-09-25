import AsyncStorage from '@react-native-async-storage/async-storage';
import UserService from './userService';
import ChatNotificationService from './chatNotificationService';

const CHAT_STORAGE_KEY = 'mawney_chats';
const MESSAGES_STORAGE_KEY = 'mawney_messages';
const SHARED_GROUP_CHATS_KEY = 'mawney_shared_group_chats';

class ChatService {
  constructor() {
    this.chats = [];
    this.messages = [];
    this.currentUser = null;
    this.apiBaseUrl = 'https://mawney-daily-news-api.onrender.com';
  }

  // Initialize chat service
  async initialize() {
    try {
      this.currentUser = await UserService.loadCurrentUser();
      console.log('🔍 ChatService initialize - Current user:', this.currentUser);
      
      if (!this.currentUser) {
        console.error('❌ No current user found in ChatService');
        return false;
      }
      
      await this.loadChats();
      await this.loadMessages();
      
      // Initialize chat notifications
      await ChatNotificationService.initialize(this.currentUser);
      
      return true;
    } catch (error) {
      console.error('Error initializing chat service:', error);
      return false;
    }
  }

  // Load all chats for current user
  async loadChats() {
    try {
      // Load user's personal chats from local storage first (fast)
      const chatsData = await AsyncStorage.getItem(`${CHAT_STORAGE_KEY}_${this.currentUser?.id}`);
      let userChats = [];
      
      if (chatsData) {
        const parsedChats = JSON.parse(chatsData);
        // Check if we have any invalid chats
        const hasInvalidChats = parsedChats.some(chat => 
          !chat || !chat.id || chat.id.includes('NaN') || chat.id.includes('undefined')
        );
        
        if (hasInvalidChats) {
          console.log('🧹 Found invalid chats, clearing all data and recreating...');
          // Clear all data and recreate
          await this.clearAllData();
          userChats = await this.createDefaultChats();
          await this.saveChats();
        } else {
          userChats = parsedChats;
        }
      } else {
        // Initialize with some default chats
        userChats = await this.createDefaultChats();
        await this.saveChats();
      }

      // Load shared group chats that this user should be part of
      const sharedGroupChats = await this.loadSharedGroupChats();
      
      // Combine user chats with shared group chats, removing duplicates
      const allChats = [...userChats, ...sharedGroupChats];
      const uniqueChats = allChats.filter((chat, index, self) => 
        index === self.findIndex(c => c.id === chat.id)
      );
      
      this.chats = uniqueChats;
      
      console.log(`✅ Loaded ${userChats.length} user chats and ${sharedGroupChats.length} shared group chats`);
      
      // Load chats from server in background (non-blocking)
      this.loadAIChatsFromServer().catch(error => {
        console.log('Background AI chat sync failed:', error.message);
      });
      this.loadUserChatsFromServer().catch(error => {
        console.log('Background user chat sync failed:', error.message);
      });
      
    } catch (error) {
      console.error('Error loading chats:', error);
      this.chats = [];
    }
  }

  // Load AI Assistant chats from server
  async loadAIChatsFromServer() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/chat/sessions`);
      const data = await response.json();
      
      if (data.success && data.sessions) {
        // Convert API format to local format for AI Assistant chats
        const aiChats = data.sessions.map(session => ({
          id: session.id,
          name: session.name,
          type: 'ai_assistant',
          participants: [this.currentUser?.id],
          lastMessage: null,
          lastMessageTime: session.created_at,
          unreadCount: 0,
          isGroup: false
        }));
        
        // Remove existing AI chats from local storage and add server ones
        const existingChats = await AsyncStorage.getItem(`${CHAT_STORAGE_KEY}_${this.currentUser?.id}`);
        if (existingChats) {
          const parsedChats = JSON.parse(existingChats);
          const nonAiChats = parsedChats.filter(chat => chat.type !== 'ai_assistant');
          const updatedChats = [...nonAiChats, ...aiChats];
          await AsyncStorage.setItem(`${CHAT_STORAGE_KEY}_${this.currentUser.id}`, JSON.stringify(updatedChats));
        }
        
        console.log('📱 Loaded AI chats from server:', aiChats.length);
      }
    } catch (error) {
      console.log('📱 Server AI chat load failed:', error.message);
    }
  }

  // Load user-to-user chats from server
  async loadUserChatsFromServer() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/user-chats?email=${encodeURIComponent(this.currentUser.email)}`);
      const data = await response.json();
      
      if (data.success && data.chats) {
        // Filter out AI chats and group chats, only get user-to-user chats
        const userToUserChats = data.chats.filter(chat => 
          chat.type !== 'ai_assistant' && chat.type !== 'group'
        );
        
        if (userToUserChats.length > 0) {
          // Remove existing user-to-user chats from local storage and add server ones
          const existingChats = await AsyncStorage.getItem(`${CHAT_STORAGE_KEY}_${this.currentUser?.id}`);
          if (existingChats) {
            const parsedChats = JSON.parse(existingChats);
            const nonUserChats = parsedChats.filter(chat => 
              chat.type === 'ai_assistant' || chat.type === 'group'
            );
            const updatedChats = [...nonUserChats, ...userToUserChats];
            await AsyncStorage.setItem(`${CHAT_STORAGE_KEY}_${this.currentUser.id}`, JSON.stringify(updatedChats));
          }
          
          console.log('📱 Loaded user-to-user chats from server:', userToUserChats.length);
        }
      }
    } catch (error) {
      console.log('📱 Server user chat load failed:', error.message);
    }
  }

  // Load shared group chats that this user should be part of
  async loadSharedGroupChats() {
    try {
      const sharedGroupChatsData = await AsyncStorage.getItem(SHARED_GROUP_CHATS_KEY);
      if (!sharedGroupChatsData) return [];

      const allSharedGroupChats = JSON.parse(sharedGroupChatsData);
      
      // Filter to only include group chats where this user is a participant
      const userGroupChats = allSharedGroupChats.filter(chat => 
        chat.type === 'group' && 
        chat.participants && 
        chat.participants.includes(this.currentUser.id)
      );

      // Sync each group chat with its messages to get proper lastMessage and unreadCount
      const syncedGroupChats = await Promise.all(
        userGroupChats.map(async (chat) => {
          const syncedChat = { ...chat };
          
          // Get messages for this chat
          const chatMessages = this.getMessages(chat.id);
          
          if (chatMessages.length > 0) {
            // Sort messages by timestamp to get the latest
            const sortedMessages = chatMessages.sort((a, b) => 
              new Date(b.timestamp) - new Date(a.timestamp)
            );
            const lastMessage = sortedMessages[0];
            
            // Update lastMessage
            syncedChat.lastMessage = {
              text: lastMessage.text.length > 50 ? lastMessage.text.substring(0, 50) + '...' : lastMessage.text,
              senderId: lastMessage.senderId,
              timestamp: lastMessage.timestamp
            };
            
            // Calculate unread count (messages not read by current user)
            const unreadCount = chatMessages.filter(msg => 
              msg.senderId !== this.currentUser.id && 
              (!msg.readBy || !msg.readBy.includes(this.currentUser.id))
            ).length;
            
            syncedChat.unreadCount = unreadCount;
          } else {
            // No messages yet
            syncedChat.lastMessage = null;
            syncedChat.unreadCount = 0;
          }
          
          return syncedChat;
        })
      );

      console.log(`📥 Found ${syncedGroupChats.length} shared group chats for user ${this.currentUser.id}`);
      return syncedGroupChats;
    } catch (error) {
      console.error('Error loading shared group chats:', error);
      return [];
    }
  }

  // Load all messages
  async loadMessages() {
    try {
      // Load user's own messages
      const messagesData = await AsyncStorage.getItem(`${MESSAGES_STORAGE_KEY}_${this.currentUser?.id}`);
      const userMessages = messagesData ? JSON.parse(messagesData) : [];
      console.log('📥 Loaded user messages:', userMessages.length);
      
      // Load shared messages from all chats (fast local load)
      const sharedMessages = [];
      for (const chat of this.chats) {
        const sharedKey = `shared_messages_${chat.id}`;
        const sharedData = await AsyncStorage.getItem(sharedKey);
        if (sharedData) {
          const chatMessages = JSON.parse(sharedData);
          sharedMessages.push(...chatMessages);
          console.log(`📥 Loaded ${chatMessages.length} shared messages for chat ${chat.id}`);
        }
      }
      
      // Combine and deduplicate messages
      const allMessages = [...userMessages, ...sharedMessages];
      const uniqueMessages = allMessages.filter((message, index, self) => 
        index === self.findIndex(m => m.id === message.id)
      );
      
      console.log('📥 Total messages loaded:', uniqueMessages.length);
      this.messages = uniqueMessages;
      
      // Load messages from server in background (non-blocking)
      this.loadAIMessagesFromServer().catch(error => {
        console.log('Background AI message sync failed:', error.message);
      });
      this.loadUserMessagesFromServer().catch(error => {
        console.log('Background user message sync failed:', error.message);
      });
      
    } catch (error) {
      console.error('Error loading messages:', error);
      this.messages = [];
    }
  }

  // Load AI Assistant messages from server
  async loadAIMessagesFromServer() {
    try {
      // Load messages for each AI chat session
      for (const chat of this.chats) {
        if (chat.type === 'ai_assistant') {
          const response = await fetch(`${this.apiBaseUrl}/api/chat/sessions/${chat.id}/conversations`);
          const data = await response.json();
          
          if (data.success && data.conversations) {
            // Convert API format to local format
            const aiMessages = [];
            data.conversations.forEach(conv => {
              aiMessages.push({
                id: conv.id,
                chatId: chat.id,
                senderId: this.currentUser.id,
                text: conv.user_message,
                timestamp: conv.timestamp,
                type: 'text'
              });
              aiMessages.push({
                id: conv.id + '_ai',
                chatId: chat.id,
                senderId: 'ai',
                text: conv.ai_response,
                timestamp: conv.timestamp,
                type: 'text'
              });
            });
            
            // Save to local storage
            const sharedKey = `shared_messages_${chat.id}`;
            await AsyncStorage.setItem(sharedKey, JSON.stringify(aiMessages));
            
            console.log(`📥 Loaded ${aiMessages.length} AI messages for chat ${chat.id}`);
          }
        }
      }
    } catch (error) {
      console.log('📥 Server AI message load failed:', error.message);
    }
  }

  // Load user-to-user messages from server
  async loadUserMessagesFromServer() {
    try {
      console.log('📥 Starting loadUserMessagesFromServer...');
      console.log('📥 Total chats to check:', this.chats.length);
      
      // Load messages for each user-to-user chat
      for (const chat of this.chats) {
        console.log(`📥 Checking chat ${chat.id} (type: ${chat.type})`);
        
        if (chat.type !== 'ai_assistant' && chat.type !== 'group') {
          console.log(`📥 Loading messages for user-to-user chat ${chat.id}`);
          
          const response = await fetch(`${this.apiBaseUrl}/api/user-messages?chat_id=${chat.id}`);
          const data = await response.json();
          
          console.log(`📥 Server response for chat ${chat.id}:`, {
            success: data.success,
            messageCount: data.messages?.length || 0
          });
          
          if (data.success && data.messages) {
            // Save to local storage
            const sharedKey = `shared_messages_${chat.id}`;
            await AsyncStorage.setItem(sharedKey, JSON.stringify(data.messages));
            
            console.log(`✅ Loaded ${data.messages.length} user messages for chat ${chat.id}`);
          } else {
            console.log(`⚠️ No messages found for chat ${chat.id}`);
          }
        } else {
          console.log(`⏭️ Skipping chat ${chat.id} (type: ${chat.type})`);
        }
      }
    } catch (error) {
      console.error('❌ Server user message load failed:', error);
    }
  }

  // Save chats to storage
  async saveChats() {
    try {
      // Save to local storage
      await AsyncStorage.setItem(
        `${CHAT_STORAGE_KEY}_${this.currentUser?.id}`,
        JSON.stringify(this.chats)
      );
      
      // Save user-to-user chats to server
      await this.saveUserChatsToServer();
    } catch (error) {
      console.error('Error saving chats:', error);
    }
  }

  // Save user-to-user chats to server
  async saveUserChatsToServer() {
    try {
      // Filter out AI chats and group chats, only save user-to-user chats
      const userToUserChats = this.chats.filter(chat => 
        chat.type !== 'ai_assistant' && chat.type !== 'group'
      );
      
      if (userToUserChats.length > 0) {
        const response = await fetch(`${this.apiBaseUrl}/api/user-chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: this.currentUser.email,
            chats: userToUserChats
          })
        });
        
        const data = await response.json();
        if (data.success) {
          console.log('📤 Saved user-to-user chats to server:', userToUserChats.length);
        }
      }
    } catch (error) {
      console.log('📤 Server user chat save failed:', error.message);
    }
  }

  // Save messages to storage
  async saveMessages() {
    try {
      // Save to local storage
      await AsyncStorage.setItem(
        `${MESSAGES_STORAGE_KEY}_${this.currentUser?.id}`,
        JSON.stringify(this.messages)
      );
      
      // Save user-to-user messages to server
      await this.saveUserMessagesToServer();
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }

  // Save user-to-user messages to server
  async saveUserMessagesToServer() {
    try {
      console.log('📤 Starting saveUserMessagesToServer...');
      console.log('📤 Total messages:', this.messages.length);
      console.log('📤 Total chats:', this.chats.length);
      
      // Group messages by chat ID
      const messagesByChat = {};
      this.messages.forEach(message => {
        if (message.chatId && !messagesByChat[message.chatId]) {
          messagesByChat[message.chatId] = [];
        }
        if (message.chatId) {
          messagesByChat[message.chatId].push(message);
        }
      });
      
      console.log('📤 Messages grouped by chat:', Object.keys(messagesByChat));
      
      // Save messages for each user-to-user chat
      for (const [chatId, messages] of Object.entries(messagesByChat)) {
        const chat = this.chats.find(c => c.id === chatId);
        console.log(`📤 Processing chat ${chatId}:`, {
          chatFound: !!chat,
          chatType: chat?.type,
          messageCount: messages.length,
          shouldSave: chat && chat.type !== 'ai_assistant' && chat.type !== 'group'
        });
        
        if (chat && chat.type !== 'ai_assistant' && chat.type !== 'group') {
          console.log(`📤 Saving ${messages.length} messages to server for chat ${chatId} (type: ${chat.type})`);
          
          const response = await fetch(`${this.apiBaseUrl}/api/user-messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId,
              messages: messages
            })
          });
          
          const data = await response.json();
          if (data.success) {
            console.log(`✅ Successfully saved ${messages.length} messages to server for chat ${chatId}`);
          } else {
            console.error(`❌ Failed to save messages for chat ${chatId}:`, data.error);
          }
        } else {
          console.log(`⏭️ Skipping chat ${chatId} (type: ${chat?.type || 'not found'})`);
        }
      }
    } catch (error) {
      console.error('❌ Server user message save failed:', error);
    }
  }

  // Create default chats
  async createDefaultChats() {
    const users = UserService.getUsers();
    const currentUserId = this.currentUser?.id;
    
    console.log('🔍 ChatService - Current user:', this.currentUser);
    console.log('🔍 ChatService - Current user ID:', currentUserId);
    console.log('🔍 ChatService - Available users:', users.map(u => ({ id: u.id, name: u.name })));
    
    // Don't create chats if current user is invalid
    if (!currentUserId || currentUserId === 'NaN' || currentUserId === 'undefined') {
      console.error('❌ Invalid current user ID, skipping chat creation');
      return [];
    }
    
    const defaultChats = [
      {
        id: 'general',
        name: 'General Discussion',
        type: 'group',
        participants: users.map(u => u.id),
        createdBy: currentUserId,
        createdAt: new Date().toISOString(),
        lastMessage: {
          text: 'Welcome to the general discussion!',
          senderId: currentUserId,
          timestamp: new Date().toISOString()
        },
        unreadCount: 0
      },
      {
        id: 'market-updates',
        name: 'Market Updates',
        type: 'group',
        participants: users.map(u => u.id),
        createdBy: currentUserId,
        createdAt: new Date().toISOString(),
        lastMessage: {
          text: 'Share market insights and news here',
          senderId: currentUserId,
          timestamp: new Date().toISOString()
        },
        unreadCount: 0
      }
    ];

    // Create individual chats with other users
    const individualChats = users
      .filter(user => user.id !== currentUserId && currentUserId && user.id)
      .map(user => {
        // Create a consistent ID by sorting the user IDs alphabetically
        const sortedIds = [currentUserId, user.id].sort();
        return {
          id: `direct_${sortedIds[0]}_${sortedIds[1]}`,
          name: user.name,
          type: 'direct',
          participants: [currentUserId, user.id],
          createdBy: currentUserId,
          createdAt: new Date().toISOString(),
          lastMessage: null,
          unreadCount: 0
        };
      });

    return [...defaultChats, ...individualChats];
  }

  // Get all chats
  getChats() {
    return this.chats.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(a.createdAt);
      const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(b.createdAt);
      return bTime - aTime;
    });
  }

  // Get messages for a specific chat
  getMessages(chatId) {
    return this.messages
      .filter(msg => msg.chatId === chatId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // Send a message
  async sendMessage(chatId, text, messageType = 'text', attachment = null) {
    try {
      const chat = this.chats.find(c => c.id === chatId);
      const participants = chat ? chat.participants : [];
      
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chatId,
        senderId: this.currentUser.id,
        text,
        type: messageType,
        attachment: attachment, // Store base64 attachment data
        timestamp: new Date().toISOString(),
        status: 'sent',
        readBy: [], // Start with empty readBy - will be updated when others read
        readReceipts: participants.reduce((acc, participantId) => {
          acc[participantId] = null; // No one has read yet
          return acc;
        }, {})
      };

      console.log('📤 Sending message:', {
        chatId,
        senderId: this.currentUser.id,
        text: text.substring(0, 50) + '...',
        messageId: message.id
      });

      // Store message in shared storage (accessible by all users)
      await this.saveSharedMessage(message);
      console.log('✅ Message saved to shared storage');

      // Update current user's messages
      this.messages.push(message);
      await this.saveMessages();
      console.log('✅ Message saved to user storage');

      // Save message to server for cross-device sync
      await this.saveUserMessagesToServer();
      console.log('✅ Message saved to server for cross-device sync');

      // Update chat's last message for all participants
      await this.updateChatLastMessage(chatId, message);
      console.log('✅ Chat last message updated for all participants');

      // Send notification to other participants
      await this.sendMessageNotification(chatId, message);

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Send notification for new message
  async sendMessageNotification(chatId, message) {
    try {
      const chat = this.chats.find(c => c.id === chatId);
      if (!chat) return;

      // Get sender info
      const senderInfo = await this.getUserInfo(message.senderId);
      const senderName = senderInfo?.name || 'Someone';

      // Determine chat name
      let chatName;
      if (chat.type === 'group') {
        chatName = chat.name;
      } else {
        // For direct chats, use the other participant's name
        const otherParticipantId = chat.participants.find(id => id !== this.currentUser.id);
        if (otherParticipantId) {
          const otherParticipant = await this.getUserInfo(otherParticipantId);
          chatName = otherParticipant?.name || 'Unknown';
        }
      }

      // Send notification
      await ChatNotificationService.sendMessageNotification(
        message,
        senderName,
        chatName,
        chatId
      );

      console.log('💬 Notification sent for new message');
    } catch (error) {
      console.error('❌ Error sending message notification:', error);
    }
  }

  // Save message to shared storage
  async saveSharedMessage(message) {
    try {
      const sharedKey = `shared_messages_${message.chatId}`;
      const existingMessages = await AsyncStorage.getItem(sharedKey);
      const messages = existingMessages ? JSON.parse(existingMessages) : [];
      messages.push(message);
      await AsyncStorage.setItem(sharedKey, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving shared message:', error);
    }
  }

  // Update chat's last message for all participants
  async updateChatLastMessage(chatId, message) {
    try {
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) {
        chat.lastMessage = {
          text: message.text.length > 50 ? message.text.substring(0, 50) + '...' : message.text,
          senderId: message.senderId,
          timestamp: message.timestamp
        };
        await this.saveChats();

        // If it's a group chat, update the shared group chat storage
        if (chat.type === 'group') {
          await this.saveSharedGroupChat(chat);
        }

        // Update for all participants
        const participants = chat.participants;
        for (const participantId of participants) {
          if (participantId !== this.currentUser.id) {
            await this.updateParticipantChat(participantId, chatId, chat.lastMessage);
          }
        }
      }
    } catch (error) {
      console.error('Error updating chat last message:', error);
    }
  }

  // Update chat for a specific participant
  async updateParticipantChat(participantId, chatId, lastMessage) {
    try {
      const participantChatsKey = `${CHAT_STORAGE_KEY}_${participantId}`;
      const participantChatsData = await AsyncStorage.getItem(participantChatsKey);
      
      if (participantChatsData) {
        const participantChats = JSON.parse(participantChatsData);
        const participantChat = participantChats.find(c => c.id === chatId);
        
        if (participantChat) {
          participantChat.lastMessage = lastMessage;
          participantChat.unreadCount = (participantChat.unreadCount || 0) + 1;
          await AsyncStorage.setItem(participantChatsKey, JSON.stringify(participantChats));
        }
      }
    } catch (error) {
      console.error('Error updating participant chat:', error);
    }
  }

  // Create a new group chat
  async createGroupChat(name, participantIds) {
    try {
      const chatId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const participants = [this.currentUser.id, ...participantIds];

      const newChat = {
        id: chatId,
        name,
        type: 'group',
        participants,
        createdBy: this.currentUser.id,
        createdAt: new Date().toISOString(),
        lastMessage: null,
        unreadCount: 0
      };

      // Add chat to current user's chat list
      this.chats.push(newChat);
      await this.saveChats();

      // Save group chat to shared storage
      await this.saveSharedGroupChat(newChat);

      // Send welcome message
      await this.sendMessage(chatId, `${this.currentUser.name} created the group "${name}"`);

      console.log(`✅ Group chat "${name}" created and saved to shared storage`);
      return newChat;
    } catch (error) {
      console.error('Error creating group chat:', error);
      throw error;
    }
  }

  // Create a direct chat with another user
  async createDirectChat(userId) {
    try {
      const otherUser = UserService.getUsers().find(u => u.id === userId);
      if (!otherUser) {
        throw new Error('User not found');
      }

      // Create a consistent ID by sorting the user IDs alphabetically
      const sortedIds = [this.currentUser.id, userId].sort();
      const chatId = `direct_${sortedIds[0]}_${sortedIds[1]}`;
      
      // Check if chat already exists
      const existingChat = this.chats.find(c => c.id === chatId);
      if (existingChat) {
        return existingChat;
      }

      const newChat = {
        id: chatId,
        name: otherUser.name,
        type: 'direct',
        participants: [this.currentUser.id, userId],
        createdBy: this.currentUser.id,
        createdAt: new Date().toISOString(),
        lastMessage: null,
        unreadCount: 0
      };

      this.chats.push(newChat);
      await this.saveChats();

      return newChat;
    } catch (error) {
      console.error('Error creating direct chat:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markAsRead(chatId) {
    try {
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) {
        chat.unreadCount = 0;
        await this.saveChats();

        // If it's a group chat, update the shared group chat storage
        if (chat.type === 'group') {
          await this.saveSharedGroupChat(chat);
        }
      }
      
      // Mark individual messages as read
      await this.markMessagesAsRead(chatId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  // Mark messages as read with read receipts
  async markMessagesAsRead(chatId) {
    try {
      const chatMessages = this.getMessages(chatId);
      const unreadMessages = chatMessages.filter(msg => 
        msg.senderId !== this.currentUser.id && 
        (!msg.readBy || !msg.readBy.includes(this.currentUser.id))
      );

      if (unreadMessages.length === 0) return;

      const now = new Date().toISOString();
      
      for (const message of unreadMessages) {
        // Update readBy array
        if (!message.readBy) {
          message.readBy = [];
        }
        if (!message.readBy.includes(this.currentUser.id)) {
          message.readBy.push(this.currentUser.id);
        }

        // Update readReceipts
        if (!message.readReceipts) {
          message.readReceipts = {};
        }
        message.readReceipts[this.currentUser.id] = now;
      }

      // Update the message in shared storage
      const sharedKey = `shared_messages_${chatId}`;
      const sharedData = await AsyncStorage.getItem(sharedKey);
      if (sharedData) {
        let sharedMessages = JSON.parse(sharedData);
        sharedMessages = sharedMessages.map(msg => {
          const updatedMsg = unreadMessages.find(um => um.id === msg.id);
          return updatedMsg || msg;
        });
        await AsyncStorage.setItem(sharedKey, JSON.stringify(sharedMessages));
      }

      // Update the message in user storage
      await this.saveMessages();

      console.log(`✅ Marked ${unreadMessages.length} messages as read in chat ${chatId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Update shared message
  async updateSharedMessage(chatId, messages) {
    try {
      const sharedKey = `shared_messages_${chatId}`;
      const existingData = await AsyncStorage.getItem(sharedKey);
      const existingMessages = existingData ? JSON.parse(existingData) : [];
      
      // Update existing messages with new read receipts
      const updatedMessages = existingMessages.map(existingMsg => {
        const updatedMsg = messages.find(msg => msg.id === existingMsg.id);
        return updatedMsg || existingMsg;
      });
      
      await AsyncStorage.setItem(sharedKey, JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Error updating shared message:', error);
    }
  }

  // Get unread count for a chat
  getUnreadCount(chatId) {
    const chat = this.chats.find(c => c.id === chatId);
    return chat ? chat.unreadCount : 0;
  }

  // Get total unread count
  getTotalUnreadCount() {
    return this.chats.reduce((total, chat) => total + chat.unreadCount, 0);
  }

  // Get user info by ID
  async getUserInfo(userId) {
    const user = UserService.getUsers().find(u => u.id === userId);
    if (!user) return null;
    
    // Get actual uploaded avatar
    const actualAvatar = await UserService.getActualAvatar(userId);
    
    return {
      ...user,
      avatar: actualAvatar || user.avatar // Use uploaded avatar or fallback to generated one
    };
  }

  // Get chat participants info
  async getChatParticipants(chatId) {
    const chat = this.chats.find(c => c.id === chatId);
    if (!chat) return [];

    try {
      const participants = await Promise.all(
        chat.participants.map(userId => this.getUserInfo(userId))
      );
      return participants.filter(Boolean);
    } catch (error) {
      console.error('Error getting chat participants:', error);
      return [];
    }
  }

  // Delete a chat
  async deleteChat(chatId) {
    try {
      this.chats = this.chats.filter(c => c.id !== chatId);
      this.messages = this.messages.filter(m => m.chatId !== chatId);
      await this.saveChats();
      await this.saveMessages();
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  // Search messages
  searchMessages(query, chatId = null) {
    let messagesToSearch = this.messages;
    
    if (chatId) {
      messagesToSearch = messagesToSearch.filter(m => m.chatId === chatId);
    }

    return messagesToSearch.filter(msg => 
      msg.text.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Get chat by ID
  getChat(chatId) {
    return this.chats.find(c => c.id === chatId);
  }

  // Clear all chat data (for debugging)
  async clearAllData() {
    try {
      await AsyncStorage.removeItem(`${CHAT_STORAGE_KEY}_${this.currentUser?.id}`);
      await AsyncStorage.removeItem(`${MESSAGES_STORAGE_KEY}_${this.currentUser?.id}`);
      this.chats = [];
      this.messages = [];
      console.log('🧹 All chat data cleared');
    } catch (error) {
      console.error('Error clearing chat data:', error);
    }
  }

  // Clear all chat data for all users (nuclear option)
  async clearAllDataForAllUsers() {
    try {
      const users = UserService.getUsers();
      for (const user of users) {
        await AsyncStorage.removeItem(`${CHAT_STORAGE_KEY}_${user.id}`);
        await AsyncStorage.removeItem(`${MESSAGES_STORAGE_KEY}_${user.id}`);
      }
      this.chats = [];
      this.messages = [];
      console.log('🧹 All chat data cleared for all users');
    } catch (error) {
      console.error('Error clearing all chat data:', error);
    }
  }

  // Update chat name (for group chats)
  async updateChatName(chatId, newName) {
    try {
      const chat = this.chats.find(c => c.id === chatId);
      if (chat && chat.type === 'group') {
        chat.name = newName;
        await this.saveChats();
        return chat;
      }
      throw new Error('Chat not found or not a group chat');
    } catch (error) {
      console.error('Error updating chat name:', error);
      throw error;
    }
  }

  // Add participant to group chat
  async addParticipant(chatId, userId) {
    try {
      const chat = this.chats.find(c => c.id === chatId);
      if (chat && chat.type === 'group' && !chat.participants.includes(userId)) {
        chat.participants.push(userId);
        await this.saveChats();
        
        // Update shared group chat
        await this.saveSharedGroupChat(chat);
        
        // Send notification message
        const user = await this.getUserInfo(userId);
        await this.sendMessage(chatId, `${user.name} was added to the group`);
        
        return chat;
      }
      throw new Error('Chat not found, not a group chat, or user already in chat');
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  // Remove participant from group chat
  async removeParticipant(chatId, userId) {
    try {
      const chat = this.chats.find(c => c.id === chatId);
      if (chat && chat.type === 'group') {
        chat.participants = chat.participants.filter(id => id !== userId);
        await this.saveChats();
        
        // Send notification message
        const user = await this.getUserInfo(userId);
        await this.sendMessage(chatId, `${user.name} was removed from the group`);
        
        return chat;
      }
      throw new Error('Chat not found or not a group chat');
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  // Leave chat (only removes from current user's list)
  async leaveChat(chatId) {
    try {
      console.log(`🚪 Leaving chat: ${chatId}`);
      
      // Remove chat from current user's chats
      this.chats = this.chats.filter(chat => chat.id !== chatId);
      await this.saveChats();
      
      // Remove all messages for this chat from user's messages
      this.messages = this.messages.filter(message => message.chatId !== chatId);
      await this.saveMessages();
      
      // If it's a group chat, send a notification message
      const chat = await this.getChatById(chatId);
      if (chat && chat.type === 'group') {
        await this.sendMessage(chatId, `${this.currentUser.name} left the group`);
      }
      
      console.log(`✅ Left chat ${chatId} successfully`);
      return true;
    } catch (error) {
      console.error('Error leaving chat:', error);
      return false;
    }
  }

  // Delete a chat and all its messages
  async deleteChat(chatId) {
    try {
      console.log(`🗑️ Deleting chat: ${chatId}`);
      
      // Remove chat from current user's chats
      this.chats = this.chats.filter(chat => chat.id !== chatId);
      await this.saveChats();
      
      // Remove all messages for this chat from user's messages
      this.messages = this.messages.filter(message => message.chatId !== chatId);
      await this.saveMessages();
      
      // Remove shared messages for this chat
      const sharedKey = `shared_messages_${chatId}`;
      await AsyncStorage.removeItem(sharedKey);
      
      // Remove chat from all participants' chat lists
      const chat = await this.getChatById(chatId);
      if (chat && chat.participants) {
        for (const participantId of chat.participants) {
          if (participantId !== this.currentUser.id) {
            await this.removeChatFromParticipant(participantId, chatId);
          }
        }
      }
      
      // Remove from shared group chats if it's a group
      if (chat && chat.type === 'group') {
        await this.removeSharedGroupChat(chatId);
      }
      
      console.log(`✅ Chat ${chatId} deleted successfully`);
      return true;
    } catch (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
  }

  // Get chat by ID (checks both user chats and shared group chats)
  async getChatById(chatId) {
    try {
      // First check user's chats
      let chat = this.chats.find(c => c.id === chatId);
      
      // If not found, check shared group chats
      if (!chat) {
        const sharedGroupChatsData = await AsyncStorage.getItem(SHARED_GROUP_CHATS_KEY);
        if (sharedGroupChatsData) {
          const sharedGroupChats = JSON.parse(sharedGroupChatsData);
          chat = sharedGroupChats.find(c => c.id === chatId);
        }
      }
      
      return chat;
    } catch (error) {
      console.error('Error getting chat by ID:', error);
      return null;
    }
  }

  // Remove group chat from shared storage
  async removeSharedGroupChat(chatId) {
    try {
      const existingData = await AsyncStorage.getItem(SHARED_GROUP_CHATS_KEY);
      if (existingData) {
        const sharedGroupChats = JSON.parse(existingData);
        const filteredChats = sharedGroupChats.filter(c => c.id !== chatId);
        await AsyncStorage.setItem(SHARED_GROUP_CHATS_KEY, JSON.stringify(filteredChats));
        console.log(`🗑️ Removed group chat ${chatId} from shared storage`);
      }
    } catch (error) {
      console.error('Error removing shared group chat:', error);
    }
  }

  // Save group chat to shared storage
  async saveSharedGroupChat(chat) {
    try {
      const existingData = await AsyncStorage.getItem(SHARED_GROUP_CHATS_KEY);
      const sharedGroupChats = existingData ? JSON.parse(existingData) : [];
      
      // Check if chat already exists
      const existingChatIndex = sharedGroupChats.findIndex(c => c.id === chat.id);
      if (existingChatIndex >= 0) {
        // Update existing chat
        sharedGroupChats[existingChatIndex] = chat;
      } else {
        // Add new chat
        sharedGroupChats.push(chat);
      }
      
      await AsyncStorage.setItem(SHARED_GROUP_CHATS_KEY, JSON.stringify(sharedGroupChats));
      console.log(`💾 Saved group chat "${chat.name}" to shared storage`);
    } catch (error) {
      console.error('Error saving shared group chat:', error);
    }
  }

  // Add chat to a specific participant's chat list
  async addChatToParticipant(participantId, chat) {
    try {
      const participantChatsKey = `${CHAT_STORAGE_KEY}_${participantId}`;
      const participantChatsData = await AsyncStorage.getItem(participantChatsKey);
      
      let participantChats = participantChatsData ? JSON.parse(participantChatsData) : [];
      
      // Check if chat already exists for this participant
      const existingChat = participantChats.find(c => c.id === chat.id);
      if (!existingChat) {
        participantChats.push(chat);
        await AsyncStorage.setItem(participantChatsKey, JSON.stringify(participantChats));
        console.log(`✅ Added chat ${chat.name} to participant ${participantId}`);
      }
    } catch (error) {
      console.error(`Error adding chat to participant ${participantId}:`, error);
    }
  }

  // Remove chat from a specific participant's chat list
  async removeChatFromParticipant(participantId, chatId) {
    try {
      const participantChatsKey = `${CHAT_STORAGE_KEY}_${participantId}`;
      const participantChatsData = await AsyncStorage.getItem(participantChatsKey);
      
      if (participantChatsData) {
        const participantChats = JSON.parse(participantChatsData);
        const updatedChats = participantChats.filter(chat => chat.id !== chatId);
        await AsyncStorage.setItem(participantChatsKey, JSON.stringify(updatedChats));
        console.log(`🗑️ Removed chat ${chatId} from participant ${participantId}`);
      }
    } catch (error) {
      console.error(`Error removing chat from participant ${participantId}:`, error);
    }
  }
}

export default new ChatService();
