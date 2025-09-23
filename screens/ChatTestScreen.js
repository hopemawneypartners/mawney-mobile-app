import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import ChatService from '../services/chatService';
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

export default function ChatTestScreen() {
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  useEffect(() => {
    initializeTest();
  }, []);

  const initializeTest = async () => {
    try {
      await ChatService.initialize();
      loadChats();
    } catch (error) {
      console.error('Error initializing chat test:', error);
    }
  };

  const loadChats = () => {
    const allChats = ChatService.getChats();
    setChats(allChats);
  };

  const loadMessages = (chatId) => {
    const chatMessages = ChatService.getMessages(chatId);
    setMessages(chatMessages);
    setCurrentChatId(chatId);
  };

  const testCreateGroupChat = async () => {
    try {
      const users = ChatService.getUserInfo ? ChatService.getUserInfo() : null;
      if (!users) {
        Alert.alert('Error', 'No users available for testing');
        return;
      }

      const otherUsers = ChatService.getUserInfo ? 
        Object.values(ChatService.getUserInfo()).filter(u => u.id !== ChatService.currentUser?.id) : [];
      
      if (otherUsers.length === 0) {
        Alert.alert('Error', 'No other users available for group chat');
        return;
      }

      const groupChat = await ChatService.createGroupChat(
        'Test Group Chat',
        [otherUsers[0].id]
      );
      
      Alert.alert('Success', `Group chat created: ${groupChat.name}`);
      loadChats();
    } catch (error) {
      console.error('Error creating group chat:', error);
      Alert.alert('Error', 'Failed to create group chat');
    }
  };

  const testSendMessage = async (chatId) => {
    try {
      const testMessage = `Test message at ${new Date().toLocaleTimeString()}`;
      await ChatService.sendMessage(chatId, testMessage);
      loadMessages(chatId);
      Alert.alert('Success', 'Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const testSimulateMessage = (chatId) => {
    const testMessage = {
      id: `test_${Date.now()}`,
      chatId,
      senderId: 'other_user',
      text: `Simulated message at ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toISOString(),
      status: 'received'
    };
    
    ChatPollingService.simulateNewMessage(chatId, testMessage);
    Alert.alert('Success', 'Simulated message sent');
  };

  const clearAllData = async () => {
    try {
      await ChatService.clearAllData();
      loadChats();
      Alert.alert('Success', 'All chat data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Error', 'Failed to clear data');
    }
  };

  const nuclearClear = async () => {
    try {
      await ChatService.clearAllDataForAllUsers();
      loadChats();
      Alert.alert('Success', 'All chat data cleared for all users');
    } catch (error) {
      console.error('Error clearing all data:', error);
      Alert.alert('Error', 'Failed to clear all data');
    }
  };

  const renderChatItem = (chat) => (
    <TouchableOpacity
      key={chat.id}
      style={styles.chatItem}
      onPress={() => loadMessages(chat.id)}
    >
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{chat.name}</Text>
        <Text style={styles.chatType}>{chat.type}</Text>
        <Text style={styles.chatParticipants}>
          {chat.participants.length} participant{chat.participants.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.chatActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => testSendMessage(chat.id)}
        >
          <Text style={styles.actionButtonText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => testSimulateMessage(chat.id)}
        >
          <Text style={styles.actionButtonText}>Simulate</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderMessageItem = (message) => (
    <View key={message.id} style={styles.messageItem}>
      <Text style={styles.messageText}>{message.text}</Text>
      <Text style={styles.messageTime}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Chat System Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Actions</Text>
        <TouchableOpacity style={styles.testButton} onPress={testCreateGroupChat}>
          <Text style={styles.testButtonText}>Create Group Chat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.testButton, styles.clearButton]} onPress={clearAllData}>
          <Text style={styles.testButtonText}>Clear All Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.testButton, styles.nuclearButton]} onPress={nuclearClear}>
          <Text style={styles.testButtonText}>Nuclear Clear (All Users)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Chats</Text>
        {chats.map(renderChatItem)}
      </View>

      {currentChatId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Messages in Selected Chat</Text>
          {messages.length > 0 ? (
            messages.map(renderMessageItem)
          ) : (
            <Text style={styles.emptyText}>No messages yet</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Polling Status</Text>
        <Text style={styles.statusText}>
          Polling: {ChatPollingService.getStatus().isPolling ? 'Active' : 'Inactive'}
        </Text>
        <Text style={styles.statusText}>
          Listeners: {ChatPollingService.getStatus().listenerCount}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: colors.error,
    marginTop: 10,
  },
  nuclearButton: {
    backgroundColor: '#8B0000',
    marginTop: 10,
  },
  chatItem: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  chatType: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chatParticipants: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chatActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  messageItem: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
});
