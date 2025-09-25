import ChatService from './chatService';

class ChatPollingService {
  constructor() {
    this.pollingInterval = null;
    this.isPolling = false;
    this.pollingIntervalMs = 5000; // Poll every 5 seconds
    this.listeners = new Set();
  }

  // Start polling for new messages
  startPolling() {
    if (this.isPolling) {
      console.log('📱 Chat polling already running');
      return;
    }

    console.log('📱 Starting chat polling...');
    this.isPolling = true;
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkForNewMessages();
      } catch (error) {
        console.error('❌ Error during chat polling:', error);
      }
    }, this.pollingIntervalMs);
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      console.log('📱 Stopping chat polling...');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
    }
  }

  // Check for new messages
  async checkForNewMessages() {
    try {
      console.log('📱 Polling for new messages...');
      
      // Load new messages from server for all user-to-user chats
      const chats = ChatService.getChats();
      let hasNewMessages = false;
      let totalUnreadCount = 0;
      
      // Store previous unread counts to detect changes
      const previousUnreadCounts = {};
      for (const chat of chats) {
        if (chat.type !== 'ai_assistant' && chat.type !== 'group') {
          previousUnreadCounts[chat.id] = ChatService.getUnreadCount(chat.id);
        }
      }
      
      // Load messages from server for all chats
      await ChatService.loadUserMessagesFromServer();
      
      // Check for changes in unread counts
      for (const chat of chats) {
        // Only check user-to-user chats (not AI assistant or group chats)
        if (chat.type !== 'ai_assistant' && chat.type !== 'group') {
          try {
            const currentUnreadCount = ChatService.getUnreadCount(chat.id);
            const previousUnreadCount = previousUnreadCounts[chat.id] || 0;
            
            totalUnreadCount += currentUnreadCount;
            
            // If unread count increased, we have new messages
            if (currentUnreadCount > previousUnreadCount) {
              hasNewMessages = true;
              console.log(`📱 New messages in chat ${chat.name}: ${currentUnreadCount} unread (was ${previousUnreadCount})`);
              // Notify listeners about new messages in this specific chat
              this.notifyListeners('new_message', { 
                chatId: chat.id, 
                unreadCount: currentUnreadCount,
                chatName: chat.name,
                newMessagesCount: currentUnreadCount - previousUnreadCount
              });
            } else if (currentUnreadCount > 0) {
              // Chat has unread messages but no new ones
              console.log(`📱 Chat ${chat.name} has ${currentUnreadCount} unread messages`);
            }
          } catch (chatError) {
            console.error(`❌ Error checking chat ${chat.name}:`, chatError);
          }
        }
      }
      
      // Always notify about polling update to refresh UI
      this.notifyListeners('polling_update', { 
        totalUnreadCount,
        hasNewMessages,
        timestamp: new Date().toISOString()
      });
      
      if (hasNewMessages) {
        console.log(`📱 New messages detected during polling. Total unread: ${totalUnreadCount}`);
      } else if (totalUnreadCount > 0) {
        console.log(`📱 No new messages, but ${totalUnreadCount} total unread messages across all chats`);
      }
    } catch (error) {
      console.error('❌ Error checking for new messages:', error);
    }
  }

  // Add a listener for polling events
  addListener(callback) {
    this.listeners.add(callback);
  }

  // Remove a listener
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(event, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('❌ Error in chat polling listener:', error);
      }
    });
  }

  // Simulate receiving a new message (for testing)
  simulateNewMessage(chatId, message) {
    console.log('📱 Simulating new message:', message);
    this.notifyListeners('new_message', { chatId, message });
  }

  // Get polling status
  getStatus() {
    return {
      isPolling: this.isPolling,
      intervalMs: this.pollingIntervalMs,
      listenerCount: this.listeners.size
    };
  }

  // Update polling interval
  setPollingInterval(intervalMs) {
    this.pollingIntervalMs = intervalMs;
    
    if (this.isPolling) {
      // Restart with new interval
      this.stopPolling();
      this.startPolling();
    }
  }
}

export default new ChatPollingService();
