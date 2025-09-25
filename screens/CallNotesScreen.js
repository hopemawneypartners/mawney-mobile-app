import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserService from '../services/userService';
import TeamsService from '../services/teamsService';

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

export default function CallNotesScreen() {
  const [callNotes, setCallNotes] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [currentCall, setCurrentCall] = useState(null);
  const [teamsMeetings, setTeamsMeetings] = useState([]);
  const [isTeamsAuthenticated, setIsTeamsAuthenticated] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCallNotes();
    initializeTeams();
  }, []);

  const initializeTeams = async () => {
    const authenticated = await TeamsService.initialize();
    setIsTeamsAuthenticated(authenticated);
    if (authenticated) {
      loadTeamsMeetings();
    }
  };

  const authenticateTeams = async () => {
    setIsLoadingTeams(true);
    try {
      const success = await TeamsService.authenticate();
      if (success) {
        setIsTeamsAuthenticated(true);
        await loadTeamsMeetings();
        Alert.alert('Success', 'Connected to Microsoft Teams!');
      } else {
        Alert.alert('Error', 'Failed to connect to Teams');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to authenticate with Teams: ' + error.message);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const loadTeamsMeetings = async () => {
    try {
      const meetings = await TeamsService.getTeamsMeetings();
      setTeamsMeetings(meetings);
    } catch (error) {
      console.error('Error loading Teams meetings:', error);
    }
  };

  const importTeamsTranscription = async (meetingId) => {
    try {
      const callNote = await TeamsService.importTranscriptionToCallNotes(meetingId);
      await loadCallNotes(); // Refresh the call notes
      Alert.alert('Success', 'Teams transcription imported successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to import transcription: ' + error.message);
    }
  };

  const loadCallNotes = async () => {
    try {
      // Load from server first
      const serverNotes = await UserService.loadUserCallNotesFromServer();
      if (serverNotes && serverNotes.length > 0) {
        setCallNotes(serverNotes);
      } else {
        // Fallback to local storage
        const localNotes = await UserService.loadUserData('callNotes', []);
        setCallNotes(localNotes);
        // Sync to server
        if (localNotes.length > 0) {
          await UserService.saveUserCallNotesToServer(localNotes);
        }
      }
    } catch (error) {
      console.error('Error loading call notes:', error);
    }
  };

  const saveCallNotes = async (notes) => {
    try {
      // Save to local storage
      await UserService.saveUserData('callNotes', notes);
      // Save to server
      await UserService.saveUserCallNotesToServer(notes);
    } catch (error) {
      console.error('Error saving call notes:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCallNotes();
    setRefreshing(false);
  };

  const startCallRecording = () => {
    Alert.alert(
      'Start Call Recording',
      'This will begin recording and transcribing your phone call. Make sure you have permission to record.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Recording', 
          onPress: () => {
            setIsRecording(true);
            setCurrentCall({
              id: Date.now(),
              startTime: new Date().toISOString(),
              title: 'Call Recording',
              transcription: '',
              notes: '',
              participants: '',
              status: 'recording'
            });
            // Simulate transcription process
            simulateTranscription();
          }
        }
      ]
    );
  };

  const simulateTranscription = () => {
    // This simulates real-time transcription
    // In a real app, you'd integrate with speech-to-text APIs
    const sampleTranscription = "Hello, this is a sample transcription of the call. The caller is discussing investment opportunities in the credit markets. They mentioned several key points about market conditions and potential deals.";
    
    setTimeout(() => {
      if (currentCall) {
        setCurrentCall(prev => ({
          ...prev,
          transcription: sampleTranscription
        }));
        setIsTranscribing(false);
      }
    }, 3000);
  };

  const stopCallRecording = () => {
    Alert.alert(
      'Stop Recording',
      'Are you sure you want to stop recording this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Stop Recording', 
          onPress: () => {
            setIsRecording(false);
            if (currentCall) {
              const updatedCall = {
                ...currentCall,
                endTime: new Date().toISOString(),
                status: 'completed'
              };
              const updatedNotes = [updatedCall, ...callNotes];
              setCallNotes(updatedNotes);
              saveCallNotes(updatedNotes);
              setCurrentCall(null);
            }
          }
        }
      ]
    );
  };

  const addManualNote = () => {
    if (!newNote.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    const note = {
      id: Date.now(),
      title: newNote.substring(0, 50) + (newNote.length > 50 ? '...' : ''),
      notes: newNote,
      createdAt: new Date().toISOString(),
      type: 'manual'
    };

    const updatedNotes = [note, ...callNotes];
    setCallNotes(updatedNotes);
    saveCallNotes(updatedNotes);
    setNewNote('');
  };

  const deleteNote = (noteId) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            const updatedNotes = callNotes.filter(note => note.id !== noteId);
            setCallNotes(updatedNotes);
            saveCallNotes(updatedNotes);
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Call Notes</Text>
          <Text style={styles.subtitle}>Record and transcribe calls</Text>
        </View>

        {isRecording && currentCall && (
          <View style={styles.recordingContainer}>
            <View style={styles.recordingHeader}>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
              <TouchableOpacity style={styles.stopButton} onPress={stopCallRecording}>
                <Text style={styles.stopButtonText}>Stop</Text>
              </TouchableOpacity>
            </View>
            
            {currentCall.transcription ? (
              <View style={styles.transcriptionContainer}>
                <Text style={styles.transcriptionLabel}>Live Transcription:</Text>
                <Text style={styles.transcriptionText}>{currentCall.transcription}</Text>
              </View>
            ) : (
              <View style={styles.transcribingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.transcribingText}>Transcribing...</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, isRecording && styles.actionButtonDisabled]} 
          onPress={startCallRecording}
          disabled={isRecording}
        >
          <Text style={styles.actionButtonText}>
            {isRecording ? 'Recording...' : 'Start Call Recording'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.teamsContainer}>
        <Text style={styles.sectionTitle}>Teams Meeting Transcription</Text>
        
        <View style={styles.teamsSetup}>
          <Text style={styles.teamsSetupText}>
            Import Teams meeting transcriptions manually:
          </Text>
          
          <View style={styles.teamsSteps}>
            <Text style={styles.teamsStepTitle}>How to get Teams transcriptions:</Text>
            <Text style={styles.teamsStep}>1. Record your Teams meeting (with transcription enabled)</Text>
            <Text style={styles.teamsStep}>2. After the meeting, go to Teams → Files → Recordings</Text>
            <Text style={styles.teamsStep}>3. Download the transcript file (.txt or .vtt)</Text>
            <Text style={styles.teamsStep}>4. Copy the text and paste it below</Text>
          </View>
          
          <TextInput
            style={styles.transcriptInput}
            placeholder="Paste your Teams meeting transcript here..."
            placeholderTextColor={colors.textSecondary}
            value={newNote}
            onChangeText={setNewNote}
            multiline
            numberOfLines={6}
          />
          
          <TouchableOpacity style={styles.importTranscriptButton} onPress={addManualNote}>
            <Text style={styles.importTranscriptButtonText}>Import Transcript</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.manualNoteContainer}>
        <Text style={styles.sectionTitle}>Add Manual Note</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Enter call notes or meeting summary..."
          placeholderTextColor={colors.textSecondary}
          value={newNote}
          onChangeText={setNewNote}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity style={styles.addButton} onPress={addManualNote}>
          <Text style={styles.addButtonText}>Add Note</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.notesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Recent Notes</Text>
        {callNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No call notes yet</Text>
            <Text style={styles.emptySubtext}>Start recording a call or add a manual note</Text>
          </View>
        ) : (
          callNotes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteTitle}>{note.title}</Text>
                <TouchableOpacity onPress={() => deleteNote(note.id)}>
                  <Text style={styles.deleteButton}>×</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.noteDate}>{formatDate(note.createdAt || note.startTime)}</Text>
              {note.transcription && (
                <View style={styles.transcriptionSection}>
                  <Text style={styles.transcriptionLabel}>Transcription:</Text>
                  <Text style={styles.transcriptionText}>{note.transcription}</Text>
                </View>
              )}
              {note.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{note.notes}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
      </View>
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
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  recordingContainer: {
    backgroundColor: colors.error + '10',
    margin: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  stopButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stopButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  transcriptionContainer: {
    marginTop: 10,
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 5,
  },
  transcriptionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  transcribingText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  teamsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  teamsSetup: {
    backgroundColor: colors.accent + '10',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  teamsSetupText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  teamsSteps: {
    marginBottom: 15,
  },
  teamsStepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  teamsStep: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  transcriptInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    color: colors.text,
    marginBottom: 12,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  importTranscriptButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  importTranscriptButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  teamsConnectButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  teamsConnectButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  teamsConnected: {
    backgroundColor: colors.success + '10',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  teamsStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamsStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  teamsRefreshButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  teamsRefreshButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  teamsMeetingsContainer: {
    marginTop: 10,
  },
  teamsMeetingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  teamsMeetingCard: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.accent + '20',
  },
  teamsMeetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  teamsMeetingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  importButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  importButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  teamsMeetingDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  teamsMeetingParticipants: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  manualNoteContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    color: colors.text,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  notesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
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
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  deleteButton: {
    fontSize: 20,
    color: colors.error,
    fontWeight: 'bold',
  },
  noteDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  transcriptionSection: {
    marginBottom: 12,
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 5,
  },
  transcriptionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  notesSection: {
    marginBottom: 0,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: 5,
  },
  notesText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
