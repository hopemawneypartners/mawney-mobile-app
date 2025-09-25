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
      
      for (const chat of chats) {
        // Only poll user-to-user chats (not AI assistant or group chats)
        if (chat.type !== 'ai_assistant' && chat.type !== 'group') {
          try {
            // Load messages from server for this chat
            await ChatService.loadUserMessagesFromServer();
            
            // Check if there are any unread messages after loading from server
            const unreadCount = ChatService.getUnreadCount(chat.id);
            if (unreadCount > 0) {
              hasNewMessages = true;
              console.log(`📱 New messages in chat ${chat.name}: ${unreadCount} unread`);
              // Notify listeners about new messages in this chat
              this.notifyListeners('new_message', { chatId: chat.id, unreadCount });
            }
          } catch (chatError) {
            console.error(`❌ Error polling chat ${chat.name}:`, chatError);
          }
        }
      }
      
      // Always notify about polling update to refresh UI
      this.notifyListeners('polling_update');
      
      if (hasNewMessages) {
        console.log('📱 New messages detected during polling');
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
