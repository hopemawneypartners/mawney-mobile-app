import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  Image,
  SafeAreaView,
  Modal,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import ChatService from '../services/chatService';
import ChatPollingService from '../services/chatPollingService';
import ChatNotificationService from '../services/chatNotificationService';

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

export default function ChatScreen({ route, navigation }) {
  const { chatId, chatName, chatType } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [fullScreenDocument, setFullScreenDocument] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({});
  const [showMembersModal, setShowMembersModal] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    initializeChat();
    // Mark messages as read when entering chat
    ChatService.markAsRead(chatId);
    // Clear notifications for this chat
    ChatNotificationService.cancelChatNotifications(chatId);
    
    // Set up polling listener
    const handlePollingUpdate = (event, data) => {
      if (event === 'polling_update') {
        loadMessages();
      } else if (event === 'new_message' && data?.chatId === chatId) {
        loadMessages();
        // Scroll to bottom when new message arrives
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };
    
    ChatPollingService.addListener(handlePollingUpdate);
    
    return () => {
      ChatPollingService.removeListener(handlePollingUpdate);
    };
  }, [chatId]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      await ChatService.initialize();
      loadMessages();
      await loadParticipants();
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      const chatParticipants = await ChatService.getChatParticipants(chatId);
      console.log('📋 Loaded participants for chat:', chatId, chatParticipants);
      setParticipants(chatParticipants || []);
    } catch (error) {
      console.error('Error loading participants:', error);
      setParticipants([]);
    }
  };

  const loadMessages = () => {
    const chatMessages = ChatService.getMessages(chatId);
    setMessages(chatMessages);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadMessages();
    setRefreshing(false);
  }, [chatId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const message = await ChatService.sendMessage(chatId, newMessage.trim());
      setNewMessage('');
      loadMessages();
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Don't force editing/cropping
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await sendAttachment(imageUri, 'image');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const documentUri = result.assets[0].uri;
        const fileName = result.assets[0].name;
        await sendAttachment(documentUri, 'document', fileName);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const sendAttachment = async (uri, type, fileName = null) => {
    try {
      setSending(true);
      
      // Convert file to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const message = await ChatService.sendMessage(chatId, `[${type.toUpperCase()}] ${fileName || 'Attachment'}`, type, base64);
      loadMessages();
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending attachment:', error);
      Alert.alert('Error', 'Failed to send attachment');
    } finally {
      setSending(false);
    }
  };

  const showAttachmentOptions = () => {
    Alert.alert(
      'Attach File',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Document', onPress: pickDocument },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // Don't force editing/cropping
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await sendAttachment(imageUri, 'image');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const saveToDevice = async (attachment, type, filename) => {
    try {
      // For web, use a different approach
      if (Platform.OS === 'web') {
        // Create a download link for web
        const link = document.createElement('a');
        link.href = attachment;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Success', `${type === 'image' ? 'Image' : 'Document'} download started`);
        return;
      }

      // For mobile platforms, convert base64 to file
      const base64Data = attachment.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      const fileUri = FileSystem.documentDirectory + filename;
      
      if (type === 'image') {
        // Request permission to save to media library
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant permission to save images to your device');
          return;
        }

        // Write base64 data to file
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: 'base64',
        });

        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        Alert.alert('Success', 'Image saved to your photo library');
      } else {
        // For documents, save to downloads folder
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: 'base64',
        });
        
        Alert.alert('Success', `Document saved as ${filename}`);
      }
    } catch (error) {
      console.error('Error saving file:', error);
      Alert.alert('Error', `Failed to save file: ${error.message}`);
    }
  };

  const handleAttachmentPress = (attachment, type, text) => {
    if (type === 'image') {
      setFullScreenImage(attachment);
    } else {
      setFullScreenDocument({ attachment, filename: text.replace(/^\[DOCUMENT\]\s/, '') });
    }
  };

  const handleAttachmentLongPress = (attachment, type, text) => {
    const filename = type === 'image' ? `image_${Date.now()}.jpg` : text.replace(/^\[DOCUMENT\]\s/, '');
    
    Alert.alert(
      'Save Attachment',
      `Save ${type === 'image' ? 'image' : 'document'} to device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: () => saveToDevice(attachment, type, filename) }
      ]
    );
  };

  const renderMessage = ({ item: message, index }) => {
    const isCurrentUser = message.senderId === ChatService.currentUser?.id;
    const sender = participants?.find(p => p.id === message.senderId);
    const showAvatar = !isCurrentUser && (
      index === 0 || 
      messages[index - 1]?.senderId !== message.senderId
    );

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {showAvatar && (
          <View style={styles.messageAvatar}>
            {sender?.avatar ? (
              <Image 
                source={typeof sender.avatar === 'string' ? { uri: sender.avatar } : sender.avatar} 
                style={styles.messageAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.messageAvatarText}>
                {sender?.name?.charAt(0) || '?'}
              </Text>
            )}
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          {!isCurrentUser && showAvatar && (
            <Text style={styles.senderName}>{sender?.name}</Text>
          )}
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {message.text}
          </Text>
          {message.attachment && (
            <View style={styles.attachmentContainer}>
              {message.type === 'image' ? (
                <Pressable
                  onPress={() => handleAttachmentPress(message.attachment, message.type, message.text)}
                  onLongPress={() => handleAttachmentLongPress(message.attachment, message.type, message.text)}
                  style={styles.imageAttachment}
                >
                  <Image 
                    source={{ uri: message.attachment }} 
                    style={[
                      styles.attachmentImage,
                      imageDimensions[message.id] && {
                        width: Math.min(imageDimensions[message.id].width, 250),
                        height: Math.min(imageDimensions[message.id].height, 300),
                      }
                    ]}
                    resizeMode="contain"
                    onLoad={(event) => {
                      const { width, height } = event.nativeEvent.source;
                      setImageDimensions(prev => ({
                        ...prev,
                        [message.id]: { width, height }
                      }));
                    }}
                  />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => handleAttachmentPress(message.attachment, message.type, message.text)}
                  onLongPress={() => handleAttachmentLongPress(message.attachment, message.type, message.text)}
                  style={styles.documentAttachment}
                >
                  <Text style={styles.documentIcon}>📄</Text>
                  <Text style={styles.documentText}>
                    {message.text.replace(/^\[DOCUMENT\]\s/, '')}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isCurrentUser ? styles.currentUserTime : styles.otherUserTime
            ]}>
              {formatMessageTime(message.timestamp)}
            </Text>
            {isCurrentUser && (
              <Text style={styles.readReceipt}>
                {message.readBy && message.readBy.length > 1 ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
             ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderHeader = () => {
    const otherParticipants = participants?.filter(p => p.id !== ChatService.currentUser?.id) || [];
    
    return (
      <View style={styles.chatHeader}>
        <Text style={styles.chatTitle}>{chatName}</Text>
        {chatType === 'group' && (
          <TouchableOpacity 
            onPress={() => setShowMembersModal(true)}
            style={styles.memberCountButton}
          >
            <Text style={styles.participantCount}>
              {participants.length} member{participants.length !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
        {chatType === 'direct' && otherParticipants.length > 0 && (
          <Text style={styles.participantInfo}>
            {otherParticipants[0].email}
          </Text>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {chatType === 'group' 
          ? 'Start the conversation!' 
          : 'Send your first message'
        }
      </Text>
    </View>
  );

  const renderMembersModal = () => (
    <Modal
      visible={showMembersModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowMembersModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.membersModal}>
          <View style={styles.membersModalHeader}>
            <Text style={styles.membersModalTitle}>Group Members</Text>
            <TouchableOpacity 
              onPress={() => setShowMembersModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.membersList}>
            {participants.map((member) => (
              <View key={member.id} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  {member.avatar ? (
                    <Image 
                      source={typeof member.avatar === 'string' ? { uri: member.avatar } : member.avatar} 
                      style={styles.memberAvatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.memberAvatarText}>
                      {member.name?.charAt(0) || '?'}
                    </Text>
                  )}
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                  {member.id === ChatService.currentUser?.id && (
                    <Text style={styles.youLabel}>(You)</Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderHeader()}
        
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachmentButton}
            onPress={showAttachmentOptions}
            disabled={sending}
          >
            <Text style={styles.attachmentButtonText}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <Text style={styles.sendButtonText}>
              {sending ? '...' : '→'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Full Screen Image Modal */}
      <Modal
        visible={!!fullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullScreenImage(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <ScrollView
            contentContainerStyle={styles.fullScreenImageContainer}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </ScrollView>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              if (fullScreenImage) {
                handleAttachmentLongPress(fullScreenImage, 'image', 'image');
              }
            }}
          >
            <Text style={styles.saveButtonText}>💾 Save</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Full Screen Document Modal */}
      <Modal
        visible={!!fullScreenDocument}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenDocument(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullScreenDocument(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.fullScreenDocumentContainer}>
            <Text style={styles.documentTitle}>{fullScreenDocument?.filename}</Text>
            <Text style={styles.documentContent}>
              {fullScreenDocument?.attachment ? 'Document content loaded' : 'Loading...'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              if (fullScreenDocument) {
                handleAttachmentLongPress(fullScreenDocument.attachment, 'document', fullScreenDocument.filename);
              }
            }}
          >
            <Text style={styles.saveButtonText}>💾 Save</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Members Modal */}
      {renderMembersModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  chatHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent + '30',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  participantCount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  participantInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  messageAvatarText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  currentUserBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  senderName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: colors.surface,
  },
  otherUserText: {
    color: colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  currentUserTime: {
    color: colors.surface + '80',
    textAlign: 'right',
  },
  otherUserTime: {
    color: colors.textSecondary,
  },
  readReceipt: {
    fontSize: 10,
    color: colors.surface + '80',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.accent + '30',
    alignItems: 'flex-end',
  },
  attachmentButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentButtonText: {
    fontSize: 18,
    color: colors.accent,
  },
  attachmentContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageAttachment: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachmentImage: {
    maxWidth: 250,
    maxHeight: 300,
    width: '100%',
    height: 'auto',
    borderRadius: 8,
  },
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.accent + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  documentIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  documentText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  fullScreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  fullScreenDocumentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  documentContent: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  saveButton: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  sendButtonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  // Member count button styles
  memberCountButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  // Members modal styles
  membersModal: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    minHeight: 300,
  },
  membersModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  membersModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  membersList: {
    maxHeight: 400,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  youLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});
