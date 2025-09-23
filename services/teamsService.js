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

class TeamsService {
  constructor() {
    this.clientId = 'your-teams-app-client-id'; // Replace with your Teams app client ID
    this.tenantId = 'your-tenant-id'; // Replace with your organization's tenant ID
    this.scope = 'https://graph.microsoft.com/.default';
    this.accessToken = null;
  }

  async initialize() {
    try {
      // Try to get stored access token
      const storedToken = await AsyncStorage.getItem('teams_access_token');
      if (storedToken) {
        this.accessToken = storedToken;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing Teams service:', error);
      return false;
    }
  }

  async authenticate() {
    try {
      // This would typically use Microsoft Authentication Library (MSAL)
      // For now, we'll simulate the authentication flow
      
      // In a real implementation, you'd use MSAL to get the access token
      // const authResult = await msalInstance.acquireTokenSilent({
      //   scopes: [this.scope],
      //   account: msalInstance.getActiveAccount()
      // });
      
      // For demo purposes, we'll simulate a successful auth
      const mockToken = 'mock-access-token-' + Date.now();
      this.accessToken = mockToken;
      await AsyncStorage.setItem('teams_access_token', mockToken);
      
      return true;
    } catch (error) {
      console.error('Teams authentication error:', error);
      return false;
    }
  }

  async getTeamsMeetings() {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Teams');
    }

    try {
      // In a real implementation, you'd call Microsoft Graph API
      // const response = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
      //   headers: {
      //     'Authorization': `Bearer ${this.accessToken}`,
      //     'Content-Type': 'application/json'
      //   }
      // });

      // For demo purposes, return mock data
      return [
        {
          id: 'meeting-1',
          subject: 'Credit Market Discussion',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          participants: ['John Smith', 'Sarah Johnson', 'Mike Chen'],
          hasTranscription: true,
          transcriptionUrl: 'https://graph.microsoft.com/v1.0/me/onlineMeetings/meeting-1/transcripts/transcript-1'
        },
        {
          id: 'meeting-2',
          subject: 'Investment Committee Review',
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          endTime: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), // 23 hours ago
          participants: ['Hope Gilbert', 'David Wilson', 'Lisa Brown'],
          hasTranscription: true,
          transcriptionUrl: 'https://graph.microsoft.com/v1.0/me/onlineMeetings/meeting-2/transcripts/transcript-2'
        }
      ];
    } catch (error) {
      console.error('Error fetching Teams meetings:', error);
      throw error;
    }
  }

  async getMeetingTranscription(meetingId) {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Teams');
    }

    try {
      // In a real implementation, you'd call Microsoft Graph API
      // const response = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}/transcripts`, {
      //   headers: {
      //     'Authorization': `Bearer ${this.accessToken}`,
      //     'Content-Type': 'application/json'
      //   }
      // });

      // For demo purposes, return mock transcription data
      const mockTranscriptions = {
        'meeting-1': {
          id: 'transcript-1',
          content: `John Smith: Good morning everyone, let's discuss the current credit market conditions.

Sarah Johnson: The spreads have been widening over the past week, particularly in high-yield bonds. We're seeing increased volatility in the CLO market.

Mike Chen: I agree. The recent Fed comments about potential rate hikes have created some uncertainty. We should be cautious about new positions in distressed credit.

John Smith: What about our existing portfolio? Are we seeing any stress in our current holdings?

Sarah Johnson: So far, our portfolio is holding up well. The credit quality remains strong, but we're monitoring closely.

Mike Chen: I recommend we review our risk limits and consider reducing exposure to the most volatile sectors.

John Smith: That sounds prudent. Let's schedule a follow-up meeting next week to reassess.`,
          participants: ['John Smith', 'Sarah Johnson', 'Mike Chen'],
          duration: '45 minutes',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        'meeting-2': {
          id: 'transcript-2',
          content: `Hope Gilbert: Welcome to our investment committee review. Let's start with the quarterly performance.

David Wilson: Our credit fund has outperformed benchmarks by 2.3% this quarter. The direct lending strategy has been particularly successful.

Lisa Brown: The CLO investments are performing well, but we're seeing some pressure in the energy sector. Should we consider reducing exposure?

Hope Gilbert: That's a good point. The energy sector has been volatile. David, what's your view on the current energy credit market?

David Wilson: We're seeing some stress in oil and gas companies, but our positions are in higher-quality names. I think we can maintain our current allocation.

Lisa Brown: I'd like to propose increasing our allocation to healthcare and technology credits. These sectors have been more stable.

Hope Gilbert: That makes sense. Let's review the specific opportunities in those sectors for next month's meeting.`,
          participants: ['Hope Gilbert', 'David Wilson', 'Lisa Brown'],
          duration: '60 minutes',
          createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
        }
      };

      return mockTranscriptions[meetingId] || null;
    } catch (error) {
      console.error('Error fetching meeting transcription:', error);
      throw error;
    }
  }

  async importTranscriptionToCallNotes(meetingId) {
    try {
      const transcription = await this.getMeetingTranscription(meetingId);
      if (!transcription) {
        throw new Error('No transcription available for this meeting');
      }

      // Convert Teams transcription to call note format
      const callNote = {
        id: `teams-${meetingId}-${Date.now()}`,
        title: `Teams Meeting - ${transcription.participants.join(', ')}`,
        transcription: transcription.content,
        notes: `Imported from Microsoft Teams\nDuration: ${transcription.duration}\nParticipants: ${transcription.participants.join(', ')}`,
        createdAt: transcription.createdAt,
        type: 'teams-import',
        source: 'Microsoft Teams',
        meetingId: meetingId
      };

      // Save to call notes
      const existingNotes = await AsyncStorage.getItem('mawney_call_notes');
      const notes = existingNotes ? JSON.parse(existingNotes) : [];
      notes.unshift(callNote);
      await AsyncStorage.setItem('mawney_call_notes', JSON.stringify(notes));

      return callNote;
    } catch (error) {
      console.error('Error importing transcription:', error);
      throw error;
    }
  }

  isAuthenticated() {
    return this.accessToken !== null;
  }

  async logout() {
    try {
      this.accessToken = null;
      await AsyncStorage.removeItem('teams_access_token');
      return true;
    } catch (error) {
      console.error('Error logging out of Teams:', error);
      return false;
    }
  }
}

export default new TeamsService();

