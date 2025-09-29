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
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

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
    const sampleTranscriptions = [
      "Hello, this is John from ABC Corp. How are you today?",
      "I wanted to discuss the quarterly results and our upcoming projects.",
      "The market conditions have been challenging, but we're seeing some positive trends.",
      "What are your thoughts on the new regulatory changes?",
      "I think we should schedule a follow-up meeting next week.",
      "Thank you for your time today. I'll send you the summary by email."
    ];
    
    let currentIndex = 0;
    let currentText = "";
    
    const transcriptionInterval = setInterval(() => {
      if (currentCall && currentIndex < sampleTranscriptions.length) {
        currentText += sampleTranscriptions[currentIndex] + " ";
        setCurrentCall(prev => ({
          ...prev,
          transcription: currentText
        }));
        currentIndex++;
      } else if (currentCall) {
        // Add more realistic transcription
        currentText += "The call is continuing... ";
        setCurrentCall(prev => ({
          ...prev,
          transcription: currentText
        }));
      }
    }, 3000);
    
    // Store interval ID for cleanup
    setCurrentCall(prev => ({
      ...prev,
      transcriptionInterval: transcriptionInterval
    }));
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
              // Clear transcription interval
              if (currentCall.transcriptionInterval) {
                clearInterval(currentCall.transcriptionInterval);
              }
              
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

  const openNotePopup = (note) => {
    setSelectedNote(note);
    setEditTitle(note.title || '');
    setEditDate(note.date || '');
    setEditTime(note.time || '');
    setIsEditing(false);
  };

  const closeNotePopup = () => {
    setSelectedNote(null);
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (selectedNote) {
      const updatedNotes = callNotes.map(note => 
        note.id === selectedNote.id 
          ? { 
              ...note, 
              title: editTitle,
              date: editDate,
              time: editTime,
              updatedAt: new Date().toISOString()
            }
          : note
      );
      setCallNotes(updatedNotes);
      saveCallNotes(updatedNotes);
      setSelectedNote({ ...selectedNote, title: editTitle, date: editDate, time: editTime });
      setIsEditing(false);
    }
  };

  const cancelEdit = () => {
    setEditTitle(selectedNote?.title || '');
    setEditDate(selectedNote?.date || '');
    setEditTime(selectedNote?.time || '');
    setIsEditing(false);
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
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Recent Notes</Text>
        {callNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No call notes yet</Text>
            <Text style={styles.emptySubtext}>Start recording a call or add a manual note</Text>
          </View>
        ) : (
          callNotes.map((note) => (
            <TouchableOpacity key={note.id} style={styles.noteCard} onPress={() => openNotePopup(note)}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteTitle}>{note.title}</Text>
                <TouchableOpacity onPress={(e) => {
                  e.stopPropagation();
                  deleteNote(note.id);
                }}>
                  <Text style={styles.deleteButton}>×</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.noteDate}>{formatDate(note.createdAt || note.startTime)}</Text>
              {note.transcription && (
                <View style={styles.transcriptionSection}>
                  <Text style={styles.transcriptionLabel}>Transcription:</Text>
                  <Text style={styles.transcriptionText} numberOfLines={2}>{note.transcription}</Text>
                </View>
              )}
              {note.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText} numberOfLines={2}>{note.notes}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
      </ScrollView>

      {/* Note Details Popup */}
      {selectedNote && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>Call Note Details</Text>
              <TouchableOpacity onPress={closeNotePopup}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.popupContent}>
              {/* Editable Fields */}
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Title:</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Enter call title"
                  />
                ) : (
                  <Text style={styles.editDisplay}>{selectedNote.title}</Text>
                )}
              </View>
              
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Date:</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editDate}
                    onChangeText={setEditDate}
                    placeholder="YYYY-MM-DD"
                  />
                ) : (
                  <Text style={styles.editDisplay}>{selectedNote.date}</Text>
                )}
              </View>
              
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Time:</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editTime}
                    onChangeText={setEditTime}
                    placeholder="HH:MM"
                  />
                ) : (
                  <Text style={styles.editDisplay}>{selectedNote.time}</Text>
                )}
              </View>
              
              {/* Full Transcription */}
              {selectedNote.transcription && (
                <View style={styles.transcriptionSection}>
                  <Text style={styles.transcriptionLabel}>Full Transcription:</Text>
                  <Text style={styles.fullTranscriptionText}>{selectedNote.transcription}</Text>
                </View>
              )}
              
              {/* Notes */}
              {selectedNote.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.fullNotesText}>{selectedNote.notes}</Text>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.popupActions}>
              {isEditing ? (
                <>
                  <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.editButton} onPress={startEditing}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
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
  notesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popupContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  popupContent: {
    maxHeight: 400,
    padding: 20,
  },
  editSection: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  editDisplay: {
    fontSize: 16,
    color: colors.text,
    paddingVertical: 8,
  },
  fullTranscriptionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  fullNotesText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  popupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
