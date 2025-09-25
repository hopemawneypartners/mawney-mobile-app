import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserService from '../services/userService';
import AIService from '../services/aiService';

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

const { width } = Dimensions.get('window');

export default function AIAssistantScreen() {
  const [query, setQuery] = useState('');
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [suggestions] = useState([
    'Create a senior credit analyst job ad',
    'What is corporate credit?',
    'Format my CV',
    'What are current credit market trends?',
    'Explain credit spreads',
    'Generate a job posting for portfolio manager'
  ]);
  
  // Chat management state
  const [chatSessions, setChatSessions] = useState({});
  const [currentChatId, setCurrentChatId] = useState('default');
  const [menuVisible, setMenuVisible] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const slideAnim = useState(new Animated.Value(-width))[0];
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [savedJobAds, setSavedJobAds] = useState([]);
  const [editingJobAdId, setEditingJobAdId] = useState(null);
  const [editingJobAdName, setEditingJobAdName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJobAd, setSelectedJobAd] = useState(null);
  const [showJobAdModal, setShowJobAdModal] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    // Load saved job ads
    loadSavedJobAds();
    
    // Auto-load job ad examples and industry knowledge for AI learning
    loadJobAdExamples();

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Load chat sessions on component mount
  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    try {
      const response = await fetch('https://mawney-daily-news-api.onrender.com/api/chat/sessions');
      const data = await response.json();
      if (data.success) {
        setChatSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  const createNewChat = async () => {
    if (!newChatName.trim()) {
      Alert.alert('Error', 'Please enter a chat name');
      return;
    }

    try {
      const response = await fetch('https://mawney-daily-news-api.onrender.com/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChatName.trim() })
      });
      
      const data = await response.json();
      if (data.success) {
        setNewChatName('');
        setShowNewChatModal(false);
        loadChatSessions();
        switchToChat(data.chat_id);
        Alert.alert('Success', 'New chat created successfully!');
      } else {
        Alert.alert('Error', data.error || 'Failed to create new chat');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to create new chat');
    }
  };

  const switchToChat = async (chatId) => {
    try {
      const response = await fetch('https://mawney-daily-news-api.onrender.com/api/chat/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId })
      });
      
      if (response.ok) {
        setCurrentChatId(chatId);
        loadChatConversations(chatId);
        toggleMenu();
      }
    } catch (error) {
      console.error('Error switching chat:', error);
    }
  };

  const loadChatConversations = async (chatId) => {
    try {
      const response = await fetch(`https://mawney-daily-news-api.onrender.com/api/chat/sessions/${chatId}/conversations`);
      const data = await response.json();
      if (data.success) {
        // Convert API format to local format
        const formattedResponses = [];
        data.conversations.forEach(conv => {
          formattedResponses.push({
            id: conv.id,
            type: 'user',
            text: conv.user_message,
            timestamp: new Date(conv.timestamp)
          });
          formattedResponses.push({
            id: conv.id + '_ai',
            type: 'ai',
            text: conv.ai_response,
            timestamp: new Date(conv.timestamp)
          });
        });
        setResponses(formattedResponses);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setResponses([]);
    }
  };

  const deleteChat = async (chatId) => {
    if (chatId === 'default') {
      Alert.alert('Cannot Delete', 'Cannot delete the default chat');
      return;
    }

    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`https://mawney-daily-news-api.onrender.com/api/chat/sessions/${chatId}`, {
                method: 'DELETE'
              });
              
              if (response.ok) {
                loadChatSessions();
                if (currentChatId === chatId) {
                  switchToChat('default');
                }
                Alert.alert('Success', 'Chat deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete chat');
              }
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete chat');
            }
          }
        }
      ]
    );
  };

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    setMenuVisible(!menuVisible);
  };

  const handleQuery = async () => {
    if (!query.trim()) return;

    const userQuery = query.trim();
    setQuery('');
    setLoading(true);

    // Add user query to responses
    const newResponses = [...responses, {
      id: Date.now(),
      type: 'user',
      text: userQuery,
      timestamp: new Date()
    }];
    setResponses(newResponses);

    try {
      const aiResponse = await AIService.processQuery(userQuery);
      
      // Add AI response
      const updatedResponses = [...newResponses, {
        id: Date.now() + 1,
        type: 'ai',
        text: aiResponse.text,
        responseType: aiResponse.type,
        confidence: aiResponse.confidence,
        actions: aiResponse.actions || [],
        timestamp: new Date()
      }];
      
      setResponses(updatedResponses);
      
      // Save conversation to API
      try {
        await fetch(`https://mawney-daily-news-api.onrender.com/api/chat/sessions/${currentChatId}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_message: userQuery,
            ai_response: aiResponse.text
          })
        });
      } catch (error) {
        console.error('Error saving conversation to API:', error);
      }
      
    } catch (error) {
      console.error('Error processing query:', error);
      const errorResponses = [...newResponses, {
        id: Date.now() + 1,
        type: 'ai',
        text: 'I apologize, but I encountered an error processing your request. Please try again.',
        responseType: 'error',
        confidence: 0.0,
        timestamp: new Date()
      }];
      setResponses(errorResponses);
      
      // Save error conversation to API
      try {
        await fetch(`https://mawney-daily-news-api.onrender.com/api/chat/sessions/${currentChatId}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_message: userQuery,
            ai_response: 'I apologize, but I encountered an error processing your request. Please try again.'
          })
        });
      } catch (error) {
        console.error('Error saving error conversation to API:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      setIsUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Add file to uploaded files list
        const newFile = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          type: file.mimeType,
          uri: file.uri,
          uploadDate: new Date()
        };
        
        setUploadedFiles(prev => [...prev, newFile]);
        
        // Send file to AI for learning
        await uploadFileToAI(newFile);
        
        Alert.alert('Success', 'File uploaded and AI is learning from it!');
      }
    } catch (error) {
      console.error('File upload error:', error);
      Alert.alert('Error', 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFileToAI = async (file) => {
    try {
      // Read file content
      const response = await fetch(file.uri);
      const fileContent = await response.text();
      
      // Send to AI backend for learning
      const aiResponse = await AIService.learnFromFile(
        file.name,
        fileContent.substring(0, 2000),
        currentChatId
      );
      
      // Add a message about the file upload
      const fileMessage = {
        id: Date.now(),
        type: 'ai',
        text: `📄 Uploaded and learned from: ${file.name}\n\n${aiResponse.text}`,
        timestamp: new Date()
      };
      const updatedResponses = [...responses, fileMessage];
      setResponses(updatedResponses);
      
      // Save file upload conversation to API
      try {
        await fetch(`https://mawney-daily-news-api.onrender.com/api/chat/sessions/${currentChatId}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_message: `📄 File uploaded: ${file.name}`,
            ai_response: `📄 Uploaded and learned from: ${file.name}\n\n${aiResponse.text}`
          })
        });
      } catch (error) {
        console.error('Error saving file conversation to API:', error);
      }
      
    } catch (error) {
      console.error('Error processing file:', error);
      Alert.alert('Error', 'Failed to process file content.');
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const copyToClipboard = async (text) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied!', 'Text copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const saveJobAd = async (jobAdText, responseId) => {
    try {
      const jobAd = {
        id: responseId || Date.now().toString(),
        title: extractJobTitle(jobAdText),
        content: jobAdText,
        savedAt: new Date(),
        chatId: currentChatId
      };

      const updatedJobAds = [...savedJobAds, jobAd];
      setSavedJobAds(updatedJobAds);

      // Save to UserService (both local and server)
      await UserService.saveUserData('savedJobAds', updatedJobAds);
      await UserService.saveUserSavedJobsToServer(updatedJobAds);

      Alert.alert('Saved!', 'Job ad saved successfully');
    } catch (error) {
      console.error('Error saving job ad:', error);
      Alert.alert('Error', 'Failed to save job ad');
    }
  };

  const extractJobTitle = (jobAdText) => {
    // Try to extract job title from the first line or look for common patterns
    const lines = jobAdText.split('\n');
    const firstLine = lines[0].trim();
    
    if (firstLine.length > 0 && firstLine.length < 100) {
      return firstLine;
    }
    
    // Look for patterns like "Job Title:" or similar
    for (const line of lines.slice(0, 5)) {
      if (line.toLowerCase().includes('title:') || line.toLowerCase().includes('position:')) {
        return line.replace(/.*(title|position):\s*/i, '').trim();
      }
    }
    
    return 'Job Ad';
  };

  const loadSavedJobAds = async () => {
    try {
      // Load from server first
      const serverJobAds = await UserService.loadUserSavedJobsFromServer();
      if (serverJobAds && serverJobAds.length > 0) {
        setSavedJobAds(serverJobAds);
      } else {
        // Fallback to local storage
        const localJobAds = await UserService.loadUserData('savedJobAds', []);
        setSavedJobAds(localJobAds);
        // Sync to server
        if (localJobAds.length > 0) {
          await UserService.saveUserSavedJobsToServer(localJobAds);
        }
      }
    } catch (error) {
      console.error('Error loading saved job ads:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedJobAds();
    setRefreshing(false);
  };

  const loadJobAdExamples = async () => {
    try {
      console.log('📚 Loading job ad examples and industry knowledge for AI learning...');
      
      // Check if we've already loaded the examples (clear cache for new system)
      const hasLoadedExamples = await AsyncStorage.getItem('ai_loaded_job_examples');
      if (hasLoadedExamples) {
        console.log('📚 Job ad examples and industry knowledge already loaded, but clearing cache for new system');
        await AsyncStorage.removeItem('ai_loaded_job_examples');
      }

      // Load the job ad examples file
      const response = await fetch('https://mawney-daily-news-api.onrender.com/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `BECOME AN EXPERT CREDIT INDUSTRY AI ASSISTANT WITH COMPREHENSIVE KNOWLEDGE:

You are now a specialized AI assistant for the credit and special situations industry. Learn this comprehensive knowledge base and use it to provide expert insights, definitions, and analysis.

=== CREDIT INDUSTRY TERMINOLOGY & DEFINITIONS ===

**Core Credit Products:**
- High Yield Bonds: Below-investment grade corporate bonds (BB+ and below) offering higher yields due to increased credit risk
- Leveraged Loans: Senior secured loans to companies with high debt-to-equity ratios, typically floating rate
- Distressed Debt: Debt securities of companies in financial distress, bankruptcy, or restructuring
- Special Situations: Investment opportunities arising from corporate events like spin-offs, mergers, restructurings, or regulatory changes
- CLOs (Collateralized Loan Obligations): Structured products backed by pools of leveraged loans
- CDOs (Collateralized Debt Obligations): Structured products backed by various debt instruments
- Mezzanine Debt: Subordinated debt with equity-like features, typically unsecured
- Unitranche: Single-layered debt structure combining senior and subordinated debt
- Second Lien: Debt secured by assets but subordinate to first lien debt
- PIK (Payment-in-Kind): Interest payments made in additional securities rather than cash

**Credit Analysis Terms:**
- Credit Spread: Difference between corporate bond yield and risk-free rate
- Recovery Rate: Percentage of principal recovered in default scenarios
- Default Rate: Percentage of issuers that default within a given period
- Credit Migration: Movement of credit ratings up or down over time
- Covenant: Terms and conditions in loan agreements protecting lenders
- Leverage Ratio: Debt-to-EBITDA ratio measuring financial leverage
- Interest Coverage: EBITDA divided by interest expense
- Debt Service Coverage: Cash flow available to service debt obligations
- Capital Structure: Mix of debt and equity financing
- Refinancing Risk: Risk that debt cannot be refinanced at maturity

**Market Participants:**
- Buy Side: Asset managers, pension funds, insurance companies, hedge funds
- Sell Side: Investment banks, broker-dealers, market makers
- Credit Funds: Specialized investment funds focusing on credit opportunities
- Distressed Funds: Funds specializing in distressed debt and special situations
- CLO Managers: Firms that create and manage CLO structures
- Credit Rating Agencies: S&P, Moody's, Fitch providing credit assessments
- Loan Agents: Banks administering syndicated loans
- Trustees: Entities representing bondholders' interests

**Investment Strategies:**
- Long/Short Credit: Taking long positions in undervalued credits and short positions in overvalued ones
- Relative Value: Identifying mispriced securities relative to similar credits
- Event-Driven: Investing based on corporate events like M&A, spin-offs, restructurings
- Distressed Investing: Investing in companies in financial distress or bankruptcy
- Capital Structure Arbitrage: Exploiting pricing inefficiencies across different parts of a company's capital structure
- Credit Selection: Bottom-up analysis of individual credit opportunities
- Sector Rotation: Shifting allocations based on sector outlook
- Duration Management: Adjusting portfolio sensitivity to interest rate changes

**Risk Management:**
- Credit Risk: Risk of borrower default or credit deterioration
- Market Risk: Risk from changes in market prices and spreads
- Liquidity Risk: Risk of being unable to sell positions quickly
- Concentration Risk: Risk from overexposure to single names, sectors, or regions
- Model Risk: Risk from errors in quantitative models
- Operational Risk: Risk from internal processes, systems, or human error
- Counterparty Risk: Risk that trading partners default on obligations
- Basis Risk: Risk from imperfect hedging relationships

**Market Dynamics:**
- Credit Cycle: Recurring pattern of credit expansion and contraction
- Default Cycle: Pattern of corporate defaults over economic cycles
- Spread Cycle: Pattern of credit spread widening and tightening
- Liquidity Cycle: Changes in market liquidity over time
- Risk-On/Risk-Off: Market sentiment driving credit performance
- Flight to Quality: Movement of capital to safer assets during stress
- Credit Crunch: Period of reduced credit availability
- Distressed Cycle: Period of increased corporate distress and defaults

=== JOB AD WRITING STYLE (LEARN THIS EXACT FORMAT) ===

EXAMPLE 1 - Special Situations Investment Analyst – VP/Director-level

Our client, a top-performing credit fund are seeking to add a talented special situations investment professional to their growing team in London. This is a key hire for the fund, following several years of strong performance and AuM growth.

This individual will sit within a highly talented investment team to focus on investing in both public and private special situations opportunities in Europe. The ideal candidate will therefore be able to demonstrate the following attributes:

Origination, analysis and execution of special situations investment opportunities on a pan-European basis
In-depth knowledge of the high yield, distressed debt, and special situations in public and private markets
Strong communication in presenting investment/trade ideas to senior individuals and the investment committee
Using a developed sourcing network to originate investment ideas - amongst the restructuring firms, advisors, law firms, bank desks, etc.

Whilst our client would be seeking an individual at the Vice President-level and above, they do not wish to exclude any talented more junior candidates that may be able to demonstrate the above abilities. This will therefore suit an investment analyst who has gained experience within a similar special situations strategy – or indeed, a background in opportunistic credit, distressed debt, or capital solutions investing.

This is a fantastic opportunity for a driven professional to join a highly regarded investment team.

WRITING STYLE PATTERNS:
- Always start with "Our client" or "We are presently advising"
- Mention company performance, growth, or strategic importance
- Use "The ideal candidate will therefore be able to demonstrate the following attributes:" or similar
- Use bullet points for responsibilities
- Include "This is a fantastic opportunity" or similar closing
- Use professional, confident language with industry terminology

=== YOUR CAPABILITIES ===

You can now:
1. **Define any credit industry term** with professional accuracy
2. **Explain market dynamics** and credit cycles
3. **Analyze credit opportunities** using industry frameworks
4. **Write professional job ads** in the exact style shown
5. **Provide market insights** based on industry knowledge
6. **Format CVs** for credit industry roles
7. **Explain complex structures** like CLOs, CDOs, and special situations
8. **Assess risk factors** in credit investments
9. **Provide career guidance** for credit professionals
10. **Analyze market trends** and their implications

Always use professional, confident language and demonstrate deep industry expertise in all responses.`,
          context: { chat_id: 'default', is_file_learning: true, file_type: 'job_ad_examples' }
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log('✅ Job ad examples loaded successfully');
        await AsyncStorage.setItem('ai_loaded_job_examples', 'true');
        
        // Add a system message to show the examples were loaded
        const systemMessage = {
          id: `system_${Date.now()}`,
          type: 'ai',
          text: '🧠 I am now an expert credit industry AI assistant with comprehensive knowledge of terminology, market dynamics, and professional practices. I can define any credit term, explain complex structures like CLOs and CDOs, analyze market trends, write professional job ads, format CVs, and provide expert insights on credit investments, risk management, and career guidance.\n\n🔍 **NEW: Online Search Capability** - I can now search online for the latest articles and news using our comprehensive database of 30+ RSS feeds from Financial Times, Bloomberg, Creditflux, GlobalCapital, and more. Just ask me to search for any topic, find latest news, or get updates on specific companies or market trends!',
          timestamp: new Date()
        };
        setResponses(prev => [...prev, systemMessage]);
      } else {
        console.log('⚠️ Failed to load job ad examples:', data.error);
      }
    } catch (error) {
      console.error('❌ Error loading job ad examples:', error);
    }
  };

  const deleteJobAd = async (jobAdId) => {
    try {
      const updatedJobAds = savedJobAds.filter(jobAd => jobAd.id !== jobAdId);
      setSavedJobAds(updatedJobAds);
      
      // Save to UserService (both local and server)
      await UserService.saveUserData('savedJobAds', updatedJobAds);
      await UserService.saveUserSavedJobsToServer(updatedJobAds);
      
      Alert.alert('Deleted', 'Job ad removed successfully');
    } catch (error) {
      console.error('Error deleting job ad:', error);
      Alert.alert('Error', 'Failed to delete job ad');
    }
  };

  const startEditingJobAd = (jobAd) => {
    setEditingJobAdId(jobAd.id);
    setEditingJobAdName(jobAd.title);
  };

  const saveJobAdEdit = async () => {
    if (!editingJobAdName.trim()) {
      Alert.alert('Error', 'Please enter a name for the job ad');
      return;
    }

    try {
      const updatedJobAds = savedJobAds.map(jobAd => 
        jobAd.id === editingJobAdId 
          ? { ...jobAd, title: editingJobAdName.trim() }
          : jobAd
      );
      setSavedJobAds(updatedJobAds);
      
      // Save to UserService (both local and server)
      await UserService.saveUserData('savedJobAds', updatedJobAds);
      await UserService.saveUserSavedJobsToServer(updatedJobAds);
      
      setEditingJobAdId(null);
      setEditingJobAdName('');
      Alert.alert('Success', 'Job ad name updated');
    } catch (error) {
      console.error('Error updating job ad:', error);
      Alert.alert('Error', 'Failed to update job ad name');
    }
  };

  const cancelJobAdEdit = () => {
    setEditingJobAdId(null);
    setEditingJobAdName('');
  };

  const openJobAdModal = (jobAd) => {
    setSelectedJobAd(jobAd);
    setShowJobAdModal(true);
  };

  const closeJobAdModal = () => {
    setSelectedJobAd(null);
    setShowJobAdModal(false);
  };

  const handleSuggestionPress = (suggestion) => {
    setQuery(suggestion);
  };

  const handleActionPress = (action, responseText, responseId) => {
    switch (action) {
      case 'copy_to_clipboard':
        copyToClipboard(responseText);
        break;
      case 'save_job_ad':
        saveJobAd(responseText, responseId);
        break;
      case 'save_cv':
        Alert.alert('Save CV', 'This feature would save the formatted CV.');
        break;
      default:
        Alert.alert('Action', `Action: ${action}`);
    }
  };

  const renderResponse = (response) => {
    const isUser = response.type === 'user';
    
    return (
      <View key={response.id} style={[styles.responseContainer, isUser ? styles.userResponse : styles.aiResponse]}>
        <View style={[styles.responseBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.responseText, isUser ? styles.userText : styles.aiText]}>
            {response.text}
          </Text>
          
          {!isUser && response.responseType && (
            <View style={styles.responseMeta}>
              <Text style={styles.responseType}>
                {response.responseType === 'job_ad' && '📄 Job Advertisement'}
                {response.responseType === 'cv_format' && '+ CV Format'}
                {response.responseType === 'market_insight' && '📊 Market Insight'}
                {response.responseType === 'answer' && '💡 Answer'}
                {response.responseType === 'error' && '❌ Error'}
              </Text>
              {response.confidence && (
                <Text style={styles.confidence}>
                  Confidence: {Math.round(response.confidence * 100)}%
                </Text>
              )}
            </View>
          )}
          
          {!isUser && response.actions && response.actions.length > 0 && (
            <View style={styles.actionsContainer}>
              {response.actions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.actionButton}
                  onPress={() => handleActionPress(action, response.text, response.id)}
                >
                  <Text style={styles.actionButtonText}>
                    {action === 'copy_to_clipboard' && '+ Copy'}
                    {action === 'save_job_ad' && '💾 Save Job Ad'}
                    {action === 'save_cv' && '💾 Save CV'}
                    {action === 'save_market_insight' && '💾 Save Insight'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSubtitle}>
            {chatSessions[currentChatId]?.name || 'General Chat'}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.responsesContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {responses.length === 0 && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome to your AI Assistant!</Text>
            <Text style={styles.welcomeText}>
              I can help you with:
            </Text>
            <Text style={styles.welcomeList}>
              • Creating job advertisements{'\n'}
              • Formatting CVs and resumes{'\n'}
              • Providing market insights{'\n'}
              • Explaining financial terms{'\n'}
              • Answering credit market questions
            </Text>
            <Text style={styles.welcomeSubtext}>
              Try one of the suggestions below or ask me anything!
            </Text>
          </View>
        )}
        
        {responses.map(renderResponse)}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {!keyboardVisible && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Quick Suggestions:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionButton}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* File Upload Section */}
      {uploadedFiles.length > 0 && (
        <View style={styles.fileUploadSection}>
          <Text style={styles.fileUploadTitle}>📄 Uploaded Files</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {uploadedFiles.map((file) => (
              <View key={file.id} style={styles.fileItem}>
                <Text style={styles.fileName}>{file.name}</Text>
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={() => removeFile(file.id)}
                >
                  <Text style={styles.removeFileText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}


      <View style={[styles.inputContainer, keyboardVisible && styles.inputContainerKeyboardVisible]}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleFileUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={styles.uploadButtonText}>📄</Text>
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Ask me anything about finance, jobs, or markets..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !query.trim() && styles.sendButtonDisabled]}
          onPress={handleQuery}
          disabled={!query.trim() || loading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Hamburger Menu */}
      <Animated.View style={[styles.menuOverlay, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.menuContainer}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity onPress={toggleMenu}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.menuContent}>
            <Text style={styles.menuSectionTitle}>● Chat Sessions</Text>
            {Object.entries(chatSessions).map(([chatId, session]) => (
              <TouchableOpacity
                key={chatId}
                style={[
                  styles.chatItem,
                  currentChatId === chatId && styles.activeChatItem
                ]}
                onPress={() => switchToChat(chatId)}
              >
                <View style={styles.chatItemContent}>
                  <Text style={[
                    styles.chatItemName,
                    currentChatId === chatId && styles.activeChatItemName
                  ]}>
                    {session.name}
                  </Text>
                  <Text style={styles.chatItemTopic}>{session.topic}</Text>
                </View>
                {chatId !== 'default' && (
                  <TouchableOpacity
                    style={styles.deleteChatButton}
                    onPress={() => deleteChat(chatId)}
                  >
                    <Text style={styles.deleteChatIcon}>X</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={() => setShowNewChatModal(true)}
            >
              <Text style={styles.newChatIcon}>+</Text>
              <Text style={styles.newChatText}>New Chat</Text>
            </TouchableOpacity>

            {/* Saved Job Ads Section */}
            {savedJobAds.length > 0 && (
              <View style={styles.menuJobAdsSection}>
                <Text style={styles.menuJobAdsTitle}>■ Saved Job Ads</Text>
                {savedJobAds.map((jobAd) => (
                  <View key={jobAd.id} style={styles.menuJobAdItem}>
                    {editingJobAdId === jobAd.id ? (
                      <View style={styles.menuJobAdEditContainer}>
                        <TextInput
                          style={styles.menuJobAdEditInput}
                          value={editingJobAdName}
                          onChangeText={setEditingJobAdName}
                          placeholder="Enter job ad name"
                          autoFocus
                        />
                        <View style={styles.menuJobAdEditActions}>
                          <TouchableOpacity
                            style={styles.menuJobAdSaveButton}
                            onPress={saveJobAdEdit}
                          >
                            <Text style={styles.menuJobAdSaveText}>✓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.menuJobAdCancelButton}
                            onPress={cancelJobAdEdit}
                          >
                            <Text style={styles.menuJobAdCancelText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity 
                          style={styles.menuJobAdContent}
                          onPress={() => openJobAdModal(jobAd)}
                        >
                          <Text style={styles.menuJobAdTitle} numberOfLines={1}>
                            {jobAd.title}
                          </Text>
                          <Text style={styles.menuJobAdDate}>
                            {new Date(jobAd.savedAt).toLocaleDateString()}
                          </Text>
                        </TouchableOpacity>
                        <View style={styles.menuJobAdActions}>
                          <TouchableOpacity
                            style={styles.menuJobAdEditButton}
                            onPress={() => startEditingJobAd(jobAd)}
                          >
                            <Text style={styles.menuJobAdEditText}>E</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.menuJobAdActionButton}
                            onPress={() => copyToClipboard(jobAd.content)}
                          >
                            <Text style={styles.menuJobAdActionText}>+</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.menuJobAdDeleteButton}
                            onPress={() => deleteJobAd(jobAd.id)}
                          >
                            <Text style={styles.menuJobAdDeleteText}>X</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Animated.View>

      {/* New Chat Modal */}
      <Modal
        visible={showNewChatModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Chat</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter chat name..."
              value={newChatName}
              onChangeText={setNewChatName}
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowNewChatModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={createNewChat}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Job Ad Modal */}
      <Modal
        visible={showJobAdModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeJobAdModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.jobAdModalContainer}>
            <View style={styles.jobAdModalHeader}>
              <Text style={styles.jobAdModalTitle}>
                {selectedJobAd?.title || 'Job Ad'}
              </Text>
              <TouchableOpacity onPress={closeJobAdModal}>
                <Text style={styles.jobAdModalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.jobAdModalContent}>
              <Text style={styles.jobAdModalDate}>
                Saved: {selectedJobAd ? new Date(selectedJobAd.savedAt).toLocaleString() : ''}
              </Text>
              
              <Text style={styles.jobAdModalText}>
                {selectedJobAd?.content || ''}
              </Text>
            </ScrollView>
            
            <View style={styles.jobAdModalActions}>
              <TouchableOpacity
                style={styles.jobAdModalActionButton}
                onPress={() => {
                  if (selectedJobAd) {
                    copyToClipboard(selectedJobAd.content);
                  }
                }}
              >
                <Text style={styles.jobAdModalActionText}>+ Copy to Clipboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.jobAdModalActionButton, styles.jobAdModalCloseActionButton]}
                onPress={closeJobAdModal}
              >
                <Text style={styles.jobAdModalActionText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginRight: 15,
    padding: 5,
  },
  menuIcon: {
    fontSize: 20,
    color: colors.surface,
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.surface,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.surface,
    opacity: 0.8,
    marginTop: 2,
  },
  responsesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 10,
  },
  welcomeList: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 15,
  },
  welcomeSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  responseContainer: {
    marginVertical: 8,
  },
  userResponse: {
    alignItems: 'flex-end',
  },
  aiResponse: {
    alignItems: 'flex-start',
  },
  responseBubble: {
    maxWidth: '85%',
    padding: 15,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: colors.primary,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: colors.surface,
  },
  aiText: {
    color: colors.text,
  },
  responseMeta: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responseType: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },
  confidence: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionsContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 5,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: colors.textSecondary,
    fontSize: 14,
  },
  suggestionsContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  suggestionsScroll: {
    flexDirection: 'row',
  },
  suggestionButton: {
    backgroundColor: colors.background,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
    alignItems: 'flex-end',
  },
  inputContainerKeyboardVisible: {
    paddingBottom: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  sendButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  fileUploadSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
  },
  fileUploadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  fileItem: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  fileName: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  removeFileButton: {
    backgroundColor: colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeFileText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  uploadButtonText: {
    fontSize: 18,
  },
  // Menu styles
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.surface,
  },
  closeButton: {
    fontSize: 20,
    color: colors.surface,
    fontWeight: 'bold',
  },
  menuContent: {
    flex: 1,
    paddingTop: 20,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  activeChatItem: {
    backgroundColor: colors.accent,
  },
  chatItemContent: {
    flex: 1,
  },
  chatItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  activeChatItemName: {
    color: colors.surface,
  },
  chatItemTopic: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteChatButton: {
    padding: 5,
  },
  deleteChatIcon: {
    fontSize: 16,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 10,
    backgroundColor: colors.accent,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  newChatIcon: {
    fontSize: 20,
    color: colors.surface,
    marginRight: 10,
  },
  newChatText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  // Menu Job Ads Styles
  menuJobAdsSection: {
    marginTop: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
    paddingTop: 20,
  },
  menuJobAdsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
    marginBottom: 15,
  },
  menuJobAdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  menuJobAdContent: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 4,
  },
  menuJobAdTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  menuJobAdDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  menuJobAdActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuJobAdActionButton: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  menuJobAdActionText: {
    color: colors.surface,
    fontSize: 14,
  },
  menuJobAdDeleteButton: {
    backgroundColor: colors.error,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuJobAdDeleteText: {
    color: colors.surface,
    fontSize: 14,
  },
  // Edit Job Ad Styles
  menuJobAdEditContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuJobAdEditInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    marginRight: 10,
  },
  menuJobAdEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuJobAdEditButton: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  menuJobAdEditText: {
    color: colors.surface,
    fontSize: 14,
  },
  menuJobAdSaveButton: {
    backgroundColor: colors.success,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  menuJobAdSaveText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuJobAdCancelButton: {
    backgroundColor: colors.error,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuJobAdCancelText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    width: width * 0.8,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 5,
    backgroundColor: colors.textSecondary,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  modalButtonPrimaryText: {
    color: colors.surface,
  },
  // Job Ad Modal Styles
  jobAdModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    margin: 20,
    maxHeight: '80%',
    minHeight: '60%',
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  jobAdModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent + '30',
  },
  jobAdModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  jobAdModalCloseButton: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  jobAdModalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  jobAdModalDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  jobAdModalText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  jobAdModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: colors.accent + '30',
    gap: 10,
  },
  jobAdModalActionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  jobAdModalCloseActionButton: {
    backgroundColor: colors.accent,
  },
  jobAdModalActionText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
});
